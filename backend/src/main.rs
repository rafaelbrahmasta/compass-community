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

use compass_backend::{
    config::Config,
    db, routes, scheduler, services,
};

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
    let clean_frontend_url = config.frontend_url.trim().trim_end_matches('/');
    let frontend_origin = clean_frontend_url.parse::<axum::http::HeaderValue>()
        .unwrap_or_else(|_| axum::http::HeaderValue::from_static("http://localhost:5173"));
    let upload_dir = config.upload_dir.clone();

    let cors = CorsLayer::new()
        .allow_origin(frontend_origin)
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
        // Layer Security Headers (CSP, X-Frame-Options, X-Content-Type-Options)
        .layer(from_fn(security_headers_middleware))
        .layer(TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::max(1024 * 1024)) // 1 MB default body limit untuk endpoint publik
        .layer(cors);

    Ok(app)
}

async fn security_headers_middleware(req: axum::extract::Request, next: axum::middleware::Next) -> axum::response::Response {
    let mut response = next.run(req).await;
    let headers = response.headers_mut();
    headers.insert(
        axum::http::header::X_CONTENT_TYPE_OPTIONS,
        axum::http::HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        axum::http::header::X_FRAME_OPTIONS,
        axum::http::HeaderValue::from_static("DENY"),
    );
    headers.insert(
        axum::http::header::X_XSS_PROTECTION,
        axum::http::HeaderValue::from_static("1; mode=block"),
    );
    headers.insert(
        axum::http::header::REFERRER_POLICY,
        axum::http::HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        axum::http::header::HeaderName::from_static("content-security-policy"),
        axum::http::HeaderValue::from_static(
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' http: https: ws: wss:; frame-ancestors 'none';"
        ),
    );
    response
}
