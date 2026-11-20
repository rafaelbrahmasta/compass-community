use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
    http::header::AUTHORIZATION,
};
use crate::{errors::AppError, utils::jwt::verify_token};

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

    // Cek apakah admin is_active (role dibawa di claims, is_active perlu dicek dari DB)
    // Untuk efisiensi, cek is_active hanya di endpoint sensitif. Di sini kita trust claims.
    // Middleware role diimplementasikan terpisah.

    request.extensions_mut().insert(claims);
    Ok(next.run(request).await)
}
