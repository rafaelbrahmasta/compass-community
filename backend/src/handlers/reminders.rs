use axum::{extract::{State}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Duration;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::{Match, Reminder};

#[derive(Deserialize)]
pub struct CreateReminderRequest {
    pub match_id: Uuid,
    pub email: String,
    pub whatsapp: Option<String>,
    pub remind_before: String, // "h_minus_1_day" or "h_minus_3_hours"
}

pub async fn create_reminder(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<CreateReminderRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Validate remind_before
    if !["h_minus_1_day", "h_minus_3_hours"].contains(&body.remind_before.as_str()) {
        return Err(AppError::BadRequest("remind_before tidak valid. Gunakan 'h_minus_1_day' atau 'h_minus_3_hours'".into()));
    }

    // Get match to calculate scheduled_at
    let m = sqlx::query_as::<_, Match>("SELECT * FROM matches WHERE id = $1")
        .bind(body.match_id)
        .fetch_optional(&pool).await?
        .ok_or_else(|| AppError::NotFound("Pertandingan tidak ditemukan".into()))?;

    // Calculate scheduled_at
    let match_datetime = m.match_date.and_time(m.match_time).and_utc();
    let scheduled_at = if body.remind_before == "h_minus_1_day" {
        match_datetime - Duration::days(1)
    } else {
        match_datetime - Duration::hours(3)
    };

    // Check duplicate
    let exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM reminders WHERE match_id = $1 AND email = $2 AND remind_before = $3"
    )
    .bind(body.match_id).bind(&body.email).bind(&body.remind_before)
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
    .bind(&body.email)
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
