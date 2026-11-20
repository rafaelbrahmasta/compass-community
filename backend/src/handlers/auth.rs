use axum::{extract::State, Json, Extension};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::Admin;
use crate::utils::jwt::{create_token, Claims};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
#[allow(dead_code)]
pub struct AdminPublic {
    pub id: uuid::Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub is_active: bool,
}

pub async fn login(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<LoginRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let admin = sqlx::query_as::<_, Admin>(
        "SELECT * FROM admins WHERE email = $1"
    )
    .bind(&body.email)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Email atau password salah".into()))?;

    if !admin.is_active {
        return Err(AppError::Forbidden("Akun admin ini telah dinonaktifkan. Silakan hubungi super admin.".into()));
    }

    let parsed_hash = PasswordHash::new(&admin.password_hash)
        .map_err(|_| AppError::Internal(anyhow::anyhow!("Error parsing password hash")))?;

    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized("Email atau password salah".into()))?;

    let token = create_token(admin.id, &admin.email, &admin.name, &admin.role)
        .map_err(|e| AppError::Internal(e))?;

    Ok(ok("Login berhasil", serde_json::json!({
        "token": token,
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "role": admin.role,
            "is_active": admin.is_active,
        }
    })))
}

pub async fn me(
    State((pool, _config)): State<(PgPool, Config)>,
    Extension(claims): Extension<Claims>,
) -> AppResult<impl axum::response::IntoResponse> {
    let id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Token tidak valid".into()))?;

    let admin = sqlx::query_as::<_, Admin>("SELECT * FROM admins WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Admin tidak ditemukan".into()))?;

    if !admin.is_active {
        return Err(AppError::Forbidden("Akun admin ini telah dinonaktifkan".into()));
    }

    Ok(ok("Data admin", serde_json::json!({
        "id": admin.id,
        "email": admin.email,
        "name": admin.name,
        "role": admin.role,
        "is_active": admin.is_active,
    })))
}

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

pub async fn change_password(
    State((pool, _config)): State<(PgPool, Config)>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<ChangePasswordRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Token tidak valid".into()))?;

    let admin = sqlx::query_as::<_, Admin>("SELECT * FROM admins WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Admin tidak ditemukan".into()))?;

    // Verify current
    let parsed_hash = PasswordHash::new(&admin.password_hash)
        .map_err(|_| AppError::Internal(anyhow::anyhow!("Hash error")))?;
    Argon2::default()
        .verify_password(body.current_password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::BadRequest("Password saat ini tidak benar".into()))?;

    if body.new_password.len() < 8 {
        return Err(AppError::BadRequest("Password baru minimal 8 karakter".into()));
    }

    // Hash new password
    use argon2::{password_hash::{rand_core::OsRng, SaltString}, PasswordHasher};
    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(body.new_password.as_bytes(), &salt)
        .map_err(|_| AppError::Internal(anyhow::anyhow!("Gagal hash password")))?
        .to_string();

    sqlx::query("UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&new_hash)
        .bind(id)
        .execute(&pool)
        .await?;

    Ok(ok::<()>("Password berhasil diubah", ()))
}
