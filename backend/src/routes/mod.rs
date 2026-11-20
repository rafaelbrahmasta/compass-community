use axum::Router;
use sqlx::PgPool;
use crate::config::Config;

pub mod public;
pub mod admin;

pub fn build_routes(pool: PgPool, config: Config) -> Router {
    let public_routes = public::public_routes(pool.clone(), config.clone());
    let admin_routes = admin::admin_routes(pool.clone(), config.clone());

    Router::new()
        .merge(public_routes)
        .merge(admin_routes)
}
