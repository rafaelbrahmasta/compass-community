use axum::{extract::{State, Path, Multipart}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::{AboutContent, TeamMember};

pub async fn get_about(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let about = sqlx::query_as::<_, AboutContent>(
        "SELECT * FROM about_content WHERE section = 'about' LIMIT 1"
    ).fetch_optional(&pool).await?;

    let visi_misi = sqlx::query_as::<_, AboutContent>(
        "SELECT * FROM about_content WHERE section = 'visi_misi' LIMIT 1"
    ).fetch_optional(&pool).await?;

    let about_image = sqlx::query_as::<_, AboutContent>(
        "SELECT * FROM about_content WHERE section = 'about_image' LIMIT 1"
    ).fetch_optional(&pool).await?;

    let team_members = sqlx::query_as::<_, TeamMember>(
        "SELECT * FROM team_members ORDER BY sort_order ASC"
    ).fetch_all(&pool).await?;

    let history = sqlx::query_as::<_, crate::models::HistoryTimeline>(
        "SELECT * FROM history_timeline ORDER BY sort_order ASC, year ASC"
    ).fetch_all(&pool).await?;

    Ok(ok("Data about", serde_json::json!({
        "about": about,
        "visi_misi": visi_misi,
        "about_image": about_image,
        "team_members": team_members,
        "history": history,
    })))
}

pub async fn upload_about_image(
    State((pool, config)): State<(PgPool, Config)>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut image_url: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        if field.name() == Some("image") || field.name() == Some("photo") || field.name() == Some("file") {
            let ct = field.content_type().unwrap_or("image/jpeg").to_string();
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            if !data.is_empty() {
                let saved = crate::utils::save_upload(&config.upload_dir, "about", &ct, &data).await?;
                image_url = Some(saved);
            }
        }
    }

    let url = image_url.ok_or_else(|| AppError::BadRequest("File foto tidak ditemukan".into()))?;

    let result = sqlx::query_as::<_, AboutContent>(
        "INSERT INTO about_content (id, section, content)
         VALUES ($1, 'about_image', $2)
         ON CONFLICT (section) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
         RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(&url)
    .fetch_one(&pool)
    .await?;

    Ok(ok("Foto profil komunitas berhasil diperbarui", result))
}

#[derive(Deserialize)]
pub struct UpdateAboutRequest {
    pub section: String,
    pub content: String,
}

pub async fn update_about(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<UpdateAboutRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let result = sqlx::query_as::<_, AboutContent>(
        "INSERT INTO about_content (id, section, content)
         VALUES ($1, $2, $3)
         ON CONFLICT (section) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
         RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(&body.section)
    .bind(&body.content)
    .fetch_one(&pool)
    .await?;

    Ok(ok("Konten about diperbarui", result))
}

pub async fn get_team_members(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let members = sqlx::query_as::<_, TeamMember>(
        "SELECT * FROM team_members ORDER BY sort_order ASC"
    ).fetch_all(&pool).await?;
    Ok(ok("Pengurus", members))
}

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct CreateTeamMemberRequest {
    pub name: String,
    pub position: String,
    pub sort_order: Option<i32>,
}

pub async fn create_team_member(
    State((pool, config)): State<(PgPool, Config)>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut name = String::new();
    let mut position = String::new();
    let mut sort_order = 0i32;
    let mut photo_url: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        match field.name() {
            Some("name") => name = field.text().await.map_err(|e| AppError::BadRequest(e.to_string()))?,
            Some("position") => position = field.text().await.map_err(|e| AppError::BadRequest(e.to_string()))?,
            Some("sort_order") => sort_order = field.text().await.unwrap_or_default().parse().unwrap_or(0),
            Some("photo") => {
                let ct = field.content_type().unwrap_or("image/jpeg").to_string();
                let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
                if !data.is_empty() {
                    photo_url = Some(crate::utils::save_upload(&config.upload_dir, "gallery", &ct, &data).await?);
                }
            }
            _ => {}
        }
    }

    let member = sqlx::query_as::<_, TeamMember>(
        "INSERT INTO team_members (id, name, position, photo_url, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(&name)
    .bind(&position)
    .bind(&photo_url)
    .bind(sort_order)
    .fetch_one(&pool)
    .await?;

    Ok(ok("Pengurus ditambahkan", member))
}

#[derive(Deserialize)]
pub struct UpdateTeamMemberRequest {
    pub name: Option<String>,
    pub position: Option<String>,
    pub sort_order: Option<i32>,
    pub photo_url: Option<String>,
}

pub async fn update_team_member(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTeamMemberRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let member = sqlx::query_as::<_, TeamMember>(
        "UPDATE team_members SET
         name = COALESCE($1, name),
         position = COALESCE($2, position),
         sort_order = COALESCE($3, sort_order),
         photo_url = COALESCE($4, photo_url)
         WHERE id = $5 RETURNING *"
    )
    .bind(body.name)
    .bind(body.position)
    .bind(body.sort_order)
    .bind(body.photo_url)
    .bind(id)
    .fetch_optional(&pool).await?
    .ok_or_else(|| AppError::NotFound("Pengurus tidak ditemukan".into()))?;
    Ok(ok("Pengurus diperbarui", member))
}

pub async fn update_team_member_photo(
    State((pool, config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut photo_url: Option<String> = None;
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        if field.name() == Some("photo") {
            let ct = field.content_type().unwrap_or("image/jpeg").to_string();
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            if !data.is_empty() {
                photo_url = Some(crate::utils::save_upload(&config.upload_dir, "gallery", &ct, &data).await?);
            }
        }
    }
    let m = sqlx::query_as::<_, TeamMember>(
        "UPDATE team_members SET photo_url = $1 WHERE id = $2 RETURNING *"
    )
    .bind(photo_url)
    .bind(id)
    .fetch_optional(&pool).await?
    .ok_or_else(|| AppError::NotFound("Pengurus tidak ditemukan".into()))?;
    Ok(ok("Foto pengurus berhasil diperbarui", m))
}

pub async fn delete_team_member(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM team_members WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Pengurus dihapus", ()))
}
