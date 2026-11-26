use axum::{
    extract::DefaultBodyLimit,
    middleware::from_fn,
    routing::{delete, get, post, put},
    Router,
};
use sqlx::PgPool;
use crate::config::Config;
use crate::handlers;
use crate::middleware::{auth_middleware, require_any_admin, require_super_admin, require_admin_1_or_above};

pub fn admin_routes(pool: PgPool, config: Config) -> Router {
    // 1. Rute yang dapat diakses oleh semua admin (super_admin, admin_1, admin_2)
    // Berita, Hero Carousel, About Us/Pengurus, Sejarah, Agenda, Gallery, Merch, Pesan Kontak
    let content_routes = Router::new()
        // Auth me & password
        .route("/auth/me", get(handlers::auth::me))
        .route("/auth/password", put(handlers::auth::change_password))
        // Dashboard stats
        .route("/admin/dashboard", get(handlers::dashboard::get_stats))
        // Carousel
        .route("/admin/carousel", get(handlers::carousel::admin_get_slides))
        .route("/admin/carousel", post(handlers::carousel::create_slide))
        .route("/admin/carousel/:id", put(handlers::carousel::update_slide))
        .route("/admin/carousel/:id", delete(handlers::carousel::delete_slide))
        .route("/admin/carousel/:id/image", post(handlers::carousel::upload_slide_image))
        // About
        .route("/admin/about", put(handlers::about::update_about))
        .route("/admin/about/image", post(handlers::about::upload_about_image))
        .route("/admin/team-members", get(handlers::about::get_team_members))
        .route("/admin/team-members", post(handlers::about::create_team_member))
        .route("/admin/team-members/:id", put(handlers::about::update_team_member))
        .route("/admin/team-members/:id/photo", post(handlers::about::update_team_member_photo))
        .route("/admin/team-members/:id", delete(handlers::about::delete_team_member))
        // History
        .route("/admin/history", get(handlers::history::get_history))
        .route("/admin/history", post(handlers::history::create_history))
        .route("/admin/history/:id", put(handlers::history::update_history))
        .route("/admin/history/:id", delete(handlers::history::delete_history))
        // Matches (Jadwal Pertandingan)
        .route("/admin/matches", get(handlers::matches::admin_get_matches))
        .route("/admin/matches", post(handlers::matches::create_match))
        .route("/admin/matches/import-csv", post(handlers::matches::import_csv))
        .route("/admin/matches/:id", put(handlers::matches::update_match))
        .route("/admin/matches/:id", delete(handlers::matches::delete_match))
        // Merch Categories & Products
        .route("/admin/merch/categories", get(handlers::merch::admin_get_categories))
        .route("/admin/merch/categories", post(handlers::merch::create_category))
        .route("/admin/merch/categories/:id", put(handlers::merch::update_category))
        .route("/admin/merch/categories/:id", delete(handlers::merch::delete_category))
        .route("/admin/merch/products", get(handlers::merch::admin_get_products))
        .route("/admin/merch/products", post(handlers::merch::create_product))
        .route("/admin/merch/products/:id", put(handlers::merch::update_product))
        .route("/admin/merch/products/:id", delete(handlers::merch::delete_product))
        .route("/admin/merch/products/:id/images", post(handlers::merch::upload_product_image).layer(DefaultBodyLimit::max(50 * 1024 * 1024)))
        .route("/admin/merch/images/:id", delete(handlers::merch::delete_product_image))
        // Gallery
        .route("/admin/gallery/albums", get(handlers::gallery::admin_get_albums))
        .route("/admin/gallery/albums", post(handlers::gallery::create_album))
        .route("/admin/gallery/albums/:id", put(handlers::gallery::update_album))
        .route("/admin/gallery/albums/:id", delete(handlers::gallery::delete_album))
        .route("/admin/gallery/albums/:id/photos", post(handlers::gallery::upload_photos).layer(DefaultBodyLimit::max(50 * 1024 * 1024)))
        .route("/admin/gallery/photos/:id", delete(handlers::gallery::delete_photo))
        // Agendas
        .route("/admin/agendas", get(handlers::agendas::admin_get_agendas))
        .route("/admin/agendas", post(handlers::agendas::create_agenda))
        .route("/admin/agendas/:id", put(handlers::agendas::update_agenda))
        .route("/admin/agendas/:id", delete(handlers::agendas::delete_agenda))
        // News
        .route("/admin/news", get(handlers::news::admin_get_news))
        .route("/admin/news", post(handlers::news::create_news))
        .route("/admin/news/:id", put(handlers::news::update_news))
        .route("/admin/news/:id", delete(handlers::news::delete_news))
        .route("/admin/news/:id/thumbnail", post(handlers::news::upload_thumbnail))
        // Contact Messages
        .route("/admin/contact-messages", get(handlers::contact::get_messages))
        .route("/admin/contact-messages/:id/read", put(handlers::contact::mark_read))
        .route_layer(from_fn(require_any_admin));

    // 2. Rute Khusus SUPER_ADMIN
    // Dilarang untuk admin_1 dan admin_2:
    // - Kelola Admin
    // - Kelola Anggota
    // - Pembayaran/Pesanan Tiket & Check-in
    // - Tiket (kategori, harga, kuota)
    // - Pengaturan Situs
    // - Compass for Humanity (QR donasi dan rekening)
    // - Data Reminder
    let super_admin_routes = Router::new()
        // Kelola Admin (hanya super_admin)
        .route("/admin/admins", get(handlers::admin_admins::admin_list_admins))
        .route("/admin/admins", post(handlers::admin_admins::admin_create_admin))
        .route("/admin/admins/:id", put(handlers::admin_admins::admin_update_admin))
        .route("/admin/admins/:id", delete(handlers::admin_admins::admin_delete_admin))
        .route("/admin/admins/:id/reset-password", put(handlers::admin_admins::admin_reset_password))
        // Kelola Anggota
        .route("/admin/members", get(handlers::members::admin_get_members))
        .route("/admin/members", post(handlers::members::admin_create_member))
        .route("/admin/members/export-csv", get(handlers::members::admin_export_csv))
        .route("/admin/members/import-csv", post(handlers::members::admin_import_csv))
        .route("/admin/members/:id", get(handlers::members::admin_get_member_by_id))
        .route("/admin/members/:id", put(handlers::members::admin_update_member))
        .route("/admin/members/:id", delete(handlers::members::admin_delete_member))
        .route("/admin/members/:id/reset-pin", put(handlers::members::admin_reset_member_pin))
        // Pembayaran & Pesanan Tiket
        .route("/admin/tickets", get(handlers::admin_tickets::admin_list_tickets))
        .route("/admin/tickets/export-csv", get(handlers::admin_tickets::admin_export_tickets_csv))
        .route("/admin/tickets/:id/status", put(handlers::admin_tickets::admin_update_ticket_status))
        .route("/admin/tickets/:id/proof", get(handlers::admin_tickets::admin_get_ticket_proof))
        // Tiket Kategori Pertandingan
        .route("/admin/matches/:id/tickets", get(handlers::tickets::admin_get_tickets))
        .route("/admin/matches/:id/tickets", post(handlers::tickets::create_ticket))
        .route("/admin/matches/:id/tickets/:tid", put(handlers::tickets::update_ticket))
        .route("/admin/matches/:id/tickets/:tid", delete(handlers::tickets::delete_ticket))
        // Humanity (QR donasi dan rekening)
        .route("/admin/humanity", get(handlers::humanity::admin_get_humanity))
        .route("/admin/humanity", put(handlers::humanity::update_humanity))
        .route("/admin/humanity/qr", post(handlers::humanity::upload_qr))
        // Rekening Khusus Pembayaran Tiket (terpisah dari donasi kemanusiaan)
        .route("/admin/ticket-bank-settings", get(handlers::admin_tickets::admin_get_ticket_bank_settings))
        .route("/admin/ticket-bank-settings", put(handlers::admin_tickets::admin_update_ticket_bank_settings))
        // Reminders
        .route("/admin/reminders", get(handlers::reminders::admin_get_reminders))
        // Pengaturan Situs
        .route("/admin/settings", get(handlers::settings::admin_get_settings))
        .route("/admin/settings", put(handlers::settings::update_settings))
        .route("/admin/settings/logo", post(handlers::settings::upload_logo))
        .route_layer(from_fn(require_super_admin));

    // Bug 12: check-in bisa dilakukan admin_1 dan super_admin (bukan hanya super_admin)
    let checkin_routes = Router::new()
        .route("/admin/tickets/checkin", post(handlers::admin_tickets::admin_checkin_ticket))
        .route_layer(from_fn(require_admin_1_or_above));

    // Gabungkan kedua sub-router dan lindungi dengan auth_middleware utama
    Router::new()
        .merge(content_routes)
        .merge(super_admin_routes)
        .merge(checkin_routes)
        .route_layer(from_fn(auth_middleware))
        .with_state((pool, config))
}
