use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use crate::{errors::AppError, utils::jwt::Claims};

/// Middleware: hanya izinkan super_admin
pub async fn require_super_admin(
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    require_roles_inner(&request, &["super_admin"])?;
    Ok(next.run(request).await)
}

/// Middleware: izinkan super_admin, admin_1, admin_2 (semua role)
pub async fn require_any_admin(
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    require_roles_inner(&request, &["super_admin", "admin_1", "admin_2"])?;
    Ok(next.run(request).await)
}

/// Middleware: izinkan super_admin dan admin_1
pub async fn require_admin_1_or_above(
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    require_roles_inner(&request, &["super_admin", "admin_1"])?;
    Ok(next.run(request).await)
}

fn require_roles_inner(request: &Request, allowed_roles: &[&str]) -> Result<(), AppError> {
    let claims = request
        .extensions()
        .get::<Claims>()
        .ok_or_else(|| AppError::Unauthorized("Token tidak ditemukan".into()))?;

    if !allowed_roles.contains(&claims.role.as_str()) {
        return Err(AppError::Forbidden(
            format!("Akses ditolak. Role '{}' tidak memiliki izin untuk operasi ini.", claims.role)
        ));
    }
    Ok(())
}
