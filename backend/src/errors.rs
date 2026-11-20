use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Tidak diotorisasi: {0}")]
    Unauthorized(String),
    #[error("Akses ditolak: {0}")]
    Forbidden(String),
    #[error("Tidak ditemukan: {0}")]
    NotFound(String),
    #[error("Permintaan tidak valid: {0}")]
    BadRequest(String),
    #[error("Error database: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Error internal: {0}")]
    Internal(#[from] anyhow::Error),
    #[error("Konflik: {0}")]
    Conflict(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg.clone()),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Terjadi kesalahan database".into())
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Terjadi kesalahan internal".into())
            }
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
        };

        let body = Json(json!({
            "success": false,
            "message": message,
            "data": null
        }));

        (status, body).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;

// Helper: success JSON response
pub fn ok<T: serde::Serialize>(message: &str, data: T) -> impl IntoResponse {
    Json(json!({
        "success": true,
        "message": message,
        "data": data
    }))
}
