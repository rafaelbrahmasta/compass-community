use axum::{extract::{State, Multipart}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::HumanitySettings;

pub async fn get_humanity(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let settings = sqlx::query_as::<_, HumanitySettings>(
        "SELECT * FROM humanity_settings LIMIT 1"
    ).fetch_optional(&pool).await?;
    Ok(ok("Data humanity", settings))
}

pub async fn admin_get_humanity(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let settings = sqlx::query_as::<_, HumanitySettings>(
        "SELECT * FROM humanity_settings LIMIT 1"
    ).fetch_optional(&pool).await?;
    Ok(ok("Data humanity", settings))
}

#[derive(Deserialize)]
pub struct UpdateHumanityRequest {
    pub program_text: Option<String>,
    pub bank_name: Option<String>,
    pub account_name: Option<String>,
    pub account_number: Option<String>,
}

pub async fn update_humanity(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<UpdateHumanityRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM humanity_settings")
        .fetch_one(&pool).await?;

    let result = if existing == 0 {
        sqlx::query_as::<_, HumanitySettings>(
            "INSERT INTO humanity_settings (id, program_text, bank_name, account_name, account_number)
             VALUES ($1, $2, $3, $4, $5) RETURNING *"
        )
        .bind(Uuid::new_v4())
        .bind(body.program_text.unwrap_or_default())
        .bind(body.bank_name.unwrap_or_default())
        .bind(body.account_name.unwrap_or_default())
        .bind(body.account_number.unwrap_or_default())
        .fetch_one(&pool).await?
    } else {
        sqlx::query_as::<_, HumanitySettings>(
            "UPDATE humanity_settings SET
             program_text = COALESCE($1, program_text),
             bank_name = COALESCE($2, bank_name),
             account_name = COALESCE($3, account_name),
             account_number = COALESCE($4, account_number),
             updated_at = NOW()
             RETURNING *"
        )
        .bind(body.program_text).bind(body.bank_name)
        .bind(body.account_name).bind(body.account_number)
        .fetch_one(&pool).await?
    };

    Ok(ok("Data humanity diperbarui", result))
}

pub async fn upload_qr(
    State((pool, config)): State<(PgPool, Config)>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        if field.name() == Some("image") {
            let ct = field.content_type().unwrap_or("image/png").to_string();
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let url = crate::utils::save_upload(&config, "qr", &ct, &data).await?;

            sqlx::query("UPDATE humanity_settings SET qr_image_url = $1, updated_at = NOW()")
                .bind(&url)
                .execute(&pool).await?;

            return Ok(ok("QR code diupload", serde_json::json!({"qr_image_url": url})));
        }
    }
    Err(AppError::BadRequest("Field 'image' tidak ditemukan".into()))
}

