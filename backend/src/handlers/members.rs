use axum::{
    extract::{Path, Query, State},
    response::Response,
    http::header,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::Member;

#[derive(Deserialize)]
pub struct MemberQuery {
    pub q: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MemberWithTicketCount {
    pub id: Uuid,
    pub member_code: String,
    pub full_name: String,
    pub phone: String,
    pub email: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub ticket_count: i64,
}

pub async fn admin_get_members(
    State((pool, _config)): State<(PgPool, Config)>,
    Query(params): Query<MemberQuery>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(15).max(1).min(100);
    let offset = (page - 1) * per_page;
    let search = params.q.map(|s| format!("%{}%", s.trim()));

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM members
           WHERE ($1::text IS NULL OR (
               member_code ILIKE $1 OR
               full_name ILIKE $1 OR
               phone ILIKE $1 OR
               COALESCE(email, '') ILIKE $1
           ))"#
    )
    .bind(&search)
    .fetch_one(&pool)
    .await?;

    let members = sqlx::query_as::<_, MemberWithTicketCount>(
        r#"SELECT m.id, m.member_code, m.full_name, m.phone, m.email, m.is_active,
                  m.created_at, m.updated_at,
                  COALESCE(COUNT(tp.id), 0) AS ticket_count
           FROM members m
           LEFT JOIN ticket_purchases tp ON tp.member_id = m.id AND tp.status != 'dibatalkan'
           WHERE ($1::text IS NULL OR (
               m.member_code ILIKE $1 OR
               m.full_name ILIKE $1 OR
               m.phone ILIKE $1 OR
               COALESCE(m.email, '') ILIKE $1
           ))
           GROUP BY m.id
           ORDER BY m.created_at DESC
           LIMIT $2 OFFSET $3"#
    )
    .bind(&search)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&pool)
    .await?;

    Ok(ok("Daftar anggota", serde_json::json!({
        "items": members,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total as f64 / per_page as f64).ceil() as i64
    })))
}

pub async fn admin_get_member_by_id(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let member = sqlx::query_as::<_, MemberWithTicketCount>(
        r#"SELECT m.id, m.member_code, m.full_name, m.phone, m.email, m.is_active,
                  m.created_at, m.updated_at,
                  COALESCE(COUNT(tp.id), 0) AS ticket_count
           FROM members m
           LEFT JOIN ticket_purchases tp ON tp.member_id = m.id AND tp.status != 'dibatalkan'
           WHERE m.id = $1
           GROUP BY m.id"#
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Anggota tidak ditemukan".into()))?;

    Ok(ok("Detail anggota", member))
}

#[derive(Deserialize)]
pub struct CreateMemberRequest {
    pub full_name: String,
    pub phone: String,
    pub email: Option<String>,
    pub is_active: Option<bool>,
}

pub async fn admin_create_member(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<CreateMemberRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let full_name = body.full_name.trim();
    let phone = body.phone.trim();
    if full_name.is_empty() || phone.is_empty() {
        return Err(AppError::BadRequest("Nama lengkap dan nomor HP wajib diisi".into()));
    }

    // Generate member_code from sequence
    let seq_val: i64 = sqlx::query_scalar("SELECT nextval('member_code_seq')")
        .fetch_one(&pool)
        .await?;
    let member_code = format!("CMP-{:04}", seq_val);

    let member = sqlx::query_as::<_, Member>(
        r#"INSERT INTO members (id, member_code, full_name, phone, email, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *"#
    )
    .bind(Uuid::new_v4())
    .bind(&member_code)
    .bind(full_name)
    .bind(phone)
    .bind(body.email.as_deref().map(|s| s.trim()))
    .bind(body.is_active.unwrap_or(true))
    .fetch_one(&pool)
    .await?;

    Ok(ok("Anggota berhasil didaftarkan", member))
}

#[derive(Deserialize)]
pub struct UpdateMemberRequest {
    pub full_name: String,
    pub phone: String,
    pub email: Option<String>,
    pub is_active: bool,
}

pub async fn admin_update_member(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateMemberRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let full_name = body.full_name.trim();
    let phone = body.phone.trim();
    if full_name.is_empty() || phone.is_empty() {
        return Err(AppError::BadRequest("Nama lengkap dan nomor HP wajib diisi".into()));
    }

    let member = sqlx::query_as::<_, Member>(
        r#"UPDATE members
           SET full_name = $1, phone = $2, email = $3, is_active = $4, updated_at = NOW()
           WHERE id = $5
           RETURNING *"#
    )
    .bind(full_name)
    .bind(phone)
    .bind(body.email.as_deref().map(|s| s.trim()))
    .bind(body.is_active)
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Anggota tidak ditemukan".into()))?;

    Ok(ok("Data anggota berhasil diperbarui", member))
}

pub async fn admin_delete_member(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Cek apakah anggota punya tiket
    let ticket_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ticket_purchases WHERE member_id = $1"
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    if ticket_count > 0 {
        return Err(AppError::BadRequest(
            "Tidak dapat menghapus anggota yang memiliki riwayat tiket. Silakan nonaktifkan akun anggota ini.".into()
        ));
    }

    let result = sqlx::query("DELETE FROM members WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Anggota tidak ditemukan".into()));
    }

    Ok(ok::<()>("Anggota berhasil dihapus", ()))
}

#[derive(Deserialize)]
pub struct ImportCsvRequest {
    pub csv_content: String,
}

pub async fn admin_import_csv(
    State((pool, _config)): State<(PgPool, Config)>,
    Json(body): Json<ImportCsvRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(body.csv_content.as_bytes());

    let mut success_count = 0;
    let mut error_rows: Vec<String> = Vec::new();

    for (index, result) in reader.records().enumerate() {
        match result {
            Ok(record) => {
                if record.len() < 2 {
                    error_rows.push(format!("Baris {}: Format tidak lengkap (minimal nama dan nomor HP)", index + 2));
                    continue;
                }
                let full_name = record.get(0).unwrap_or("").trim();
                let phone = record.get(1).unwrap_or("").trim();
                let email = record.get(2).map(|s| s.trim()).filter(|s| !s.is_empty());

                if full_name.is_empty() || phone.is_empty() {
                    error_rows.push(format!("Baris {}: Nama atau nomor HP kosong", index + 2));
                    continue;
                }

                let seq_val_res: Result<i64, _> = sqlx::query_scalar("SELECT nextval('member_code_seq')")
                    .fetch_one(&pool)
                    .await;

                let seq_val = match seq_val_res {
                    Ok(val) => val,
                    Err(e) => {
                        error_rows.push(format!("Baris {}: Gagal generate kode: {}", index + 2, e));
                        continue;
                    }
                };
                let member_code = format!("CMP-{:04}", seq_val);

                let insert_res = sqlx::query(
                    r#"INSERT INTO members (id, member_code, full_name, phone, email, is_active)
                       VALUES ($1, $2, $3, $4, $5, true)"#
                )
                .bind(Uuid::new_v4())
                .bind(&member_code)
                .bind(full_name)
                .bind(phone)
                .bind(email)
                .execute(&pool)
                .await;

                match insert_res {
                    Ok(_) => success_count += 1,
                    Err(e) => error_rows.push(format!("Baris {}: {}", index + 2, e)),
                }
            }
            Err(e) => {
                error_rows.push(format!("Baris {}: Gagal membaca CSV: {}", index + 2, e));
            }
        }
    }

    Ok(ok("Proses impor selesai", serde_json::json!({
        "success_count": success_count,
        "error_count": error_rows.len(),
        "errors": error_rows,
    })))
}

fn sanitize_csv_field(val: &str) -> String {
    let trimmed = val.trim();
    if trimmed.starts_with('=') || trimmed.starts_with('+') || trimmed.starts_with('-') || trimmed.starts_with('@') {
        format!("'{}", trimmed)
    } else {
        trimmed.to_string()
    }
}

pub async fn admin_export_csv(
    State((pool, _config)): State<(PgPool, Config)>,
) -> Result<Response, AppError> {
    let members = sqlx::query_as::<_, MemberWithTicketCount>(
        r#"SELECT m.id, m.member_code, m.full_name, m.phone, m.email, m.is_active,
                  m.created_at, m.updated_at,
                  COALESCE(COUNT(tp.id), 0) AS ticket_count
           FROM members m
           LEFT JOIN ticket_purchases tp ON tp.member_id = m.id AND tp.status != 'dibatalkan'
           GROUP BY m.id
           ORDER BY m.member_code ASC"#
    )
    .fetch_all(&pool)
    .await?;

    let mut wtr = csv::Writer::from_writer(vec![]);
    wtr.write_record(&[
        "Kode Anggota",
        "Nama Lengkap",
        "Nomor HP",
        "Email",
        "Status",
        "Jumlah Tiket",
        "Tanggal Terdaftar",
    ]).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menulis header CSV: {}", e)))?;

    for m in members {
        wtr.write_record(&[
            sanitize_csv_field(&m.member_code),
            sanitize_csv_field(&m.full_name),
            sanitize_csv_field(&m.phone),
            sanitize_csv_field(&m.email.unwrap_or_default()),
            if m.is_active { "Aktif".to_string() } else { "Nonaktif".to_string() },
            m.ticket_count.to_string(),
            m.created_at.format("%Y-%m-%d %H:%M:%S").to_string(),
        ]).map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal menulis data CSV: {}", e)))?;
    }

    let csv_data = wtr.into_inner()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal finalize CSV: {}", e)))?;

    let response = Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(header::CONTENT_DISPOSITION, "attachment; filename=\"data-anggota-compass.csv\"")
        .body(axum::body::Body::from(csv_data))
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Gagal response CSV: {}", e)))?;

    Ok(response)
}
