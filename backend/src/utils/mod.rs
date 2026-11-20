use std::path::Path;
use uuid::Uuid;
use axum::body::Bytes;

pub mod jwt;
pub mod upload;
pub mod slug;

pub use upload::save_upload;
pub use slug::to_slug;
