use axum::{extract::{State, Path, Query, Multipart}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::News;
use crate::utils::slug::unique_slug;

#[derive(Deserialize)]
pub struct NewsFilter {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn get_news_list(
    State((pool, _config)): State<(PgPool, Config)>,
    Query(filter): Query<NewsFilter>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = filter.page.unwrap_or(1).max(1);
    let per_page = filter.per_page.unwrap_or(10).min(50);
    let offset = (page - 1) * per_page;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM news WHERE status = 'published'")
        .fetch_one(&pool).await?;

    let items = sqlx::query_as::<_, News>(
        "SELECT * FROM news WHERE status = 'published' ORDER BY published_at DESC LIMIT $1 OFFSET $2"
    ).bind(per_page).bind(offset).fetch_all(&pool).await?;

    Ok(ok("Daftar berita", serde_json::json!({
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total as f64 / per_page as f64).ceil() as i64,
    })))
}

pub async fn get_news_detail(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(slug): Path<String>,
) -> AppResult<impl axum::response::IntoResponse> {
    let news = sqlx::query_as::<_, News>(
        "SELECT * FROM news WHERE slug = $1 AND status = 'published'"
    ).bind(&slug).fetch_optional(&pool).await?
    .ok_or_else(|| AppError::NotFound("Berita tidak ditemukan".into()))?;
    Ok(ok("Detail berita", news))
}

pub async fn admin_get_news(State((pool, _config)): State<(PgPool, Config)>) -> AppResult<impl axum::response::IntoResponse> {
    let news = sqlx::query_as::<_, News>("SELECT * FROM news ORDER BY created_at DESC").fetch_all(&pool).await?;
    Ok(ok("Semua berita", news))
}

#[derive(Deserialize)]
pub struct NewsRequest {
    pub title: String,
    pub content: String,
    pub summary: String,
    pub author: String,
    pub status: Option<String>,
}

pub async fn create_news(State((pool, _config)): State<(PgPool, Config)>, Json(body): Json<NewsRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let id = Uuid::new_v4();
    let slug = unique_slug(&body.title, &id.to_string());
    let status = body.status.unwrap_or_else(|| "draft".into());
    let published_at = if status == "published" { Some(Utc::now()) } else { None };
    // Sanitasi HTML content dengan ammonia untuk mencegah stored XSS
    let clean_content = ammonia::clean(&body.content);

    let news = sqlx::query_as::<_, News>(
        "INSERT INTO news (id, title, slug, content, summary, author, status, published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *"
    ).bind(id).bind(&body.title).bind(&slug).bind(&clean_content).bind(&body.summary)
    .bind(&body.author).bind(&status).bind(published_at)
    .fetch_one(&pool).await?;
    Ok(ok("Berita ditambahkan", news))
}

pub async fn update_news(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>, Json(body): Json<NewsRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let status = body.status.unwrap_or_else(|| "draft".into());
    // Sanitasi HTML content dengan ammonia untuk mencegah stored XSS
    let clean_content = ammonia::clean(&body.content);

    let news = sqlx::query_as::<_, News>(
        "UPDATE news SET title=$1, content=$2, summary=$3, author=$4, status=$5,
         published_at = CASE WHEN $5 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
         updated_at = NOW()
         WHERE id=$6 RETURNING *"
    ).bind(&body.title).bind(&clean_content).bind(&body.summary).bind(&body.author).bind(&status).bind(id)
    .fetch_optional(&pool).await?.ok_or_else(|| AppError::NotFound("Berita tidak ditemukan".into()))?;
    Ok(ok("Berita diperbarui", news))
}

pub async fn delete_news(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM news WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Berita dihapus", ()))
}

pub async fn upload_thumbnail(
    State((pool, config)): State<(PgPool, Config)>,
    Path(news_id): Path<Uuid>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        if field.name() == Some("image") {
            let ct = field.content_type().unwrap_or("image/jpeg").to_string();
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let url = crate::utils::save_upload(&config.upload_dir, "news", &ct, &data).await?;
            sqlx::query("UPDATE news SET thumbnail_url = $1, updated_at = NOW() WHERE id = $2")
                .bind(&url).bind(news_id).execute(&pool).await?;
            return Ok(ok("Thumbnail diupload", serde_json::json!({"thumbnail_url": url})));
        }
    }
    Err(AppError::BadRequest("Field 'image' tidak ditemukan".into()))
}
