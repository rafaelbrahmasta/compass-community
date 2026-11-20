use axum::{extract::{State, Path}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::HistoryTimeline;

pub async fn get_history(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let items = sqlx::query_as::<_, HistoryTimeline>(
        "SELECT * FROM history_timeline ORDER BY sort_order ASC, year ASC"
    ).fetch_all(&pool).await?;
    Ok(ok("Timeline sejarah", items))
}

#[derive(Deserialize)]
pub struct HistoryRequest {
    pub year: i32,
    pub title: String,
    pub description: String,
    pub sort_order: Option<i32>,
}

pub async fn create_history(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<HistoryRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let item = sqlx::query_as::<_, HistoryTimeline>(
        "INSERT INTO history_timeline (id, year, title, description, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(body.year)
    .bind(&body.title)
    .bind(&body.description)
    .bind(body.sort_order.unwrap_or(0))
    .fetch_one(&pool).await?;
    Ok(ok("Sejarah ditambahkan", item))
}

pub async fn update_history(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    Json(body): Json<HistoryRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let item = sqlx::query_as::<_, HistoryTimeline>(
        "UPDATE history_timeline SET year=$1, title=$2, description=$3, sort_order=$4 WHERE id=$5 RETURNING *"
    )
    .bind(body.year).bind(&body.title).bind(&body.description).bind(body.sort_order.unwrap_or(0)).bind(id)
    .fetch_optional(&pool).await?
    .ok_or_else(|| AppError::NotFound("Item tidak ditemukan".into()))?;
    Ok(ok("Sejarah diperbarui", item))
}

pub async fn delete_history(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM history_timeline WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Sejarah dihapus", ()))
}
