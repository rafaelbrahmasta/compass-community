use std::path::PathBuf;
use uuid::Uuid;
use crate::errors::AppError;
use crate::config::Config;

const ALLOWED_TYPES: &[&str] = &["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE: usize = 5 * 1024 * 1024; // 5 MB

/// Verifikasi signature magic bytes file gambar biner untuk mencegah file upload palsu / shell injection
pub fn detect_and_verify_image_magic_bytes(data: &[u8]) -> Result<&'static str, AppError> {
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

/// Upload gambar — otomatis memilih Supabase Storage jika dikonfigurasi, atau lokal sebagai fallback.
/// Mengembalikan URL publik yang bisa langsung dipakai di frontend.
pub async fn save_upload(
    config: &Config,
    subfolder: &str,
    content_type: &str,
    data: &[u8],
) -> Result<String, AppError> {
    if !config.supabase_url.is_empty() && !config.supabase_service_key.is_empty() {
        // Gunakan Supabase Storage
        super::storage::storage_upload(
            &config.supabase_url,
            &config.supabase_service_key,
            &config.supabase_bucket,
            subfolder,
            content_type,
            data,
        )
        .await
    } else {
        // Fallback ke penyimpanan lokal
        save_local(&config.upload_dir, subfolder, content_type, data).await
    }
}

/// Upload bukti transfer ke bucket privat — otomatis memilih Supabase Storage atau lokal.
pub async fn save_private_upload(
    config: &Config,
    subfolder: &str,
    content_type: &str,
    data: &[u8],
) -> Result<String, AppError> {
    if !config.supabase_url.is_empty() && !config.supabase_service_key.is_empty() {
        // Gunakan bucket privat Supabase
        super::storage::storage_upload_private(
            &config.supabase_url,
            &config.supabase_service_key,
            &config.supabase_private_bucket,
            subfolder,
            content_type,
            data,
        )
        .await
    } else {
        // Fallback ke penyimpanan lokal privat
        save_local_private(&config.upload_dir, subfolder, content_type, data).await
    }
}

/// Hapus file lama (mendukung Supabase URL maupun path lokal)
pub async fn delete_file(config: &Config, file_ref: &str) -> Result<(), AppError> {
    if file_ref.is_empty() {
        return Ok(());
    }
    if !config.supabase_url.is_empty() && !config.supabase_service_key.is_empty() {
        super::storage::storage_delete(&config.supabase_url, &config.supabase_service_key, file_ref).await
    } else {
        // Hapus file lokal
        delete_local_file(&config.upload_dir, file_ref).await
    }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async fn save_local(
    upload_dir: &str,
    subfolder: &str,
    content_type: &str,
    data: &[u8],
) -> Result<String, AppError> {
    if data.len() > MAX_SIZE {
        return Err(AppError::BadRequest("Ukuran file terlalu besar. Maksimal 5 MB.".into()));
    }
    if !ALLOWED_TYPES.contains(&content_type) {
        return Err(AppError::BadRequest("Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.".into()));
    }
    let ext = detect_and_verify_image_magic_bytes(data)?;
    let filename = format!("{}.{}", Uuid::new_v4(), ext);
    let dir = PathBuf::from(upload_dir).join(subfolder);
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal membuat direktori upload: {}", e)))?;
    tokio::fs::write(dir.join(&filename), data)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menyimpan file: {}", e)))?;
    Ok(format!("/uploads/{}/{}", subfolder, filename))
}

async fn save_local_private(
    upload_dir: &str,
    subfolder: &str,
    content_type: &str,
    data: &[u8],
) -> Result<String, AppError> {
    if data.len() > MAX_SIZE {
        return Err(AppError::BadRequest("Ukuran file terlalu besar. Maksimal 5 MB.".into()));
    }
    if !ALLOWED_TYPES.contains(&content_type) {
        return Err(AppError::BadRequest("Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.".into()));
    }
    let ext = detect_and_verify_image_magic_bytes(data)?;
    let filename = format!("{}.{}", Uuid::new_v4(), ext);
    let dir = PathBuf::from(format!("{}_private", upload_dir)).join(subfolder);
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal membuat direktori upload privat: {}", e)))?;
    tokio::fs::write(dir.join(&filename), data)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menyimpan file privat: {}", e)))?;
    Ok(format!("/uploads_private/{}/{}", subfolder, filename))
}

async fn delete_local_file(upload_dir: &str, file_ref: &str) -> Result<(), AppError> {
    // file_ref bisa "/uploads/proof/xxx.jpg" atau "/uploads_private/proof/xxx.jpg"
    let path = if file_ref.starts_with("/uploads_private/") {
        let rel = file_ref.trim_start_matches("/uploads_private/");
        PathBuf::from(format!("{}_private", upload_dir)).join(rel)
    } else if file_ref.starts_with("/uploads/") {
        let rel = file_ref.trim_start_matches("/uploads/");
        PathBuf::from(upload_dir).join(rel)
    } else {
        return Ok(());
    };
    if path.exists() {
        tokio::fs::remove_file(&path).await.ok();
    }
    Ok(())
}
