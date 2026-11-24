use axum::{
    extract::{ConnectInfo, Multipart, Query, State},
    Json,
    http::HeaderMap,
};
use std::net::SocketAddr;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Duration, Utc};
use rand::Rng;
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::{Member, TicketBankSettings, TicketCategory, TicketPurchase};
use crate::utils::{limiter, extract_ip, save_upload};
use crate::utils::email::send_email_async;

#[derive(Deserialize)]
pub struct BuyTicketRequest {
    pub match_id: Uuid,
    pub category_id: Uuid,
    pub member_code: String,
    pub phone: String,
    pub pin: Option<String>,
    pub notes: Option<String>,
}

#[derive(Serialize)]
pub struct BuyTicketResponse {
    pub ticket_code: String,
    pub qr_payload: String,
    pub status: String,
    pub price: rust_decimal::Decimal,
    pub unique_code: i32,
    pub total_price: rust_decimal::Decimal,
    pub expires_at: DateTime<Utc>,
    pub member: MemberInfo,
    pub match_info: MatchBrief,
    pub category_name: String,
    pub bank_info: BankInfo,
    pub instructions: Option<String>,
}

#[derive(Serialize)]
pub struct MemberInfo {
    pub member_code: String,
    pub full_name: String,
    pub phone: String,
}

#[derive(Serialize)]
pub struct MatchBrief {
    pub opponent_name: String,
    pub match_date: chrono::NaiveDate,
    pub match_time: chrono::NaiveTime,
    pub stadium: String,
    pub home_away: String,
}

#[derive(Serialize)]
pub struct BankInfo {
    pub bank_name: String,
    pub account_name: String,
    pub account_number: String,
    pub qr_image_url: Option<String>,
}

pub async fn buy_ticket(
    State((pool, config)): State<(PgPool, Config)>,
    ConnectInfo(conn_addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(body): Json<BuyTicketRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Rate limit per IP
    limiter().check(&extract_ip(&headers, Some(conn_addr)))?;

    let clean_code = body.member_code.trim().to_uppercase();
    let clean_phone = body.phone.trim().replace(" ", "").replace("-", "");

    if clean_code.is_empty() || clean_phone.is_empty() {
        return Err(AppError::BadRequest("Kode anggota dan nomor HP wajib diisi".into()));
    }

    // 1. Validasi Anggota
    let member = sqlx::query_as::<_, Member>(
        r#"SELECT * FROM members
           WHERE UPPER(member_code) = $1
           AND REPLACE(REPLACE(phone, '-', ''), ' ', '') = $2"#
    )
    .bind(&clean_code)
    .bind(&clean_phone)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::BadRequest(
        "Kamu belum terdaftar sebagai anggota atau nomor HP tidak cocok. Hubungi admin Compass.".into()
    ))?;

    if !member.is_active {
        return Err(AppError::Forbidden(
            "Akun anggota Anda sedang dinonaktifkan. Hubungi admin Compass.".into()
        ));
    }

    // Validasi PIN Anggota untuk mencegah orang lain menghabiskan jatah tiket
    let pin_valid = match (&member.pin_hash, &body.pin) {
        (Some(hash), Some(input_pin)) => {
            if let Ok(parsed_hash) = PasswordHash::new(hash) {
                Argon2::default().verify_password(input_pin.as_bytes(), &parsed_hash).is_ok()
            } else {
                hash == input_pin
            }
        }
        (None, Some(input_pin)) => {
            // Fallback: 6 digit terakhir nomor HP atau 123456 jika belum set PIN
            let phone_suffix = if clean_phone.len() >= 6 {
                &clean_phone[clean_phone.len() - 6..]
            } else {
                "123456"
            };
            input_pin == phone_suffix || input_pin == "123456"
        }
        _ => false,
    };

    if !pin_valid {
        return Err(AppError::BadRequest(
            "PIN anggota tidak valid atau belum diisi. Gunakan 6 digit terakhir nomor HP Anda atau hubungi admin bila lupa PIN.".into()
        ));
    }

    // 2. Mulai transaksi dengan locking
    let mut tx = pool.begin().await?;

    // Auto-cancel tiket yang sudah kedaluwarsa untuk member dan laga ini
    let _ = sqlx::query(
        r#"WITH expired AS (
               UPDATE ticket_purchases
               SET status = 'dibatalkan',
                   notes = COALESCE(notes || ' | ', '') || 'Dibatalkan otomatis karena kedaluwarsa saat order baru'
               WHERE member_id = $1 AND match_id = $2 AND status = 'menunggu_pembayaran' AND expires_at <= NOW()
               RETURNING category_id
           )
           UPDATE ticket_categories tc
           SET sold = GREATEST(0, tc.sold - 1)
           FROM expired
           WHERE tc.id = expired.category_id"#
    )
    .bind(member.id)
    .bind(body.match_id)
    .execute(&mut *tx)
    .await;

    // Periksa apakah anggota sudah punya tiket yang aktif (menunggu_pembayaran / lunas / sudah_checkin)
    let existing_active = sqlx::query_as::<_, TicketPurchase>(
        r#"SELECT * FROM ticket_purchases
           WHERE member_id = $1 AND match_id = $2 AND status <> 'dibatalkan'
           FOR UPDATE"#
    )
    .bind(member.id)
    .bind(body.match_id)
    .fetch_optional(&mut *tx)
    .await?;

    if let Some(existing) = existing_active {
        let msg = match existing.status.as_str() {
            "menunggu_pembayaran" => format!(
                "Kamu sudah memiliki pesanan tiket untuk pertandingan ini yang sedang menunggu pembayaran (Kode: {}). Silakan lakukan pembayaran atau tunggu hingga kedaluwarsa.",
                existing.ticket_code
            ),
            "lunas" => format!(
                "Kamu sudah memiliki tiket lunas untuk pertandingan ini (Kode: {}). 1 anggota hanya berhak membeli 1 tiket.",
                existing.ticket_code
            ),
            "sudah_checkin" => "Kamu sudah menggunakan tiket untuk pertandingan ini.".into(),
            _ => "Kamu sudah memiliki tiket untuk pertandingan ini.".into(),
        };
        return Err(AppError::BadRequest(msg));
    }

    // 3. Validasi Kategori Tiket dan Kuota
    let category = sqlx::query_as::<_, TicketCategory>(
        "SELECT * FROM ticket_categories WHERE id = $1 AND match_id = $2 FOR UPDATE"
    )
    .bind(body.category_id)
    .bind(body.match_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Kategori tiket tidak ditemukan untuk pertandingan ini".into()))?;

    if !category.is_active {
        return Err(AppError::BadRequest("Kategori tiket ini sedang tidak aktif".into()));
    }

    if category.sold >= category.quota {
        return Err(AppError::BadRequest("Kuota tiket untuk kategori ini sudah habis".into()));
    }

    // 4. Validasi Pertandingan
    let match_data = sqlx::query_as::<_, crate::models::Match>(
        "SELECT * FROM matches WHERE id = $1 FOR UPDATE"
    )
    .bind(body.match_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Pertandingan tidak ditemukan".into()))?;

    // Validasi status pertandingan
    if match_data.status != "upcoming" && match_data.status != "live" {
        return Err(AppError::BadRequest(
            "Penjualan tiket untuk pertandingan ini belum dibuka atau sudah ditutup.".into(),
        ));
    }

    // Validasi jendela penjualan: hanya 4 hari ke depan (Asia/Jakarta = UTC+7)
    let today_jakarta = (Utc::now() + Duration::hours(7)).date_naive();
    let four_days_later = today_jakarta + Duration::days(4);
    if match_data.match_date < today_jakarta || match_data.match_date > four_days_later {
        return Err(AppError::BadRequest(
            "Tiket hanya dapat dibeli untuk pertandingan dalam jangka 4 hari ke depan.".into(),
        ));
    }

    // Generate unique ticket_code: TCK-YYYYMMDD-XXXX
    let today_str = Utc::now().format("%Y%m%d").to_string();
    let rand_str: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(4)
        .map(char::from)
        .collect::<String>()
        .to_uppercase();
    let ticket_code = format!("TCK-{}-{}", today_str, rand_str);

    // QR Payload yang unik dan terenkode
    let qr_payload = format!("COMPASS|{}|{}|{}", ticket_code, member.member_code, match_data.id);

    // Generate 3 digit kode unik (100 - 999) untuk nominal transfer
    let unique_code = rand::thread_rng().gen_range(100..=999);
    let total_price = category.price + rust_decimal::Decimal::from(unique_code);

    // Update quota sold + 1
    sqlx::query(
        "UPDATE ticket_categories SET sold = sold + 1 WHERE id = $1"
    )
    .bind(category.id)
    .execute(&mut *tx)
    .await?;

    // Insert ticket purchase
    let purchase = sqlx::query_as::<_, TicketPurchase>(
        r#"INSERT INTO ticket_purchases
           (id, ticket_code, member_id, match_id, category_id, price, unique_code, total_price, status, qr_payload, notes, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'menunggu_pembayaran', $9, $10, NOW() + INTERVAL '24 hours')
           RETURNING *"#
    )
    .bind(Uuid::new_v4())
    .bind(&ticket_code)
    .bind(member.id)
    .bind(match_data.id)
    .bind(category.id)
    .bind(category.price)
    .bind(unique_code)
    .bind(total_price)
    .bind(&qr_payload)
    .bind(&body.notes)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    // Ambil info bank khusus tiket dari ticket_bank_settings (terpisah dari donasi kemanusiaan)
    let bank_setting = sqlx::query_as::<_, TicketBankSettings>(
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

    // Kirim notifikasi email rincian pemesanan tiket jika email member terdaftar
    if let Some(to_email) = &member.email {
        if !to_email.trim().is_empty() {
            let subject = format!("⚽ Tagihan Pemesanan Tiket: {}", purchase.ticket_code);
            let body_msg = format!(
                "Halo {}!\n\n\
                 Pesanan tiket pertandingan PSS Sleman vs {} telah berhasil dibuat.\n\n\
                 Detail Pembayaran:\n\
                 - Kode Tiket: {}\n\
                 - Kategori: {}\n\
                 - Harga Tiket: Rp {}\n\
                 - Kode Unik: {}\n\
                 - TOTAL PEMBAYARAN: Rp {}\n\n\
                 Rekening Pembayaran:\n\
                 - Bank: {}\n\
                 - Atas Nama: {}\n\
                 - No. Rekening: {}\n\n\
                 PENTING: Harap transfer tepat hingga 3 digit terakhir (Rp {}) sebelum batas waktu 24 jam.\n\
                 Unggah bukti transfer Anda melalui menu Cek Tiket di website.\n\n\
                 Salam Super Elja! 💚\nCOMPASS",
                member.full_name, match_data.opponent_name,
                purchase.ticket_code, category.name,
                category.price, unique_code, total_price,
                bank_setting.bank_name, bank_setting.account_name, bank_setting.account_number,
                total_price
            );
            send_email_async(config, to_email.clone(), subject, body_msg);
        }
    }

    Ok(ok("Pesanan tiket berhasil dibuat", BuyTicketResponse {
        ticket_code: purchase.ticket_code,
        qr_payload: purchase.qr_payload,
        status: purchase.status,
        price: purchase.price,
        unique_code,
        total_price,
        expires_at: purchase.expires_at,
        member: MemberInfo {
            member_code: member.member_code,
            full_name: member.full_name,
            phone: member.phone,
        },
        match_info: MatchBrief {
            opponent_name: match_data.opponent_name,
            match_date: match_data.match_date,
            match_time: match_data.match_time,
            stadium: match_data.stadium,
            home_away: match_data.home_away,
        },
        category_name: category.name,
        bank_info: BankInfo {
            bank_name: bank_setting.bank_name,
            account_name: bank_setting.account_name,
            account_number: bank_setting.account_number,
            qr_image_url: bank_setting.qr_image_url,
        },
        instructions: bank_setting.instructions,
    }))
}

#[derive(Deserialize)]
pub struct CheckTicketQuery {
    pub member_code: Option<String>,
    pub phone: Option<String>,
    pub ticket_code: Option<String>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct TicketDetailItem {
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
    pub member_code: String,
    pub full_name: String,
    pub phone: String,
    // Match Info
    pub opponent_name: String,
    pub opponent_logo_url: Option<String>,
    pub match_date: chrono::NaiveDate,
    pub match_time: chrono::NaiveTime,
    pub stadium: String,
    pub home_away: String,
    pub competition: String,
    // Category Info
    pub category_name: String,
}

pub async fn check_ticket(
    State((pool, _config)): State<(PgPool, Config)>,
    ConnectInfo(conn_addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Query(params): Query<CheckTicketQuery>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Rate limit per IP
    limiter().check(&extract_ip(&headers, Some(conn_addr)))?;

    let ticket_code = params.ticket_code.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let member_code = params.member_code.as_deref().map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty());
    let phone = params.phone.as_deref().map(|s| s.trim().replace(" ", "").replace("-", "")).filter(|s| !s.is_empty());

    if phone.is_none() {
        return Err(AppError::BadRequest(
            "Nomor WhatsApp/HP terdaftar wajib diisi untuk verifikasi keamanan".into()
        ));
    }

    if ticket_code.is_none() && member_code.is_none() {
        return Err(AppError::BadRequest(
            "Masukkan Kode Tiket (TCK-...) atau Kode Anggota".into()
        ));
    }

    let tickets = sqlx::query_as::<_, TicketDetailItem>(
        r#"SELECT tp.id, tp.ticket_code, tp.status, tp.price, tp.unique_code, tp.total_price,
                  tp.qr_payload, tp.notes, tp.payment_proof_url,
                  tp.created_at, tp.paid_at, tp.checked_in_at, tp.expires_at,
                  m.member_code, m.full_name, m.phone,
                  mt.opponent_name, mt.opponent_logo_url, mt.match_date, mt.match_time,
                  mt.stadium, mt.home_away, mt.competition,
                  tc.name AS category_name
           FROM ticket_purchases tp
           JOIN members m ON m.id = tp.member_id
           JOIN matches mt ON mt.id = tp.match_id
           JOIN ticket_categories tc ON tc.id = tp.category_id
           WHERE ($1::text IS NOT NULL AND tp.ticket_code = $1 AND REPLACE(REPLACE(m.phone, '-', ''), ' ', '') = $3)
              OR ($2::text IS NOT NULL AND $3::text IS NOT NULL
                  AND UPPER(m.member_code) = $2
                  AND REPLACE(REPLACE(m.phone, '-', ''), ' ', '') = $3)
           ORDER BY tp.created_at DESC"#
    )
    .bind(&ticket_code)
    .bind(&member_code)
    .bind(&phone)
    .fetch_all(&pool)
    .await?;

    if tickets.is_empty() {
        return Err(AppError::NotFound(
            "Tiket tidak ditemukan atau nomor HP tidak cocok. Periksa kembali data Anda.".into()
        ));
    }

    // Samarkan data sensitif anggota (nama dan nomor HP) untuk keamanan
    let masked_tickets: Vec<TicketDetailItem> = tickets.into_iter().map(|mut t| {
        t.full_name = mask_name(&t.full_name);
        t.phone = mask_phone(&t.phone);
        t
    }).collect();

    // Sertakan info rekening tiket agar pembeli yang belum transfer bisa melihat instruksi
    let bank_setting = sqlx::query_as::<_, TicketBankSettings>(
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

    Ok(ok("Data tiket ditemukan", serde_json::json!({
        "tickets": masked_tickets,
        "bank_info": {
            "bank_name": bank_setting.bank_name,
            "account_name": bank_setting.account_name,
            "account_number": bank_setting.account_number,
            "qr_image_url": bank_setting.qr_image_url,
            "instructions": bank_setting.instructions,
        }
    })))
}

// Handler upload bukti transfer tiket
pub async fn upload_payment_proof(
    State((pool, _config)): State<(PgPool, Config)>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut ticket_code: Option<String> = None;
    let mut phone: Option<String> = None;
    let mut uploaded_url: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        if name == "ticket_code" {
            let val = field.text().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            ticket_code = Some(val.trim().to_string());
        } else if name == "phone" {
            let val = field.text().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            phone = Some(val.trim().replace(" ", "").replace("-", ""));
        } else if name == "file" {
            let content_type = field.content_type().unwrap_or("image/jpeg").to_string();
            let bytes = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let url = save_upload("proofs", "proof", &content_type, &bytes).await?;
            uploaded_url = Some(url);
        }
    }

    let code = ticket_code.ok_or_else(|| AppError::BadRequest("Kode tiket wajib diisi".into()))?;
    let ph = phone.ok_or_else(|| AppError::BadRequest("Nomor HP wajib diisi".into()))?;
    let url = uploaded_url.ok_or_else(|| AppError::BadRequest("File bukti transfer wajib diunggah".into()))?;

    // Validasi kepemilikan tiket
    let ticket = sqlx::query_as::<_, TicketPurchase>(
        r#"SELECT tp.* FROM ticket_purchases tp
           JOIN members m ON m.id = tp.member_id
           WHERE tp.ticket_code = $1 AND REPLACE(REPLACE(m.phone, '-', ''), ' ', '') = $2"#
    )
    .bind(&code)
    .bind(&ph)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Tiket tidak ditemukan atau nomor HP tidak cocok".into()))?;

    if ticket.status == "dibatalkan" {
        return Err(AppError::BadRequest("Tiket ini sudah dibatalkan atau kedaluwarsa".into()));
    }

    // Update payment_proof_url
    sqlx::query(
        "UPDATE ticket_purchases SET payment_proof_url = $1 WHERE id = $2"
    )
    .bind(&url)
    .bind(ticket.id)
    .execute(&pool)
    .await?;

    Ok(ok("Bukti pembayaran berhasil diunggah. Admin akan segera memverifikasi.", serde_json::json!({
        "ticket_code": code,
        "payment_proof_url": url,
    })))
}

fn mask_name(name: &str) -> String {
    name.split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => {
                    let rest = chars.count();
                    if rest > 0 {
                        format!("{}{}", first, "*".repeat(rest))
                    } else {
                        first.to_string()
                    }
                }
                None => "".to_string(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn mask_phone(phone: &str) -> String {
    let clean = phone.trim().replace(" ", "").replace("-", "");
    if clean.len() <= 6 {
        return "***".to_string();
    }
    let prefix = &clean[..4];
    let suffix = &clean[clean.len() - 3..];
    let stars = "*".repeat(clean.len() - 7);
    format!("{}{}{}", prefix, stars, suffix)
}
