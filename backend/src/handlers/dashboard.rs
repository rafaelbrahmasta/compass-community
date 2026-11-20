use axum::extract::State;
use sqlx::PgPool;
use crate::config::Config;
use crate::errors::{AppResult, ok};

pub async fn get_stats(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let total_news: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM news WHERE status = 'published'")
        .fetch_one(&pool).await.unwrap_or(0);

    let total_products: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM merch_products")
        .fetch_one(&pool).await.unwrap_or(0);

    let active_reminders: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM reminders WHERE email_sent = false")
        .fetch_one(&pool).await.unwrap_or(0);

    let unread_messages: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM contact_messages WHERE is_read = false")
        .fetch_one(&pool).await.unwrap_or(0);

    let next_match = sqlx::query_as::<_, crate::models::Match>(
        "SELECT * FROM matches WHERE status = 'upcoming' AND match_date >= CURRENT_DATE ORDER BY match_date ASC, match_time ASC LIMIT 1"
    ).fetch_optional(&pool).await.ok().flatten();

    Ok(ok("Statistik dashboard", serde_json::json!({
        "total_news": total_news,
        "total_products": total_products,
        "active_reminders": active_reminders,
        "unread_messages": unread_messages,
        "next_match": next_match,
    })))
}
