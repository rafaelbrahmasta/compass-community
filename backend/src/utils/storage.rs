/// Supabase Storage client wrapper
/// Menggunakan REST API Supabase Storage (S3-compatible via HTTP)
/// Docs: https://supabase.com/docs/reference/api/storage
use crate::errors::AppError;
use uuid::Uuid;

use super::upload::detect_and_verify_image_magic_bytes;

const MAX_SIZE: usize = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: &[&str] = &["image/jpeg", "image/png", "image/webp"];

/// Upload file ke Supabase Storage bucket (bucket publik)
/// Mengembalikan public URL dari file yang di-upload.
pub async fn storage_upload(
    supabase_url: &str,
    service_key: &str,
    bucket: &str,
    subfolder: &str,
    content_type: &str,
    data: &[u8],
) -> Result<String, AppError> {
    // Validasi ukuran
    if data.len() > MAX_SIZE {
        return Err(AppError::BadRequest("Ukuran file terlalu besar. Maksimal 5 MB.".into()));
    }
    // Validasi content-type
    if !ALLOWED_TYPES.contains(&content_type) {
        return Err(AppError::BadRequest("Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.".into()));
    }
    // Validasi magic bytes
    let ext = detect_and_verify_image_magic_bytes(data)?;
    let filename = format!("{}.{}", Uuid::new_v4(), ext);
    let object_path = format!("{}/{}", subfolder, filename);

    // Jika Supabase tidak dikonfigurasi, fallback ke penyimpanan lokal
    if supabase_url.is_empty() || service_key.is_empty() {
        return Err(AppError::Internal(anyhow::anyhow!(
            "SUPABASE_URL dan SUPABASE_SERVICE_KEY belum dikonfigurasi"
        )));
    }

    let upload_url = format!(
        "{}/storage/v1/object/{}/{}",
        supabase_url.trim_end_matches('/'),
        bucket,
        object_path
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&upload_url)
        .header("Authorization", format!("Bearer {}", service_key))
        .header("Content-Type", content_type)
        .header("x-upsert", "true") // overwrite jika sudah ada
        .body(data.to_vec())
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal upload ke Supabase Storage: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!(
            "Supabase Storage error {}: {}",
            status,
            body
        )));
    }

    // Public URL untuk bucket publik
    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        supabase_url.trim_end_matches('/'),
        bucket,
        object_path
    );

    Ok(public_url)
}

/// Upload file ke bucket PRIVAT Supabase Storage.
/// Mengembalikan path object (bukan public URL) — akses via signed URL atau service key.
pub async fn storage_upload_private(
    supabase_url: &str,
    service_key: &str,
    bucket: &str,
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
    let object_path = format!("{}/{}", subfolder, filename);

    if supabase_url.is_empty() || service_key.is_empty() {
        return Err(AppError::Internal(anyhow::anyhow!(
            "SUPABASE_URL dan SUPABASE_SERVICE_KEY belum dikonfigurasi"
        )));
    }

    let upload_url = format!(
        "{}/storage/v1/object/{}/{}",
        supabase_url.trim_end_matches('/'),
        bucket,
        object_path
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&upload_url)
        .header("Authorization", format!("Bearer {}", service_key))
        .header("Content-Type", content_type)
        .header("x-upsert", "true")
        .body(data.to_vec())
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal upload ke Supabase Private Storage: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!(
            "Supabase Storage error {}: {}",
            status,
            body
        )));
    }

    // Simpan path object saja (bukan public URL) untuk bucket privat
    Ok(format!("supabase-private://{}/{}", bucket, object_path))
}

/// Hapus file dari Supabase Storage berdasarkan path object.
/// path: format "supabase-private://bucket/subfolder/file.jpg" atau public URL Supabase
pub async fn storage_delete(
    supabase_url: &str,
    service_key: &str,
    file_ref: &str,
) -> Result<(), AppError> {
    if supabase_url.is_empty() || service_key.is_empty() || file_ref.is_empty() {
        return Ok(()); // tidak ada yang perlu dihapus
    }

    // Parse bucket & path dari referensi
    let (bucket, object_path) = if file_ref.starts_with("supabase-private://") {
        // "supabase-private://bucket/path/to/file.jpg"
        let rest = file_ref.trim_start_matches("supabase-private://");
        if let Some(slash) = rest.find('/') {
            (rest[..slash].to_string(), rest[slash + 1..].to_string())
        } else {
            return Ok(());
        }
    } else if file_ref.contains("/storage/v1/object/public/") {
        // Public URL: https://xxx.supabase.co/storage/v1/object/public/bucket/path
        let after = file_ref.split("/storage/v1/object/public/").nth(1).unwrap_or("");
        if let Some(slash) = after.find('/') {
            (after[..slash].to_string(), after[slash + 1..].to_string())
        } else {
            return Ok(());
        }
    } else {
        return Ok(()); // format tidak dikenal, skip
    };

    let delete_url = format!(
        "{}/storage/v1/object/{}/{}",
        supabase_url.trim_end_matches('/'),
        bucket,
        object_path
    );

    let client = reqwest::Client::new();
    let _ = client
        .delete(&delete_url)
        .header("Authorization", format!("Bearer {}", service_key))
        .send()
        .await; // abaikan error delete (file mungkin sudah tidak ada)

    Ok(())
}

/// Buat signed URL untuk mengakses file privat (berlaku 60 menit)
pub async fn storage_create_signed_url(
    supabase_url: &str,
    service_key: &str,
    file_ref: &str,
    expires_in_secs: u64,
) -> Result<String, AppError> {
    // Parse bucket & path
    let (bucket, object_path) = if file_ref.starts_with("supabase-private://") {
        let rest = file_ref.trim_start_matches("supabase-private://");
        if let Some(slash) = rest.find('/') {
            (rest[..slash].to_string(), rest[slash + 1..].to_string())
        } else {
            return Err(AppError::BadRequest("Referensi file tidak valid".into()));
        }
    } else {
        return Err(AppError::BadRequest("Hanya file privat yang memerlukan signed URL".into()));
    };

    let sign_url = format!(
        "{}/storage/v1/object/sign/{}/{}",
        supabase_url.trim_end_matches('/'),
        bucket,
        object_path
    );

    let client = reqwest::Client::new();
    let body = serde_json::json!({ "expiresIn": expires_in_secs });
    let resp = client
        .post(&sign_url)
        .header("Authorization", format!("Bearer {}", service_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal buat signed URL: {}", e)))?;

    if !resp.status().is_success() {
        let txt = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(anyhow::anyhow!("Signed URL error: {}", txt)));
    }

    let json: serde_json::Value = resp.json().await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Parse signed URL response error: {}", e)))?;

    let signed_url = json["signedURL"]
        .as_str()
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("signedURL tidak ada di response")))?;

    // Signed URL biasanya path relatif, tambahkan base URL
    if signed_url.starts_with("http") {
        Ok(signed_url.to_string())
    } else {
        Ok(format!(
            "{}/storage/v1{}",
            supabase_url.trim_end_matches('/'),
            signed_url
        ))
    }
}
