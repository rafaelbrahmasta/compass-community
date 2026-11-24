use axum::{extract::{State, Path, Multipart}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::{GalleryAlbum, GalleryPhoto};

pub async fn get_albums(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let albums = sqlx::query_as::<_, GalleryAlbum>(
        "SELECT ga.*, COUNT(gp.id) as photo_count FROM gallery_albums ga
         LEFT JOIN gallery_photos gp ON gp.album_id = ga.id
         GROUP BY ga.id ORDER BY ga.sort_order ASC"
    ).fetch_all(&pool).await.unwrap_or_default();
    Ok(ok("Album gallery", albums))
}

pub async fn get_album_photos(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(album_id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let photos = sqlx::query_as::<_, GalleryPhoto>(
        "SELECT * FROM gallery_photos WHERE album_id = $1 ORDER BY sort_order ASC"
    ).bind(album_id).fetch_all(&pool).await?;
    Ok(ok("Foto album", photos))
}

pub async fn admin_get_albums(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let albums = sqlx::query_as::<_, GalleryAlbum>(
        "SELECT * FROM gallery_albums ORDER BY sort_order ASC"
    ).fetch_all(&pool).await?;
    Ok(ok("Semua album", albums))
}

#[derive(Deserialize)]
pub struct AlbumRequest { pub name: String, pub description: String, pub sort_order: Option<i32> }

pub async fn create_album(State((pool, _config)): State<(PgPool, Config)>, Json(body): Json<AlbumRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let a = sqlx::query_as::<_, GalleryAlbum>(
        "INSERT INTO gallery_albums (id, name, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING *"
    ).bind(Uuid::new_v4()).bind(&body.name).bind(&body.description).bind(body.sort_order.unwrap_or(0))
    .fetch_one(&pool).await?;
    Ok(ok("Album dibuat", a))
}

pub async fn update_album(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>, Json(body): Json<AlbumRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let a = sqlx::query_as::<_, GalleryAlbum>(
        "UPDATE gallery_albums SET name=$1, description=$2, sort_order=$3 WHERE id=$4 RETURNING *"
    ).bind(&body.name).bind(&body.description).bind(body.sort_order.unwrap_or(0)).bind(id)
    .fetch_optional(&pool).await?.ok_or_else(|| AppError::NotFound("Album tidak ditemukan".into()))?;
    Ok(ok("Album diperbarui", a))
}

pub async fn delete_album(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM gallery_albums WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Album dihapus", ()))
}

pub async fn upload_photos(
    State((pool, config)): State<(PgPool, Config)>,
    Path(album_id): Path<Uuid>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut uploaded = vec![];
    let mut sort_base: i32 = sqlx::query_scalar("SELECT COALESCE(MAX(sort_order), 0) FROM gallery_photos WHERE album_id = $1")
        .bind(album_id).fetch_one(&pool).await.unwrap_or(0);

    let mut current_caption = String::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(format!("Format form upload tidak valid: {}", e)))? {
        let field_name = field.name().unwrap_or("").to_string();
        if field_name == "caption" {
            current_caption = field.text().await.unwrap_or_default();
        } else if field_name == "photos" || field_name == "photo" || field_name == "file" {
            let ct = field.content_type().unwrap_or("image/jpeg").to_string();
            let caption = current_caption.clone();
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(format!("Gagal membaca data file: {}", e)))?;
            if data.is_empty() { continue; }
            let url = crate::utils::save_upload(&config.upload_dir, "gallery", &ct, &data).await?;
            sort_base += 1;
            let photo = sqlx::query_as::<_, GalleryPhoto>(
                "INSERT INTO gallery_photos (id, album_id, image_url, caption, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *"
            ).bind(Uuid::new_v4()).bind(album_id).bind(&url).bind(&caption).bind(sort_base)
            .fetch_one(&pool).await?;
            uploaded.push(photo);
            current_caption.clear();
        }
    }
    Ok(ok("Foto berhasil diupload", uploaded))
}

pub async fn delete_photo(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM gallery_photos WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Foto dihapus", ()))
}
