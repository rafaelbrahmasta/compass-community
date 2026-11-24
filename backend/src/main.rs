use axum::Router;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::{
    cors::{CorsLayer, Any},
    trace::TraceLayer,
    services::ServeDir,
};
use axum::extract::DefaultBodyLimit;
use axum::middleware::from_fn;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod errors;
mod middleware;
mod models;
mod routes;
mod handlers;
mod services;
mod utils;
mod scheduler;

pub use config::Config;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env
    dotenvy::dotenv().ok();

    // Init tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "compass_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let config = Config::from_env()?;

    // Connect DB
    let pool = db::create_pool(&config.database_url).await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("Migrasi database selesai");

    // Run seeder
    services::seeder::run_seeder(&pool, &config).await?;
    tracing::info!("Seeder selesai");

    // Build app
    let app = build_app(pool.clone(), config.clone()).await?;

    // Start scheduler
    scheduler::start_scheduler(pool, config.clone()).await?;

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    let listener = TcpListener::bind(addr).await?;
    tracing::info!("Server berjalan di http://{}", addr);
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;

    Ok(())
}

async fn build_app(
    pool: sqlx::PgPool,
    config: Config,
) -> anyhow::Result<Router> {
    let frontend_url = config.frontend_url.clone();
    let upload_dir = config.upload_dir.clone();

    let cors = CorsLayer::new()
        .allow_origin(
            frontend_url
                .parse::<axum::http::HeaderValue>()
                .map(tower_http::cors::AllowOrigin::exact)
                .unwrap_or_else(|_| tower_http::cors::AllowOrigin::any()),
        )
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .nest("/api/v1", routes::build_routes(pool.clone(), config))
        .nest_service("/uploads", ServeDir::new(&upload_dir))
        // Layer menyimpan PgPool ke request.extensions agar bisa diakses di middleware auth
        .layer(from_fn(move |mut req: axum::extract::Request, next: axum::middleware::Next| {
            let pool = pool.clone();
            async move {
                req.extensions_mut().insert(pool);
                next.run(req).await
            }
        }))
        .layer(TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::max(12 * 1024 * 1024)) // 12 MB body limit untuk upload gambar
        .layer(cors);

    Ok(app)
}
