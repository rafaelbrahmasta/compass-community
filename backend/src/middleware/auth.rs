use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
    http::header::AUTHORIZATION,
};
use anyhow;
use crate::{errors::AppError, utils::jwt::verify_token};
use sqlx::PgPool;

pub async fn auth_middleware(
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Header Authorization tidak ditemukan".into()))?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized("Format token harus 'Bearer <token>'".into()));
    }

    let token = &auth_header[7..];
    let claims = verify_token(token)
        .map_err(|_| AppError::Unauthorized("Token tidak valid atau sudah kedaluwarsa".into()))?;

    // Cek is_active dan role admin dari database untuk keamanan
    // Admin yang dinonaktifkan atau memiliki role yang tidak valid tetap bisa
    // mengakses API sampai tokennya habis (24 jam) tanpa pengecekan ini.
    // Kita perlu koneksi pool untuk cek DB - gunakan extract::State.
    let pool = request
        .extensions()
        .get::<PgPool>()
        .cloned()
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("Database pool tidak tersedia")))?;

    let admin_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("ID admin tidak valid".into()))?;

    let admin = sqlx::query_as::<_, crate::models::Admin>("SELECT * FROM admins WHERE id = $1")
        .bind(admin_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| anyhow::anyhow!("Gagal cek DB: {}", e))?;

    if let Some(admin) = admin {
        if !admin.is_active {
            return Err(AppError::Forbidden("Akun admin ini telah dinonaktifkan. Silakan hubungi super admin.".into()));
        }
        // Simpan is_active ke claims extension agar bisa dipakai di middleware lain
        request.extensions_mut().insert(admin);
    } else {
        return Err(AppError::NotFound("Data admin tidak ditemukan di database".into()));
    }

    request.extensions_mut().insert(claims);
    Ok(next.run(request).await)
}
