use axum::{Router, middleware};
use sqlx::PgPool;
use crate::config::Config;
use crate::middleware::auth_middleware;

pub mod public;
pub mod admin;

pub fn build_routes(pool: PgPool, config: Config) -> Router {
    let public_routes = public::public_routes(pool.clone(), config.clone());
    let admin_routes = admin::admin_routes(pool.clone(), config.clone())
        .route_layer(middleware::from_fn(auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(admin_routes)
}
