use axum::{extract::{State, Path, Multipart}, Json};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::CarouselSlide;

pub async fn get_active_slides(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let slides = sqlx::query_as::<_, CarouselSlide>(
        "SELECT * FROM carousel_slides WHERE is_active = true ORDER BY sort_order ASC"
    )
    .fetch_all(&pool)
    .await?;
    Ok(ok("Slide aktif", slides))
}

pub async fn admin_get_slides(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let slides = sqlx::query_as::<_, CarouselSlide>(
        "SELECT * FROM carousel_slides ORDER BY sort_order ASC"
    )
    .fetch_all(&pool)
    .await?;
    Ok(ok("Semua slide", slides))
}

#[derive(Deserialize)]
pub struct CreateSlideRequest {
    pub title: String,
    pub subtitle: String,
    pub sort_order: Option<i32>,
    pub is_active: Option<bool>,
}

pub async fn create_slide(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<CreateSlideRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let slide = sqlx::query_as::<_, CarouselSlide>(
        "INSERT INTO carousel_slides (id, image_url, title, subtitle, sort_order, is_active)
         VALUES ($1, '', $2, $3, $4, $5)
         RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(&body.title)
    .bind(&body.subtitle)
    .bind(body.sort_order.unwrap_or(0))
    .bind(body.is_active.unwrap_or(true))
    .fetch_one(&pool)
    .await?;

    Ok(ok("Slide berhasil dibuat", slide))
}

#[derive(Deserialize)]
pub struct UpdateSlideRequest {
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: Option<bool>,
}

pub async fn update_slide(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSlideRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let slide = sqlx::query_as::<_, CarouselSlide>(
        "UPDATE carousel_slides
         SET title = COALESCE($1, title),
             subtitle = COALESCE($2, subtitle),
             sort_order = COALESCE($3, sort_order),
             is_active = COALESCE($4, is_active)
         WHERE id = $5
         RETURNING *"
    )
    .bind(body.title)
    .bind(body.subtitle)
    .bind(body.sort_order)
    .bind(body.is_active)
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Slide tidak ditemukan".into()))?;

    Ok(ok("Slide diperbarui", slide))
}

pub async fn delete_slide(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM carousel_slides WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(ok::<()>("Slide dihapus", ()))
}

pub async fn upload_slide_image(
    State((pool, config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        if field.name() == Some("image") {
            let content_type = field.content_type().unwrap_or("image/jpeg").to_string();
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let url = crate::utils::save_upload(&config.upload_dir, "gallery", &content_type, &data).await?;

            sqlx::query("UPDATE carousel_slides SET image_url = $1 WHERE id = $2")
                .bind(&url)
                .bind(id)
                .execute(&pool)
                .await?;

            return Ok(ok("Gambar slide diupload", serde_json::json!({"image_url": url})));
        }
    }
    Err(AppError::BadRequest("Field 'image' tidak ditemukan".into()))
}
