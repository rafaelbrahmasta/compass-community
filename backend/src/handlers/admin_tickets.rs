use axum::{
    extract::{Path, Query, State},
    response::Response,
    http::header,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::TicketPurchase;

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
    pub qr_payload: String,
    pub notes: Option<String>,
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
    let search = params.q.map(|s| format!("%{}%", s.trim()));

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM ticket_purchases tp
           JOIN members m ON m.id = tp.member_id
           WHERE ($1::uuid IS NULL OR tp.match_id = $1)
             AND ($2::text IS NULL OR tp.status = $2)
             AND ($3::text IS NULL OR (
                 tp.ticket_code ILIKE $3 OR
                 m.member_code ILIKE $3 OR
                 m.full_name ILIKE $3 OR
                 m.phone ILIKE $3
             ))"#
    )
    .bind(params.match_id)
    .bind(&params.status)
    .bind(&search)
    .fetch_one(&pool)
    .await?;

    let items = sqlx::query_as::<_, AdminTicketItem>(
        r#"SELECT tp.id, tp.ticket_code, tp.status, tp.price, tp.qr_payload, tp.notes,
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
                 tp.ticket_code ILIKE $3 OR
                 m.member_code ILIKE $3 OR
                 m.full_name ILIKE $3 OR
                 m.phone ILIKE $3
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
    State((pool, _config)): State<(PgPool, Config)>,
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

    // Logika penyesuaian kuota jika beralih ke/dari status dibatalkan
    if ticket.status != "dibatalkan" && body.status == "dibatalkan" {
        // Kembalikan kuota
        sqlx::query(
            "UPDATE ticket_categories SET sold = GREATEST(0, sold - 1) WHERE id = $1"
        )
        .bind(ticket.category_id)
        .execute(&mut *tx)
        .await?;
    } else if ticket.status == "dibatalkan" && body.status != "dibatalkan" {
        // Ambil kuota lagi
        sqlx::query(
            "UPDATE ticket_categories SET sold = sold + 1 WHERE id = $1"
        )
        .bind(ticket.category_id)
        .execute(&mut *tx)
        .await?;
    }

    let paid_at = if body.status == "lunas" && ticket.paid_at.is_none() {
        Some(Utc::now())
    } else if body.status == "menunggu_pembayaran" {
        None
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

    Ok(ok("Status tiket berhasil diperbarui", updated))
}

#[derive(Deserialize)]
pub struct CheckinTicketRequest {
    pub code_or_payload: String,
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
        r#"SELECT tp.id, tp.ticket_code, tp.status, tp.price, tp.qr_payload, tp.notes,
                  tp.created_at, tp.paid_at, tp.checked_in_at, tp.expires_at,
                  m.id AS member_id, m.member_code, m.full_name, m.phone, m.email,
                  mt.id AS match_id, mt.opponent_name, mt.match_date, mt.match_time, mt.stadium,
                  tc.id AS category_id, tc.name AS category_name
           FROM ticket_purchases tp
           JOIN members m ON m.id = tp.member_id
           JOIN matches mt ON mt.id = tp.match_id
           JOIN ticket_categories tc ON tc.id = tp.category_id
           WHERE tp.ticket_code = $1 OR tp.qr_payload = $2
           FOR UPDATE"#
    )
    .bind(ticket_code)
    .bind(input)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Tiket tidak ditemukan. Pastikan QR atau kode benar.".into()))?;

    if ticket.status == "sudah_checkin" {
        return Err(AppError::BadRequest(format!(
            "Tiket sudah digunakan sebelumnya (Check-in pada: {}).",
            ticket.checked_in_at.map(|t| t.format("%d-%m-%Y %H:%M:%S WIB").to_string()).unwrap_or_default()
        )));
    }

    if ticket.status == "dibatalkan" {
        return Err(AppError::BadRequest("Tiket ini telah dibatalkan / kedaluwarsa.".into()));
    }

    if ticket.status != "lunas" {
        return Err(AppError::BadRequest(format!(
            "Tiket belum lunas (status saat ini: '{}'). Pembayaran harus dikonfirmasi terlebih dahulu.",
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
        r#"SELECT tp.id, tp.ticket_code, tp.status, tp.price, tp.qr_payload, tp.notes,
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
        "Status",
        "Waktu Pemesanan",
        "Waktu Pembayaran",
        "Waktu Check-in",
    ]).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menulis header CSV: {}", e)))?;

    for item in items {
        wtr.write_record(&[
            item.ticket_code,
            item.member_code,
            item.full_name,
            item.phone,
            format!("PSS Sleman vs {}", item.opponent_name),
            item.category_name,
            item.price.to_string(),
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
