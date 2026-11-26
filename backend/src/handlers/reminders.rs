use axum::{extract::{ConnectInfo, State}, Json, http::HeaderMap};
use std::net::SocketAddr;
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{Duration, Utc};
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::{Match, Reminder};
use crate::utils::{limiter, extract_ip};

#[derive(Deserialize)]
pub struct CreateReminderRequest {
    pub match_id: Uuid,
    pub email: String,
    pub whatsapp: Option<String>,
    pub remind_before: String, // "h_minus_1_day" or "h_minus_3_hours"
}

pub async fn create_reminder(
    State((pool, _config)): State<(PgPool, Config)>,
    ConnectInfo(conn_addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(body): Json<CreateReminderRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Bug 10: rate limit
    limiter().check(&extract_ip(&headers, Some(conn_addr)))?;

    // Validate remind_before
    if !["h_minus_1_day", "h_minus_3_hours"].contains(&body.remind_before.as_str()) {
        return Err(AppError::BadRequest("remind_before tidak valid. Gunakan 'h_minus_1_day' atau 'h_minus_3_hours'".into()));
    }

    // Bug 10: validasi format email
    let clean_email = body.email.trim().to_lowercase();
    if !clean_email.contains('@') || !clean_email.contains('.') || clean_email.len() < 5 {
        return Err(AppError::BadRequest("Format email tidak valid".into()));
    }

    // Get match to calculate scheduled_at
    let m = sqlx::query_as::<_, Match>("SELECT * FROM matches WHERE id = $1")
        .bind(body.match_id)
        .fetch_optional(&pool).await?
        .ok_or_else(|| AppError::NotFound("Pertandingan tidak ditemukan".into()))?;

    // Calculate scheduled_at
    let match_datetime_utc = m.match_date.and_time(m.match_time).and_utc() - Duration::hours(7);
    let scheduled_at = if body.remind_before == "h_minus_1_day" {
        match_datetime_utc - Duration::days(1)
    } else {
        match_datetime_utc - Duration::hours(3)
    };

    // Bug 10: tolak jika scheduled_at sudah lewat
    if scheduled_at <= Utc::now() {
        return Err(AppError::BadRequest("Waktu reminder sudah lewat. Pertandingan akan segera berlangsung atau sudah selesai.".into()));
    }

    // Check duplicate
    let exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM reminders WHERE match_id = $1 AND email = $2 AND remind_before = $3"
    )
    .bind(body.match_id).bind(&clean_email).bind(&body.remind_before)
    .fetch_one(&pool).await?;

    if exists > 0 {
        return Err(AppError::Conflict("Kamu sudah mendaftar reminder ini".into()));
    }

    let reminder = sqlx::query_as::<_, Reminder>(
        "INSERT INTO reminders (id, match_id, email, whatsapp, remind_before, email_sent, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, false, $6) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(body.match_id)
    .bind(&clean_email)
    .bind(&body.whatsapp)
    .bind(&body.remind_before)
    .bind(scheduled_at)
    .fetch_one(&pool).await?;

    Ok(ok("Reminder berhasil didaftarkan", serde_json::json!({"id": reminder.id})))
}

pub async fn admin_get_reminders(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let reminders = sqlx::query_as::<_, Reminder>(
        "SELECT * FROM reminders ORDER BY created_at DESC"
    ).fetch_all(&pool).await?;
    Ok(ok("Daftar reminder", reminders))
}
