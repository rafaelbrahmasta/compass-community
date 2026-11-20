use std::path::PathBuf;
use uuid::Uuid;
use crate::errors::AppError;

const ALLOWED_TYPES: &[&str] = &["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE: usize = 5 * 1024 * 1024; // 5 MB

pub async fn save_upload(
    upload_dir: &str,
    subfolder: &str,
    content_type: &str,
    data: &[u8],
) -> Result<String, AppError> {
    // Validate type
    if !ALLOWED_TYPES.contains(&content_type) {
        return Err(AppError::BadRequest("Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.".into()));
    }

    // Validate size
    if data.len() > MAX_SIZE {
        return Err(AppError::BadRequest("Ukuran file terlalu besar. Maksimal 5 MB.".into()));
    }

    // Determine extension
    let ext = match content_type {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "jpg",
    };

    // Generate unique filename
    let filename = format!("{}.{}", Uuid::new_v4(), ext);
    let dir = PathBuf::from(upload_dir).join(subfolder);
    std::fs::create_dir_all(&dir).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal membuat direktori upload: {}", e)))?;

    let file_path = dir.join(&filename);
    std::fs::write(&file_path, data).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menyimpan file: {}", e)))?;

    // Return public URL path
    Ok(format!("/uploads/{}/{}", subfolder, filename))
}
