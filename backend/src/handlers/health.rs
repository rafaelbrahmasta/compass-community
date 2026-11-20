use axum::extract::State;
use serde_json::json;
use sqlx::PgPool;
use crate::config::Config;
use crate::errors::{AppResult, ok};

pub async fn health_check(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("SELECT 1").execute(&pool).await?;
    Ok(ok("Server berjalan dengan baik", json!({"status": "ok"})))
}
