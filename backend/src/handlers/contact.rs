use axum::{extract::{State, Path}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::ContactMessage;

#[derive(Deserialize)]
pub struct ContactRequest {
    pub name: String,
    pub email: String,
    pub message: String,
}

pub async fn send_message(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<ContactRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    if body.name.is_empty() || body.email.is_empty() || body.message.is_empty() {
        return Err(AppError::BadRequest("Semua field wajib diisi".into()));
    }
    if !body.email.contains('@') {
        return Err(AppError::BadRequest("Email tidak valid".into()));
    }

    let msg = sqlx::query_as::<_, ContactMessage>(
        "INSERT INTO contact_messages (id, name, email, message, is_read) VALUES ($1,$2,$3,$4,false) RETURNING *"
    ).bind(Uuid::new_v4()).bind(&body.name).bind(&body.email).bind(&body.message)
    .fetch_one(&pool).await?;

    Ok(ok("Pesan berhasil dikirim", serde_json::json!({"id": msg.id})))
}

pub async fn get_messages(State((pool, _config)): State<(PgPool, Config)>) -> AppResult<impl axum::response::IntoResponse> {
    let msgs = sqlx::query_as::<_, ContactMessage>("SELECT * FROM contact_messages ORDER BY created_at DESC")
        .fetch_all(&pool).await?;
    Ok(ok("Pesan masuk", msgs))
}

pub async fn mark_read(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("UPDATE contact_messages SET is_read = true WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Pesan ditandai sudah dibaca", ()))
}
