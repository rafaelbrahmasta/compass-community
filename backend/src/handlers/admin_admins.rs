use axum::{
    extract::{Extension, Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::Admin;
use crate::utils::jwt::Claims;

#[derive(Serialize, sqlx::FromRow)]
pub struct AdminListItem {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn admin_list_admins(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let admins = sqlx::query_as::<_, AdminListItem>(
        "SELECT id, email, name, role, is_active, created_at, updated_at FROM admins ORDER BY created_at ASC"
    )
    .fetch_all(&pool)
    .await?;

    Ok(ok("Daftar admin", admins))
}

#[derive(Deserialize)]
pub struct CreateAdminRequest {
    pub email: String,
    pub password: String,
    pub name: String,
    pub role: String, // admin_1 | admin_2
}

pub async fn admin_create_admin(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<CreateAdminRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let email = body.email.trim().to_lowercase();
    let name = body.name.trim();

    if email.is_empty() || body.password.len() < 8 || name.is_empty() {
        return Err(AppError::BadRequest("Nama, email valid, dan password minimal 8 karakter wajib diisi".into()));
    }

    if body.role != "admin_1" && body.role != "admin_2" {
        return Err(AppError::BadRequest("Role harus bernilai 'admin_1' atau 'admin_2'".into()));
    }

    // Cek duplikasi email
    let existing: Option<Uuid> = sqlx::query_scalar("SELECT id FROM admins WHERE email = $1")
        .bind(&email)
        .fetch_optional(&pool)
        .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest("Email sudah digunakan oleh admin lain".into()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(body.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal hashing password: {}", e)))?
        .to_string();

    let new_admin = sqlx::query_as::<_, Admin>(
        r#"INSERT INTO admins (id, email, password_hash, name, role, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING *"#
    )
    .bind(Uuid::new_v4())
    .bind(&email)
    .bind(&hash)
    .bind(name)
    .bind(&body.role)
    .fetch_one(&pool)
    .await?;

    Ok(ok("Admin baru berhasil dibuat", AdminListItem {
        id: new_admin.id,
        email: new_admin.email,
        name: new_admin.name,
        role: new_admin.role,
        is_active: new_admin.is_active,
        created_at: new_admin.created_at,
        updated_at: new_admin.updated_at,
    }))
}

#[derive(Deserialize)]
pub struct UpdateAdminRequest {
    pub name: String,
    pub role: String,
    pub is_active: bool,
}

pub async fn admin_update_admin(
    State((pool, _config)): State<(PgPool, Config)>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateAdminRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let name = body.name.trim();
    if name.is_empty() {
        return Err(AppError::BadRequest("Nama tidak boleh kosong".into()));
    }

    let current_user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Token tidak valid".into()))?;

    // Validasi akun sendiri
    if current_user_id == id {
        if !body.is_active {
            return Err(AppError::BadRequest("Anda tidak dapat menonaktifkan akun Anda sendiri".into()));
        }
        if body.role != "super_admin" {
            return Err(AppError::BadRequest("Anda tidak dapat menurunkan role super_admin akun Anda sendiri".into()));
        }
    }

    let updated = sqlx::query_as::<_, Admin>(
        r#"UPDATE admins
           SET name = $1, role = $2, is_active = $3, updated_at = NOW()
           WHERE id = $4
           RETURNING *"#
    )
    .bind(name)
    .bind(&body.role)
    .bind(body.is_active)
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Admin tidak ditemukan".into()))?;

    Ok(ok("Data admin berhasil diperbarui", AdminListItem {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        is_active: updated.is_active,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
    }))
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub new_password: String,
}

pub async fn admin_reset_password(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    Json(body): Json<ResetPasswordRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    if body.new_password.len() < 8 {
        return Err(AppError::BadRequest("Password baru minimal 8 karakter".into()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(body.new_password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal hashing password: {}", e)))?
        .to_string();

    let result = sqlx::query(
        "UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2"
    )
    .bind(&hash)
    .bind(id)
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Admin tidak ditemukan".into()));
    }

    Ok(ok::<()>("Password admin berhasil direset", ()))
}

pub async fn admin_delete_admin(
    State((pool, _config)): State<(PgPool, Config)>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let current_user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Token tidak valid".into()))?;

    if current_user_id == id {
        return Err(AppError::BadRequest("Anda tidak dapat menghapus akun Anda sendiri".into()));
    }

    let result = sqlx::query("DELETE FROM admins WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Admin tidak ditemukan".into()));
    }

    Ok(ok::<()>("Akun admin berhasil dihapus", ()))
}
