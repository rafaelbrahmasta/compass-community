use axum::{
    extract::{ConnectInfo, Query, State},
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
use crate::models::{HumanitySettings, Member, TicketCategory, TicketPurchase};
use crate::utils::{limiter, extract_ip};

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
    pub expires_at: DateTime<Utc>,
    pub member: MemberInfo,
    pub match_info: MatchBrief,
    pub category_name: String,
    pub bank_info: BankInfo,
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
}

pub async fn buy_ticket(
    State((pool, _config)): State<(PgPool, Config)>,
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
    let pin_input = body.pin.as_deref().unwrap_or("").trim();
    if pin_input.is_empty() {
        return Err(AppError::BadRequest("PIN anggota 6 digit wajib diisi".into()));
    }

    let is_pin_valid = if let Some(ref pin_hash) = member.pin_hash {
        if let Ok(parsed_hash) = PasswordHash::new(pin_hash) {
            Argon2::default().verify_password(pin_input.as_bytes(), &parsed_hash).is_ok()
        } else {
            pin_hash == pin_input
        }
    } else {
        // Anggota tanpa PIN khusus: default PIN adalah 6 digit terakhir nomor HP atau 123456
        let fallback_pin = if clean_phone.len() >= 6 {
            &clean_phone[clean_phone.len() - 6..]
        } else {
            "123456"
        };
        pin_input == fallback_pin || pin_input == "123456"
    };

    if !is_pin_valid {
        return Err(AppError::Unauthorized(
            "PIN Anggota salah. Masukkan PIN keamanan Anda (default: 6 digit terakhir nomor HP).".into()
        ));
    }

    // 2. Cek apakah ada pesanan tiket kedaluwarsa milik anggota ini, batalkan otomatis bila ada
    sqlx::query(
        r#"UPDATE ticket_purchases
           SET status = 'dibatalkan',
               notes = COALESCE(notes || ' | ', '') || 'Dibatalkan otomatis karena batas waktu pembayaran 24 jam berakhir'
           WHERE member_id = $1 AND match_id = $2 AND status = 'menunggu_pembayaran' AND expires_at <= NOW()"#
    )
    .bind(member.id)
    .bind(body.match_id)
    .execute(&pool)
    .await?;

    // Cek apakah anggota sudah punya tiket aktif untuk pertandingan ini (1 tiket per anggota per pertandingan)
    let existing_ticket = sqlx::query_as::<_, TicketPurchase>(
        r#"SELECT * FROM ticket_purchases
           WHERE member_id = $1 AND match_id = $2 AND status != 'dibatalkan'"#
    )
    .bind(member.id)
    .bind(body.match_id)
    .fetch_optional(&pool)
    .await?;

    if let Some(existing) = existing_ticket {
        return Err(AppError::BadRequest(format!(
            "Anda sudah memiliki pesanan tiket untuk pertandingan ini (Kode: {}). Maksimal 1 tiket per anggota.",
            existing.ticket_code
        )));
    }

    // 3. Mulai Transaksi untuk cek kuota dan buat tiket
    let mut tx = pool.begin().await?;

    // Kunci row kategori tiket untuk atomisitas kuota
    let category = sqlx::query_as::<_, TicketCategory>(
        r#"SELECT * FROM ticket_categories
           WHERE id = $1 AND match_id = $2
           FOR UPDATE"#
    )
    .bind(body.category_id)
    .bind(body.match_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Kategori tiket tidak ditemukan untuk pertandingan ini".into()))?;

    if !category.is_active {
        return Err(AppError::BadRequest(
            format!("Kategori tiket '{}' tidak aktif saat ini.", category.name)
        ));
    }

    if category.sold >= category.quota {
        return Err(AppError::BadRequest(
            format!("Maaf, kuota untuk kategori '{}' sudah habis.", category.name)
        ));
    }

    // Ambil info match
    let match_data = sqlx::query_as::<_, crate::models::Match>(
        "SELECT * FROM matches WHERE id = $1"
    )
    .bind(body.match_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Pertandingan tidak ditemukan".into()))?;

    // Validasi status pertandingan (hanya upcoming atau live yang dibuka penjualan)
    if match_data.status != "upcoming" && match_data.status != "live" {
        return Err(AppError::BadRequest(
            "Penjualan tiket untuk pertandingan ini belum dibuka atau sudah ditutup.".into(),
        ));
    }

    // Validasi jendela penjualan: hanya 4 hari ke depan (zona Asia/Jakarta = UTC+7)
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
           (id, ticket_code, member_id, match_id, category_id, price, status, qr_payload, notes, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'menunggu_pembayaran', $7, $8, NOW() + INTERVAL '24 hours')
           RETURNING *"#
    )
    .bind(Uuid::new_v4())
    .bind(&ticket_code)
    .bind(member.id)
    .bind(match_data.id)
    .bind(category.id)
    .bind(category.price)
    .bind(&qr_payload)
    .bind(&body.notes)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    // Ambil info bank dari humanity_settings
    let humanity = sqlx::query_as::<_, HumanitySettings>(
        "SELECT * FROM humanity_settings LIMIT 1"
    )
    .fetch_optional(&pool)
    .await?
    .unwrap_or(HumanitySettings {
        id: Uuid::nil(),
        program_text: "".into(),
        qr_image_url: None,
        bank_name: "BCA".into(),
        account_name: "COMPASS SLEMAN".into(),
        account_number: "1234567890".into(),
        updated_at: Utc::now(),
    });

    Ok(ok("Pesanan tiket berhasil dibuat", BuyTicketResponse {
        ticket_code: purchase.ticket_code,
        qr_payload: purchase.qr_payload,
        status: purchase.status,
        price: purchase.price,
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
            bank_name: humanity.bank_name,
            account_name: humanity.account_name,
            account_number: humanity.account_number,
        },
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
    pub qr_payload: String,
    pub notes: Option<String>,
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
            "Nomor HP terdaftar wajib dimasukkan demi verifikasi privasi dan keamanan tiket".into()
        ));
    }

    if ticket_code.is_none() && member_code.is_none() {
        return Err(AppError::BadRequest(
            "Masukkan Kode Tiket (TCK-...) atau Kode Anggota".into()
        ));
    }

    let tickets = sqlx::query_as::<_, TicketDetailItem>(
        r#"SELECT tp.id, tp.ticket_code, tp.status, tp.price, tp.qr_payload, tp.notes,
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

    // Samarkan data sensitif anggota (nama dan nomor HP) untuk mencegah kebocoran informasi
    let masked_tickets: Vec<TicketDetailItem> = tickets.into_iter().map(|mut t| {
        t.full_name = mask_name(&t.full_name);
        t.phone = mask_phone(&t.phone);
        t
    }).collect();

    Ok(ok("Data tiket ditemukan", masked_tickets))
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
