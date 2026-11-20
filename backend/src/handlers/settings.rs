use axum::{extract::{State, Multipart}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use std::collections::HashMap;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::SiteSetting;

const SETTING_KEYS: &[&str] = &[
    "site_name", "logo_url", "contact_name", "contact_email", "contact_phone",
    "contact_whatsapp", "address", "maps_embed_url", "instagram_url", "twitter_url",
    "facebook_url", "youtube_url", "tiktok_url", "merch_global_form_url",
];

pub async fn get_public_settings(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let settings = load_settings(&pool).await?;
    Ok(ok("Pengaturan situs", settings))
}

pub async fn admin_get_settings(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let settings = load_settings(&pool).await?;
    Ok(ok("Pengaturan situs", settings))
}

async fn load_settings(pool: &sqlx::PgPool) -> Result<serde_json::Value, crate::errors::AppError> {
    let rows = sqlx::query_as::<_, SiteSetting>("SELECT * FROM site_settings")
        .fetch_all(pool).await?;
    let mut map = serde_json::Map::new();
    for row in rows {
        map.insert(row.key.clone(), serde_json::Value::String(row.value.clone()));
    }
    Ok(serde_json::Value::Object(map))
}

pub async fn update_settings(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<serde_json::Value>,
) -> AppResult<impl axum::response::IntoResponse> {
    if let Some(obj) = body.as_object() {
        for (key, val) in obj {
            if !SETTING_KEYS.contains(&key.as_str()) { continue; }
            let value = val.as_str().unwrap_or("").to_string();
            sqlx::query(
                "INSERT INTO site_settings (id, key, value) VALUES ($1, $2, $3)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
            )
            .bind(Uuid::new_v4()).bind(key).bind(&value)
            .execute(&pool).await?;
        }
    }
    let settings = load_settings(&pool).await?;
    Ok(ok("Pengaturan diperbarui", settings))
}

pub async fn upload_logo(
    State((pool, config)): State<(PgPool, Config)>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        if field.name() == Some("image") {
            let ct = field.content_type().unwrap_or("image/png").to_string();
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let url = crate::utils::save_upload(&config.upload_dir, "gallery", &ct, &data).await?;
            sqlx::query(
                "INSERT INTO site_settings (id, key, value) VALUES ($1, 'logo_url', $2)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
            ).bind(Uuid::new_v4()).bind(&url).execute(&pool).await?;
            return Ok(ok("Logo diupload", serde_json::json!({"logo_url": url})));
        }
    }
    Err(AppError::BadRequest("Field 'image' tidak ditemukan".into()))
}
