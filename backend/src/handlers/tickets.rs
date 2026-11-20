use axum::{extract::{State, Path}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::TicketCategory;

pub async fn get_match_tickets(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(match_id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let tickets = sqlx::query_as::<_, TicketCategory>(
        "SELECT * FROM ticket_categories WHERE match_id = $1 AND is_active = true ORDER BY price ASC"
    ).bind(match_id).fetch_all(&pool).await?;
    Ok(ok("Kategori tiket", tickets))
}

pub async fn admin_get_tickets(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(match_id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let tickets = sqlx::query_as::<_, TicketCategory>(
        "SELECT * FROM ticket_categories WHERE match_id = $1 ORDER BY price ASC"
    ).bind(match_id).fetch_all(&pool).await?;
    Ok(ok("Kategori tiket", tickets))
}

#[derive(Deserialize)]
pub struct TicketRequest {
    pub name: String,
    pub price: rust_decimal::Decimal,
    pub quota: i32,
}

pub async fn create_ticket(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(match_id): Path<Uuid>,
    Json(body): Json<TicketRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let ticket = sqlx::query_as::<_, TicketCategory>(
        "INSERT INTO ticket_categories (id, match_id, name, price, quota, sold)
         VALUES ($1, $2, $3, $4, $5, 0, true) RETURNING *"
    )
    .bind(Uuid::new_v4()).bind(match_id).bind(&body.name).bind(body.price).bind(body.quota)
    .fetch_one(&pool).await?;
    Ok(ok("Tiket ditambahkan", ticket))
}

pub async fn update_ticket(
    State((pool, _config)): State<(PgPool, Config)>,
    Path((match_id, ticket_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<TicketRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let ticket = sqlx::query_as::<_, TicketCategory>(
        "UPDATE ticket_categories SET name=$1, price=$2, quota=$3 WHERE id=$4 AND match_id=$5 RETURNING *"
    )
    .bind(&body.name).bind(body.price).bind(body.quota).bind(ticket_id).bind(match_id)
    .fetch_optional(&pool).await?
    .ok_or_else(|| AppError::NotFound("Tiket tidak ditemukan".into()))?;
    Ok(ok("Tiket diperbarui", ticket))
}

pub async fn delete_ticket(
    State((pool, _config)): State<(PgPool, Config)>,
    Path((match_id, ticket_id)): Path<(Uuid, Uuid)>,
) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM ticket_categories WHERE id=$1 AND match_id=$2")
        .bind(ticket_id).bind(match_id).execute(&pool).await?;
    Ok(ok::<()>("Tiket dihapus", ()))
}
