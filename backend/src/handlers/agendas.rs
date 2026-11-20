use axum::{extract::{State, Path, Query}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::Agenda;

#[derive(Deserialize)]
pub struct AgendaFilter { pub month: Option<String> }

pub async fn get_agendas(
    State((pool, _config)): State<(PgPool, Config)>,
    Query(filter): Query<AgendaFilter>,
) -> AppResult<impl axum::response::IntoResponse> {
    let agendas = sqlx::query_as::<_, Agenda>(
        "SELECT * FROM agendas WHERE ($1::text IS NULL OR TO_CHAR(agenda_date, 'YYYY-MM') = $1) ORDER BY agenda_date ASC, agenda_time ASC"
    ).bind(filter.month).fetch_all(&pool).await?;
    Ok(ok("Agenda", agendas))
}

pub async fn admin_get_agendas(State((pool, _config)): State<(PgPool, Config)>) -> AppResult<impl axum::response::IntoResponse> {
    let agendas = sqlx::query_as::<_, Agenda>("SELECT * FROM agendas ORDER BY agenda_date DESC").fetch_all(&pool).await?;
    Ok(ok("Semua agenda", agendas))
}

#[derive(Deserialize)]
pub struct AgendaRequest {
    pub title: String,
    pub agenda_date: chrono::NaiveDate,
    pub agenda_time: chrono::NaiveTime,
    pub location: String,
    pub description: String,
    pub status: Option<String>,
}

pub async fn create_agenda(State((pool, _config)): State<(PgPool, Config)>, Json(body): Json<AgendaRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let a = sqlx::query_as::<_, Agenda>(
        "INSERT INTO agendas (id, title, agenda_date, agenda_time, location, description, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *"
    ).bind(Uuid::new_v4()).bind(&body.title).bind(body.agenda_date).bind(body.agenda_time)
    .bind(&body.location).bind(&body.description).bind(body.status.unwrap_or_else(|| "upcoming".into()))
    .fetch_one(&pool).await?;
    Ok(ok("Agenda ditambahkan", a))
}

pub async fn update_agenda(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>, Json(body): Json<AgendaRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let a = sqlx::query_as::<_, Agenda>(
        "UPDATE agendas SET title=$1,agenda_date=$2,agenda_time=$3,location=$4,description=$5,status=$6 WHERE id=$7 RETURNING *"
    ).bind(&body.title).bind(body.agenda_date).bind(body.agenda_time).bind(&body.location)
    .bind(&body.description).bind(body.status.unwrap_or_else(|| "upcoming".into())).bind(id)
    .fetch_optional(&pool).await?.ok_or_else(|| AppError::NotFound("Agenda tidak ditemukan".into()))?;
    Ok(ok("Agenda diperbarui", a))
}

pub async fn delete_agenda(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM agendas WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Agenda dihapus", ()))
}
