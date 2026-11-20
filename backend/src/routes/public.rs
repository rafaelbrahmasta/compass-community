use axum::{Router, routing::{get, post}};
use sqlx::PgPool;
use crate::config::Config;
use crate::handlers;

pub fn public_routes(pool: PgPool, config: Config) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route("/carousel", get(handlers::carousel::get_active_slides))
        .route("/about", get(handlers::about::get_about))
        .route("/humanity", get(handlers::humanity::get_humanity))
        .route("/matches", get(handlers::matches::get_matches))
        .route("/matches/upcoming", get(handlers::matches::get_upcoming_matches))
        .route("/matches/:id/tickets", get(handlers::tickets::get_match_tickets))
        .route("/reminders", post(handlers::reminders::create_reminder))
        .route("/merch/categories", get(handlers::merch::get_categories))
        .route("/merch/products", get(handlers::merch::get_products))
        .route("/merch/products/:id", get(handlers::merch::get_product_detail))
        .route("/gallery/albums", get(handlers::gallery::get_albums))
        .route("/gallery/albums/:id/photos", get(handlers::gallery::get_album_photos))
        .route("/agendas", get(handlers::agendas::get_agendas))
        .route("/news", get(handlers::news::get_news_list))
        .route("/news/:slug", get(handlers::news::get_news_detail))
        .route("/settings", get(handlers::settings::get_public_settings))
        .route("/contact", post(handlers::contact::send_message))
        .route("/auth/login", post(handlers::auth::login))
        // Pembelian & Pengecekan Tiket Langsung (Revisi 6)
        .route("/tickets/buy", post(handlers::tickets_purchase::buy_ticket))
        .route("/tickets/check", get(handlers::tickets_purchase::check_ticket))
        .with_state((pool, config))
}
