use axum::{extract::{State, Path, Query, Multipart}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{Utc, NaiveDate, Duration};
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::Match;

#[derive(Deserialize)]
pub struct MatchFilter {
    pub month: Option<String>,
    pub status: Option<String>,
}

pub async fn get_matches(
    State((pool, _config)): State<(PgPool, Config)>,
    Query(filter): Query<MatchFilter>,
) -> AppResult<impl axum::response::IntoResponse> {
    let matches = sqlx::query_as::<_, Match>(
        "SELECT * FROM matches
         WHERE ($1::text IS NULL OR TO_CHAR(match_date, 'YYYY-MM') = $1)
         AND ($2::text IS NULL OR status = $2)
         ORDER BY match_date ASC, match_time ASC"
    )
    .bind(filter.month)
    .bind(filter.status)
    .fetch_all(&pool).await?;
    Ok(ok("Jadwal pertandingan", matches))
}

pub async fn get_upcoming_matches(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Asia/Jakarta = UTC+7 (Indonesia tidak memiliki DST)
    let today = (Utc::now() + Duration::hours(7)).date_naive();
    let four_days = today + Duration::days(4);

    let matches = sqlx::query_as::<_, Match>(
        "SELECT * FROM matches
         WHERE match_date >= $1 AND match_date <= $2
         AND status IN ('upcoming', 'live')
         ORDER BY match_date ASC, match_time ASC"
    )
    .bind(today)
    .bind(four_days)
    .fetch_all(&pool).await?;

    Ok(ok("Pertandingan 4 hari ke depan", matches))
}

pub async fn admin_get_matches(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let matches = sqlx::query_as::<_, Match>(
        "SELECT * FROM matches ORDER BY match_date DESC, match_time DESC"
    ).fetch_all(&pool).await?;
    Ok(ok("Semua pertandingan", matches))
}

#[derive(Deserialize)]
pub struct CreateMatchRequest {
    pub opponent_name: String,
    pub opponent_logo_url: Option<String>,
    pub match_date: NaiveDate,
    pub match_time: chrono::NaiveTime,
    pub stadium: String,
    pub home_away: String,
    pub competition: String,
    pub ticket_form_url: Option<String>,
}

pub async fn create_match(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<CreateMatchRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let m = sqlx::query_as::<_, Match>(
        "INSERT INTO matches (id, opponent_name, opponent_logo_url, match_date, match_time, stadium, home_away, competition, status, ticket_form_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'upcoming', $9) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(&body.opponent_name)
    .bind(&body.opponent_logo_url)
    .bind(body.match_date)
    .bind(body.match_time)
    .bind(&body.stadium)
    .bind(&body.home_away)
    .bind(&body.competition)
    .bind(&body.ticket_form_url)
    .fetch_one(&pool).await?;
    Ok(ok("Pertandingan ditambahkan", m))
}

#[derive(Deserialize)]
pub struct UpdateMatchRequest {
    pub opponent_name: Option<String>,
    pub match_date: Option<NaiveDate>,
    pub match_time: Option<chrono::NaiveTime>,
    pub stadium: Option<String>,
    pub home_away: Option<String>,
    pub competition: Option<String>,
    pub home_score: Option<i32>,
    pub away_score: Option<i32>,
    pub status: Option<String>,
    pub ticket_form_url: Option<String>,
}

pub async fn update_match(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateMatchRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut tx = pool.begin().await?;

    let current = sqlx::query_as::<_, Match>("SELECT * FROM matches WHERE id = $1 FOR UPDATE")
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::NotFound("Pertandingan tidak ditemukan".into()))?;

    let opponent_name = body.opponent_name.unwrap_or(current.opponent_name);
    let stadium = body.stadium.unwrap_or(current.stadium);
    let home_away = body.home_away.unwrap_or(current.home_away);
    let competition = body.competition.unwrap_or(current.competition);
    let status = body.status.unwrap_or(current.status);
    let match_date = body.match_date.unwrap_or(current.match_date);
    let match_time = body.match_time.unwrap_or(current.match_time);

    // Skor: jika status diubah ke upcoming, kosongkan skor; jika ada body skor baru, gunakan nilainya
    let (home_score, away_score) = if status == "upcoming" {
        (None, None)
    } else {
        (body.home_score.or(current.home_score), body.away_score.or(current.away_score))
    };

    // Link tiket: jika dikirim string kosong "", ubah menjadi None sehingga bisa dikosongkan
    let ticket_form_url = match body.ticket_form_url {
        Some(url) if url.trim().is_empty() => None,
        Some(url) => Some(url),
        None => current.ticket_form_url,
    };

    // Hitung ulang jadwal reminder jika tanggal atau waktu laga berubah
    if match_date != current.match_date || match_time != current.match_time {
        let match_utc = match_date.and_time(match_time).and_utc() - Duration::hours(7);

        sqlx::query(
            "UPDATE reminders SET scheduled_at = $1 WHERE match_id = $2 AND remind_before = 'h_minus_1_day' AND email_sent = false"
        )
        .bind(match_utc - Duration::days(1))
        .bind(id)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            "UPDATE reminders SET scheduled_at = $1 WHERE match_id = $2 AND remind_before = 'h_minus_3_hours' AND email_sent = false"
        )
        .bind(match_utc - Duration::hours(3))
        .bind(id)
        .execute(&mut *tx)
        .await?;
    }

    let m = sqlx::query_as::<_, Match>(
        "UPDATE matches SET
         opponent_name = $1,
         match_date = $2,
         match_time = $3,
         stadium = $4,
         home_away = $5,
         competition = $6,
         home_score = $7,
         away_score = $8,
         status = $9,
         ticket_form_url = $10
         WHERE id = $11 RETURNING *"
    )
    .bind(opponent_name)
    .bind(match_date)
    .bind(match_time)
    .bind(stadium)
    .bind(home_away)
    .bind(competition)
    .bind(home_score)
    .bind(away_score)
    .bind(status)
    .bind(ticket_form_url)
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(ok("Pertandingan diperbarui", m))
}

pub async fn delete_match(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Validasi apakah pertandingan sudah memiliki tiket yang dibeli
    let purchase_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ticket_purchases WHERE match_id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    if purchase_count > 0 {
        return Err(AppError::Conflict(
            "Pertandingan tidak dapat dihapus karena sudah memiliki data pesanan/pembelian tiket.".into()
        ));
    }

    let mut tx = pool.begin().await?;

    // Bersihkan data relasi turunan (reminders dan kategori tiket) secara atomik
    sqlx::query("DELETE FROM reminders WHERE match_id = $1").bind(id).execute(&mut *tx).await?;
    sqlx::query("DELETE FROM ticket_categories WHERE match_id = $1").bind(id).execute(&mut *tx).await?;
    sqlx::query("DELETE FROM matches WHERE id = $1").bind(id).execute(&mut *tx).await?;

    tx.commit().await?;

    Ok(ok::<()>("Pertandingan dan kategori tiket berhasil dihapus", ()))
}

#[derive(Deserialize)]
pub struct CsvMatchRow {
    tanggal: String,
    waktu: String,
    lawan: String,
    kandang_tandang: String,
    stadion: String,
    kompetisi: String,
}

pub async fn import_csv(
    State((pool, _config)): State<(PgPool, Config)>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        if field.name() == Some("file") {
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let raw_content = String::from_utf8(data.to_vec())
                .map_err(|_| AppError::BadRequest("File CSV tidak valid (bukan UTF-8)".into()))?;

            // Bersihkan BOM UTF-8 jika ada (misal dari export Excel Windows)
            let content = raw_content.trim_start_matches('\u{feff}');

            // Deteksi otomatis pemisah/delimiter (koma ',' vs titik koma ';')
            let first_line = content.lines().next().unwrap_or("");
            let delimiter = if first_line.matches(';').count() > first_line.matches(',').count() {
                b';'
            } else {
                b','
            };

            let mut reader = csv::ReaderBuilder::new()
                .delimiter(delimiter)
                .trim(csv::Trim::All)
                .from_reader(content.as_bytes());

            let mut tx = pool.begin().await?;
            let mut imported = 0u32;

            for (idx, result) in reader.deserialize::<CsvMatchRow>().enumerate() {
                let row = result.map_err(|e| AppError::BadRequest(format!("Error format CSV pada baris {}: {}", idx + 2, e)))?;
                let date = NaiveDate::parse_from_str(row.tanggal.trim(), "%Y-%m-%d")
                    .map_err(|_| AppError::BadRequest(format!("Format tanggal salah pada baris {}: '{}'. Gunakan format YYYY-MM-DD", idx + 2, row.tanggal)))?;
                let time_str = row.waktu.trim();
                let time = chrono::NaiveTime::parse_from_str(time_str, "%H:%M")
                    .or_else(|_| chrono::NaiveTime::parse_from_str(time_str, "%H:%M:%S"))
                    .map_err(|_| AppError::BadRequest(format!("Format waktu salah pada baris {}: '{}'. Gunakan format HH:MM", idx + 2, row.waktu)))?;

                let home_away = row.kandang_tandang.trim().to_lowercase();
                let valid_ha = match home_away.as_str() {
                    "kandang" | "home" => "home",
                    "tandang" | "away" => "away",
                    _ => return Err(AppError::BadRequest(format!("Status kandang/tandang pada baris {} tidak valid: '{}'. Gunakan 'kandang' atau 'tandang'", idx + 2, row.kandang_tandang))),
                };

                sqlx::query(
                    "INSERT INTO matches (id, opponent_name, match_date, match_time, stadium, home_away, competition, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming')"
                )
                .bind(Uuid::new_v4())
                .bind(row.lawan.trim())
                .bind(date)
                .bind(time)
                .bind(row.stadion.trim())
                .bind(valid_ha)
                .bind(row.kompetisi.trim())
                .execute(&mut *tx).await?;

                imported += 1;
            }

            if imported == 0 {
                return Err(AppError::BadRequest("File CSV kosong atau tidak memiliki data pertandingan".into()));
            }

            // Seluruh baris berhasil divalidasi dan di-insert, commit transaksi
            tx.commit().await?;

            return Ok(ok("Import CSV berhasil", serde_json::json!({"imported": imported})));
        }
    }
    Err(AppError::BadRequest("File CSV tidak ditemukan".into()))
}
