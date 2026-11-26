use axum::{
    extract::{Path, Query, State},
    response::Response,
    http::header,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::{TicketPurchase, TicketBankSettings};
use crate::utils::email::send_email_async;
use crate::utils::{sanitize_csv_field, escape_like_pattern};

#[derive(Deserialize)]
pub struct AdminTicketsQuery {
    pub match_id: Option<Uuid>,
    pub status: Option<String>,
    pub q: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct AdminTicketItem {
    pub id: Uuid,
    pub ticket_code: String,
    pub status: String,
    pub price: rust_decimal::Decimal,
    pub unique_code: i32,
    pub total_price: rust_decimal::Decimal,
    pub qr_payload: String,
    pub notes: Option<String>,
    pub payment_proof_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
    pub checked_in_at: Option<DateTime<Utc>>,
    pub expires_at: DateTime<Utc>,
    // Member Info
    pub member_id: Uuid,
    pub member_code: String,
    pub full_name: String,
    pub phone: String,
    pub email: Option<String>,
    // Match Info
    pub match_id: Uuid,
    pub opponent_name: String,
    pub match_date: chrono::NaiveDate,
    pub match_time: chrono::NaiveTime,
    pub stadium: String,
    // Category Info
    pub category_id: Uuid,
    pub category_name: String,
}

pub async fn admin_list_tickets(
    State((pool, _config)): State<(PgPool, Config)>,
    Query(params): Query<AdminTicketsQuery>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(15).max(1).min(100);
    let offset = (page - 1) * per_page;
    let search = params.q.map(|s| format!("%{}%", escape_like_pattern(s.trim())));

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM ticket_purchases tp
           JOIN members m ON m.id = tp.member_id
           WHERE ($1::uuid IS NULL OR tp.match_id = $1)
             AND ($2::text IS NULL OR tp.status = $2)
             AND ($3::text IS NULL OR (
                 tp.ticket_code ILIKE $3 ESCAPE '\' OR
                 m.member_code ILIKE $3 ESCAPE '\' OR
                 m.full_name ILIKE $3 ESCAPE '\' OR
                 m.phone ILIKE $3 ESCAPE '\'
             ))"#
    )
    .bind(params.match_id)
    .bind(&params.status)
    .bind(&search)
    .fetch_one(&pool)
    .await?;

    let items = sqlx::query_as::<_, AdminTicketItem>(
        r#"SELECT tp.id, tp.ticket_code, tp.status, tp.price, tp.unique_code, tp.total_price,
                  tp.qr_payload, tp.notes, tp.payment_proof_url,
                  tp.created_at, tp.paid_at, tp.checked_in_at, tp.expires_at,
                  m.id AS member_id, m.member_code, m.full_name, m.phone, m.email,
                  mt.id AS match_id, mt.opponent_name, mt.match_date, mt.match_time, mt.stadium,
                  tc.id AS category_id, tc.name AS category_name
           FROM ticket_purchases tp
           JOIN members m ON m.id = tp.member_id
           JOIN matches mt ON mt.id = tp.match_id
           JOIN ticket_categories tc ON tc.id = tp.category_id
           WHERE ($1::uuid IS NULL OR tp.match_id = $1)
             AND ($2::text IS NULL OR tp.status = $2)
             AND ($3::text IS NULL OR (
                 tp.ticket_code ILIKE $3 ESCAPE '\' OR
                 m.member_code ILIKE $3 ESCAPE '\' OR
                 m.full_name ILIKE $3 ESCAPE '\' OR
                 m.phone ILIKE $3 ESCAPE '\'
             ))
           ORDER BY tp.created_at DESC
           LIMIT $4 OFFSET $5"#
    )
    .bind(params.match_id)
    .bind(&params.status)
    .bind(&search)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&pool)
    .await?;

    Ok(ok("Daftar pesanan tiket", serde_json::json!({
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total as f64 / per_page as f64).ceil() as i64
    })))
}

#[derive(Deserialize)]
pub struct UpdateTicketStatusRequest {
    pub status: String, // menunggu_pembayaran, lunas, dibatalkan, sudah_checkin
    pub notes: Option<String>,
}

pub async fn admin_update_ticket_status(
    State((pool, config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTicketStatusRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let valid_statuses = ["menunggu_pembayaran", "lunas", "dibatalkan", "sudah_checkin"];
    if !valid_statuses.contains(&body.status.as_str()) {
        return Err(AppError::BadRequest("Status tiket tidak valid".into()));
    }

    let mut tx = pool.begin().await?;

    let ticket = sqlx::query_as::<_, TicketPurchase>(
        "SELECT * FROM ticket_purchases WHERE id = $1 FOR UPDATE"
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Tiket tidak ditemukan".into()))?;

    // State machine ketat untuk transisi status tiket
    match ticket.status.as_str() {
        "sudah_checkin" => {
            return Err(AppError::BadRequest(
                "Tiket yang sudah check-in berstatus final dan tidak dapat diubah kembali demi integritas akses pintu masuk.".into()
            ));
        }
        "dibatalkan" => {
            return Err(AppError::BadRequest(
                "Tiket yang sudah dibatalkan tidak dapat diaktifkan kembali demi mencegah penjualan ganda/oversell. Silakan lakukan pemesanan baru.".into()
            ));
        }
        "menunggu_pembayaran" => {
            if body.status != "lunas" && body.status != "dibatalkan" {
                return Err(AppError::BadRequest(
                    "Dari status 'menunggu_pembayaran', tiket hanya dapat diubah ke 'lunas' atau 'dibatalkan'.".into()
                ));
            }
        }
        "lunas" => {
            if body.status != "sudah_checkin" && body.status != "dibatalkan" {
                return Err(AppError::BadRequest(
                    "Dari status 'lunas', tiket hanya dapat diubah ke 'sudah_checkin' atau 'dibatalkan'.".into()
                ));
            }
        }
        _ => {}
    }

    // Jika dibatalkan dari status aktif (menunggu_pembayaran atau lunas), kembalikan kuota
    if ticket.status != "dibatalkan" && body.status == "dibatalkan" {
        sqlx::query(
            "UPDATE ticket_categories SET sold = GREATEST(0, sold - 1) WHERE id = $1"
        )
        .bind(ticket.category_id)
        .execute(&mut *tx)
        .await?;
    }

    let paid_at = if body.status == "lunas" && ticket.paid_at.is_none() {
        Some(Utc::now())
    } else {
        ticket.paid_at
    };

    let checked_in_at = if body.status == "sudah_checkin" && ticket.checked_in_at.is_none() {
        Some(Utc::now())
    } else {
        ticket.checked_in_at
    };

    let updated = sqlx::query_as::<_, TicketPurchase>(
        r#"UPDATE ticket_purchases
           SET status = $1, notes = COALESCE($2, notes), paid_at = $3, checked_in_at = $4
           WHERE id = $5
           RETURNING *"#
    )
    .bind(&body.status)
    .bind(&body.notes)
    .bind(paid_at)
    .bind(checked_in_at)
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    // Jika status diubah menjadi lunas, kirim notifikasi e-tiket kepada pembeli via email jika ada
    if body.status == "lunas" && ticket.status != "lunas" {
        let member_email: Option<String> = sqlx::query_scalar(
            "SELECT email FROM members WHERE id = $1"
        )
        .bind(ticket.member_id)
        .fetch_optional(&pool)
        .await
        .unwrap_or(None);

        if let Some(to_email) = member_email {
            if !to_email.trim().is_empty() {
                let subject = format!("🎟️ Konfirmasi Pembayaran: Tiket {} Telah Lunas", ticket.ticket_code);
                let body_msg = format!(
                    "Halo!\n\nPembayaran tiket Anda dengan Kode: {}\ntelah berhasil diverifikasi dan berstatus LUNAS.\n\n\
                     Kode QR E-Tiket Anda: {}\n\n\
                     Harap simpan kode tiket ini untuk verifikasi scan di gerbang stadion.\n\n\
                     Salam Super Elja! 💚\nCOMPASS",
                    ticket.ticket_code, ticket.qr_payload
                );
                send_email_async(config, to_email, subject, body_msg);
            }
        }
    }

    Ok(ok("Status tiket berhasil diperbarui", updated))
}

#[derive(Deserialize)]
pub struct CheckinTicketRequest {
    pub code_or_payload: String,
    pub match_id: Option<Uuid>,
}

pub async fn admin_checkin_ticket(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<CheckinTicketRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let input = body.code_or_payload.trim();
    if input.is_empty() {
        return Err(AppError::BadRequest("Kode tiket atau scan QR tidak boleh kosong".into()));
    }

    // Ambil kode tiket dari QR payload (format: COMPASS|TCK-...|... atau langsung TCK-...)
    let ticket_code = if input.contains('|') {
        let parts: Vec<&str> = input.split('|').collect();
        if parts.len() >= 2 {
            parts[1]
        } else {
            input
        }
    } else {
        input
    };

    let mut tx = pool.begin().await?;

    let ticket = sqlx::query_as::<_, AdminTicketItem>(
        r#"SELECT tp.id, tp.ticket_code, tp.status, tp.price, tp.unique_code, tp.total_price,
                  tp.qr_payload, tp.notes, tp.payment_proof_url,
                  tp.created_at, tp.paid_at, tp.checked_in_at, tp.expires_at,
                  m.id AS member_id, m.member_code, m.full_name, m.phone, m.email,
                  mt.id AS match_id, mt.opponent_name, mt.match_date, mt.match_time, mt.stadium,
                  tc.id AS category_id, tc.name AS category_name
           FROM ticket_purchases tp
           JOIN members m ON m.id = tp.member_id
           JOIN matches mt ON mt.id = tp.match_id
           JOIN ticket_categories tc ON tc.id = tp.category_id
           WHERE tp.ticket_code = $1 OR tp.qr_payload = $2
           FOR UPDATE OF tp"#
    )
    .bind(ticket_code)
    .bind(input)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Tiket tidak ditemukan. Pastikan QR atau kode benar.".into()))?;

    // Validasi 1: Kesesuaian Laga jika scanner menyertakan match_id
    if let Some(expected_match_id) = body.match_id {
        if ticket.match_id != expected_match_id {
            return Err(AppError::BadRequest(format!(
                "Tiket tidak valid untuk pertandingan ini! Tiket ini terdaftar untuk laga: PSS Sleman vs {}.",
                ticket.opponent_name
            )));
        }
    }

    // Validasi 2: Kesesuaian Waktu Laga - hanya boleh check-in pada hari pertandingan
    let today_jakarta = (Utc::now() + Duration::hours(7)).date_naive();
    if ticket.match_date < today_jakarta {
        return Err(AppError::BadRequest(format!(
            "Pertandingan telah berakhir pada tanggal {}. Tiket ini sudah kedaluwarsa dan tidak dapat digunakan.",
            ticket.match_date.format("%d-%m-%Y")
        )));
    }
    if ticket.match_date > today_jakarta {
        return Err(AppError::BadRequest(format!(
            "Laga belum dimulai. Pertandingan dijadwalkan pada tanggal {}. Check-in hanya bisa dilakukan pada hari pertandingan.",
            ticket.match_date.format("%d-%m-%Y")
        )));
    }

    // Validasi 3: Status Tiket
    if ticket.status == "sudah_checkin" {
        return Err(AppError::BadRequest(format!(
            "Tiket sudah pernah digunakan sebelumnya (Waktu check-in: {} WIB).",
            ticket.checked_in_at.map(|t| (t + Duration::hours(7)).format("%d-%m-%Y %H:%M:%S").to_string()).unwrap_or_default()
        )));
    }

    if ticket.status == "dibatalkan" {
        return Err(AppError::BadRequest("Tiket ini telah dibatalkan / kedaluwarsa.".into()));
    }

    if ticket.status != "lunas" {
        return Err(AppError::BadRequest(format!(
            "Tiket belum lunas (status: '{}'). Hanya tiket berstatus 'lunas' yang dapat melakukan check-in.",
            ticket.status
        )));
    }

    // Check-in tiket
    sqlx::query(
        "UPDATE ticket_purchases SET status = 'sudah_checkin', checked_in_at = NOW() WHERE id = $1"
    )
    .bind(ticket.id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(ok("Check-in berhasil! Tiket valid.", serde_json::json!({
        "ticket_code": ticket.ticket_code,
        "full_name": ticket.full_name,
        "member_code": ticket.member_code,
        "opponent_name": ticket.opponent_name,
        "category_name": ticket.category_name,
        "stadium": ticket.stadium,
        "match_date": ticket.match_date,
        "checked_in_at": Utc::now(),
    })))
}

pub async fn admin_export_tickets_csv(
    State((pool, _config)): State<(PgPool, Config)>,
    Query(params): Query<AdminTicketsQuery>,
) -> Result<Response, AppError> {
    let items = sqlx::query_as::<_, AdminTicketItem>(
        r#"SELECT tp.id, tp.ticket_code, tp.status, tp.price, tp.unique_code, tp.total_price,
                  tp.qr_payload, tp.notes, tp.payment_proof_url,
                  tp.created_at, tp.paid_at, tp.checked_in_at, tp.expires_at,
                  m.id AS member_id, m.member_code, m.full_name, m.phone, m.email,
                  mt.id AS match_id, mt.opponent_name, mt.match_date, mt.match_time, mt.stadium,
                  tc.id AS category_id, tc.name AS category_name
           FROM ticket_purchases tp
           JOIN members m ON m.id = tp.member_id
           JOIN matches mt ON mt.id = tp.match_id
           JOIN ticket_categories tc ON tc.id = tp.category_id
           WHERE ($1::uuid IS NULL OR tp.match_id = $1)
             AND ($2::text IS NULL OR tp.status = $2)
           ORDER BY tp.created_at DESC"#
    )
    .bind(params.match_id)
    .bind(&params.status)
    .fetch_all(&pool)
    .await?;

    let mut wtr = csv::Writer::from_writer(vec![]);
    wtr.write_record(&[
        "Kode Tiket",
        "Kode Anggota",
        "Nama Lengkap",
        "Nomor HP",
        "Pertandingan",
        "Kategori",
        "Harga",
        "Kode Unik",
        "Total Pembayaran",
        "Status",
        "Waktu Pemesanan",
        "Waktu Pembayaran",
        "Waktu Check-in",
    ]).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menulis header CSV: {}", e)))?;

    for item in items {
        wtr.write_record(&[
            sanitize_csv_field(&item.ticket_code),
            sanitize_csv_field(&item.member_code),
            sanitize_csv_field(&item.full_name),
            item.phone.clone(), // Bug 15: nomor HP tidak di-sanitasi agar format + tidak rusak
            sanitize_csv_field(&format!("PSS Sleman vs {}", item.opponent_name)),
            sanitize_csv_field(&item.category_name),
            item.price.to_string(),
            item.unique_code.to_string(),
            item.total_price.to_string(),
            item.status,
            item.created_at.format("%Y-%m-%d %H:%M:%S").to_string(),
            item.paid_at.map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string()).unwrap_or_default(),
            item.checked_in_at.map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string()).unwrap_or_default(),
        ]).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menulis item CSV: {}", e)))?;
    }

    let csv_data = wtr.into_inner()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal finalize CSV: {}", e)))?;

    let response = Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(header::CONTENT_DISPOSITION, "attachment; filename=\"data-pesanan-tiket-compass.csv\"")
        .body(axum::body::Body::from(csv_data))
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal response CSV: {}", e)))?;

    Ok(response)
}

/// Bug 4: Endpoint admin terautentikasi untuk mengambil file bukti transfer secara aman
pub async fn admin_get_ticket_proof(
    State((pool, config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let ticket = sqlx::query_as::<_, TicketPurchase>(
        "SELECT * FROM ticket_purchases WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Tiket tidak ditemukan".into()))?;

    let proof_url = ticket.payment_proof_url
        .ok_or_else(|| AppError::NotFound("Bukti transfer belum diunggah untuk tiket ini".into()))?;

    // Jika menggunakan Supabase Storage, redirect ke signed URL
    if proof_url.starts_with("supabase-private://") {
        if config.supabase_url.is_empty() || config.supabase_service_key.is_empty() {
            return Err(AppError::Internal(anyhow::anyhow!("Supabase tidak dikonfigurasi")));
        }
        let signed = crate::utils::storage::storage_create_signed_url(
            &config.supabase_url,
            &config.supabase_service_key,
            &proof_url,
            3600, // 1 jam
        ).await?;
        // Redirect ke signed URL
        let resp = Response::builder()
            .status(axum::http::StatusCode::FOUND)
            .header(axum::http::header::LOCATION, &signed)
            .body(axum::body::Body::empty())
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Redirect error: {}", e)))?;
        return Ok(resp);
    }

    let clean = proof_url.trim_start_matches('/');
    // Cek di folder privat dulu
    let priv_file = format!("{}_private/{}", config.upload_dir, clean.trim_start_matches("uploads_private/"));
    let final_path = if tokio::fs::try_exists(&priv_file).await.unwrap_or(false) {
        std::path::PathBuf::from(priv_file)
    } else {
        // Fallback cek di folder upload biasa
        let pub_file = format!("{}/{}", config.upload_dir, clean.trim_start_matches("uploads/"));
        std::path::PathBuf::from(pub_file)
    };

    if !tokio::fs::try_exists(&final_path).await.unwrap_or(false) {
        return Err(AppError::NotFound("File bukti transfer tidak ditemukan di server".into()));
    }

    let bytes = tokio::fs::read(&final_path).await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal membaca file bukti: {}", e)))?;

    let ext = final_path.extension().and_then(|s| s.to_str()).unwrap_or("jpg");
    let content_type = match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "webp" => "image/webp",
        _ => "image/jpeg",
    };

    let response = Response::builder()
        .header(axum::http::header::CONTENT_TYPE, content_type)
        .header(axum::http::header::CACHE_CONTROL, "private, no-cache, no-store, must-revalidate")
        .body(axum::body::Body::from(bytes))
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal membuat response bukti: {}", e)))?;

    Ok(response)
}

// ===== PENGATURAN REKENING TIKET (KHUSUS SUPER ADMIN) =====
#[derive(Deserialize)]
pub struct UpdateTicketBankSettingsRequest {
    pub bank_name: String,
    pub account_name: String,
    pub account_number: String,
    pub qr_image_url: Option<String>,
    pub instructions: Option<String>,
}

pub async fn admin_get_ticket_bank_settings(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let settings = sqlx::query_as::<_, TicketBankSettings>(
        "SELECT * FROM ticket_bank_settings LIMIT 1"
    )
    .fetch_optional(&pool)
    .await?
    .unwrap_or(TicketBankSettings {
        id: Uuid::nil(),
        bank_name: "Bank BCA".into(),
        account_name: "COMPASS TIKET RESMI".into(),
        account_number: "9876543210".into(),
        qr_image_url: None,
        instructions: Some("Silakan transfer tepat sesuai total nominal termasuk 3 digit kode unik.".into()),
        updated_at: Utc::now(),
    });

    Ok(ok("Pengaturan rekening tiket", settings))
}

pub async fn admin_update_ticket_bank_settings(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<UpdateTicketBankSettingsRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let updated = sqlx::query_as::<_, TicketBankSettings>(
        r#"UPDATE ticket_bank_settings
           SET bank_name = $1, account_name = $2, account_number = $3,
               qr_image_url = $4, instructions = $5, updated_at = NOW()
           WHERE id = (SELECT id FROM ticket_bank_settings LIMIT 1)
           RETURNING *"#
    )
    .bind(&body.bank_name)
    .bind(&body.account_name)
    .bind(&body.account_number)
    .bind(&body.qr_image_url)
    .bind(&body.instructions)
    .fetch_optional(&pool)
    .await?;

    let res = match updated {
        Some(s) => s,
        None => {
            sqlx::query_as::<_, TicketBankSettings>(
                r#"INSERT INTO ticket_bank_settings
                   (bank_name, account_name, account_number, qr_image_url, instructions)
                   VALUES ($1, $2, $3, $4, $5)
                   RETURNING *"#
            )
            .bind(&body.bank_name)
            .bind(&body.account_name)
            .bind(&body.account_number)
            .bind(&body.qr_image_url)
            .bind(&body.instructions)
            .fetch_one(&pool)
            .await?
        }
    };

    Ok(ok("Pengaturan rekening tiket berhasil diperbarui", res))
}
