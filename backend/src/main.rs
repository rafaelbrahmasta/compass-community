use axum::Router;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::{
    cors::{CorsLayer, Any},
    trace::TraceLayer,
    services::ServeDir,
};
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
    axum::serve(listener, app).await?;

    Ok(())
}

async fn build_app(
    pool: sqlx::PgPool,
    config: Config,
) -> anyhow::Result<Router> {
    let frontend_url = config.frontend_url.clone();
    let upload_dir = config.upload_dir.clone();

    let cors = CorsLayer::new()
        .allow_origin(frontend_url.parse::<axum::http::HeaderValue>()?)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .nest("/api/v1", routes::build_routes(pool, config))
        .nest_service("/uploads", ServeDir::new(&upload_dir))
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    Ok(app)
}
