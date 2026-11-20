use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// ===== ADMIN =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Admin {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub name: String,
    pub role: String,       // super_admin | admin_1 | admin_2
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ===== CAROUSEL =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct CarouselSlide {
    pub id: Uuid,
    pub image_url: String,
    pub title: String,
    pub subtitle: String,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

// ===== ABOUT =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct AboutContent {
    pub id: Uuid,
    pub section: String,
    pub content: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct TeamMember {
    pub id: Uuid,
    pub name: String,
    pub position: String,
    pub photo_url: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

// ===== HISTORY =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct HistoryTimeline {
    pub id: Uuid,
    pub year: i32,
    pub title: String,
    pub description: String,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

// ===== HUMANITY =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct HumanitySettings {
    pub id: Uuid,
    pub program_text: String,
    pub qr_image_url: Option<String>,
    pub bank_name: String,
    pub account_name: String,
    pub account_number: String,
    pub updated_at: DateTime<Utc>,
}

// ===== MATCHES =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Match {
    pub id: Uuid,
    pub opponent_name: String,
    pub opponent_logo_url: Option<String>,
    pub match_date: chrono::NaiveDate,
    pub match_time: chrono::NaiveTime,
    pub stadium: String,
    pub home_away: String,
    pub competition: String,
    pub home_score: Option<i32>,
    pub away_score: Option<i32>,
    pub status: String,
    pub ticket_form_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ===== TICKET CATEGORIES =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct TicketCategory {
    pub id: Uuid,
    pub match_id: Uuid,
    pub name: String,
    pub price: rust_decimal::Decimal,
    pub quota: i32,
    pub sold: i32,
    pub created_at: DateTime<Utc>,
}

// ===== MEMBERS (anggota komunitas) =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Member {
    pub id: Uuid,
    pub member_code: String,
    pub full_name: String,
    pub phone: String,
    pub email: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ===== TICKET PURCHASES =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct TicketPurchase {
    pub id: Uuid,
    pub ticket_code: String,
    pub member_id: Uuid,
    pub match_id: Uuid,
    pub category_id: Uuid,
    pub price: rust_decimal::Decimal,
    pub status: String,
    pub qr_payload: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
    pub checked_in_at: Option<DateTime<Utc>>,
    pub expires_at: DateTime<Utc>,
}

// ===== REMINDERS =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Reminder {
    pub id: Uuid,
    pub match_id: Uuid,
    pub email: String,
    pub whatsapp: Option<String>,
    pub remind_before: String,
    pub email_sent: bool,
    pub scheduled_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

// ===== MERCH =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct MerchCategory {
    pub id: Uuid,
    pub name: String,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct MerchProduct {
    pub id: Uuid,
    pub category_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub price: rust_decimal::Decimal,
    pub sizes: Option<String>,
    pub stock_status: String,
    pub order_form_url: Option<String>,
    pub is_active: bool,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct MerchImage {
    pub id: Uuid,
    pub product_id: Uuid,
    pub image_url: String,
    pub is_primary: bool,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

// ===== GALLERY =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct GalleryAlbum {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub event_date: Option<chrono::NaiveDate>,
    pub is_published: bool,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct GalleryPhoto {
    pub id: Uuid,
    pub album_id: Uuid,
    pub image_url: String,
    pub caption: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

// ===== AGENDA =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Agenda {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub event_date: chrono::NaiveDate,
    pub event_time: Option<chrono::NaiveTime>,
    pub location: Option<String>,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
}

// ===== NEWS =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct News {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub thumbnail_url: Option<String>,
    pub author: Option<String>,
    pub is_published: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

// ===== CONTACT MESSAGES =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct ContactMessage {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub subject: String,
    pub message: String,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

// ===== SITE SETTINGS =====
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct SiteSetting {
    pub id: Uuid,
    pub key: String,
    pub value: String,
    pub updated_at: DateTime<Utc>,
}
