use std::path::PathBuf;
use uuid::Uuid;
use crate::errors::AppError;

const ALLOWED_TYPES: &[&str] = &["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE: usize = 5 * 1024 * 1024; // 5 MB

/// Verifikasi signature magic bytes file gambar biner untuk mencegah file upload palsu / shell injection
fn detect_and_verify_image_magic_bytes(data: &[u8]) -> Result<&'static str, AppError> {
    if data.len() < 12 {
        return Err(AppError::BadRequest("File gambar rusak atau terlalu kecil".into()));
    }

    // JPEG: FF D8 FF
    if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Ok("jpg");
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if data.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        return Ok("png");
    }

    // WebP: RIFF .... WEBP
    if data.starts_with(b"RIFF") && &data[8..12] == b"WEBP" {
        return Ok("webp");
    }

    Err(AppError::BadRequest(
        "Format file tidak valid. Signature magic bytes tidak sesuai gambar JPEG, PNG, atau WebP.".into(),
    ))
}

pub async fn save_upload(
    upload_dir: &str,
    subfolder: &str,
    content_type: &str,
    data: &[u8],
) -> Result<String, AppError> {
    // 1. Validasi ukuran payload
    if data.len() > MAX_SIZE {
        return Err(AppError::BadRequest("Ukuran file terlalu besar. Maksimal 5 MB.".into()));
    }

    // 2. Validasi deklarasi header HTTP
    if !ALLOWED_TYPES.contains(&content_type) {
        return Err(AppError::BadRequest("Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.".into()));
    }

    // 3. Validasi magic bytes asli dari biner file untuk keamanan
    let ext = detect_and_verify_image_magic_bytes(data)?;

    // 4. Generate unique filename aman berbasis UUID
    let filename = format!("{}.{}", Uuid::new_v4(), ext);
    let dir = PathBuf::from(upload_dir).join(subfolder);
    std::fs::create_dir_all(&dir).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal membuat direktori upload: {}", e)))?;

    let file_path = dir.join(&filename);
    std::fs::write(&file_path, data).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menyimpan file: {}", e)))?;

    // Return public URL path
    Ok(format!("/uploads/{}/{}", subfolder, filename))
}
