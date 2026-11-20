use axum::{extract::{State, Path, Query, Multipart}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{Local, NaiveDate, Duration};
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
    let today = Local::now().date_naive();
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
    let m = sqlx::query_as::<_, Match>(
        "UPDATE matches SET
         opponent_name = COALESCE($1, opponent_name),
         match_date = COALESCE($2, match_date),
         match_time = COALESCE($3, match_time),
         stadium = COALESCE($4, stadium),
         home_away = COALESCE($5, home_away),
         competition = COALESCE($6, competition),
         home_score = COALESCE($7, home_score),
         away_score = COALESCE($8, away_score),
         status = COALESCE($9, status),
         ticket_form_url = COALESCE($10, ticket_form_url)
         WHERE id = $11 RETURNING *"
    )
    .bind(body.opponent_name).bind(body.match_date).bind(body.match_time)
    .bind(body.stadium).bind(body.home_away).bind(body.competition)
    .bind(body.home_score).bind(body.away_score).bind(body.status)
    .bind(body.ticket_form_url).bind(id)
    .fetch_optional(&pool).await?
    .ok_or_else(|| AppError::NotFound("Pertandingan tidak ditemukan".into()))?;
    Ok(ok("Pertandingan diperbarui", m))
}

pub async fn delete_match(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM matches WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Pertandingan dihapus", ()))
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
            let content = String::from_utf8(data.to_vec())
                .map_err(|_| AppError::BadRequest("File CSV tidak valid (bukan UTF-8)".into()))?;

            let mut reader = csv::Reader::from_reader(content.as_bytes());
            let mut imported = 0u32;

            for result in reader.deserialize::<CsvMatchRow>() {
                let row = result.map_err(|e| AppError::BadRequest(format!("Error CSV: {}", e)))?;
                let date = NaiveDate::parse_from_str(&row.tanggal, "%Y-%m-%d")
                    .map_err(|_| AppError::BadRequest(format!("Format tanggal salah: {}", row.tanggal)))?;
                let time = chrono::NaiveTime::parse_from_str(&row.waktu, "%H:%M")
                    .map_err(|_| AppError::BadRequest(format!("Format waktu salah: {}", row.waktu)))?;

                sqlx::query(
                    "INSERT INTO matches (id, opponent_name, match_date, match_time, stadium, home_away, competition, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming')"
                )
                .bind(Uuid::new_v4())
                .bind(&row.lawan)
                .bind(date)
                .bind(time)
                .bind(&row.stadion)
                .bind(&row.kandang_tandang)
                .bind(&row.kompetisi)
                .execute(&pool).await?;

                imported += 1;
            }

            return Ok(ok("Import CSV berhasil", serde_json::json!({"imported": imported})));
        }
    }
    Err(AppError::BadRequest("File tidak ditemukan".into()))
}
