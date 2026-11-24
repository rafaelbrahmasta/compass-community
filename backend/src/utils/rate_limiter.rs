use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::OnceLock;
use std::time::{Instant, Duration as StdDuration};
use axum::{
    extract::ConnectInfo,
    http::HeaderMap,
    middleware::Next,
    response::Response,
};
use crate::errors::AppError;

/// Rate limiter global sederhana untuk endpoint tiket (mencegah brute-force / spam).
static TICKET_RATE_LIMITER: OnceLock<TicketRateLimiter> = OnceLock::new();

pub(crate) struct TicketRateLimiter {
    store: std::sync::Mutex<HashMap<String, Vec<Instant>>>,
    max_requests: usize,
    window_secs: u64,
}

impl TicketRateLimiter {
    fn new(max_requests: usize, window_secs: u64) -> Self {
        Self {
            store: std::sync::Mutex::new(HashMap::new()),
            max_requests,
            window_secs,
        }
    }

    pub fn check(&self, key: &str) -> Result<(), AppError> {
        let now = Instant::now();
        let window = StdDuration::from_secs(self.window_secs);
        let mut store = self.store.lock().unwrap();
        let timestamps = store.entry(key.to_string()).or_default();
        timestamps.retain(|t| now.duration_since(*t) < window);
        if timestamps.len() >= self.max_requests {
            return Err(AppError::BadRequest(
                "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat.".into(),
            ));
        }
        timestamps.push(now);
        Ok(())
    }
}

pub fn limiter() -> &'static TicketRateLimiter {
    TICKET_RATE_LIMITER.get_or_init(|| TicketRateLimiter::new(10, 60)) // 10 req per menit
}

/// Ekstrak IP klien dari header (x-real-ip / x-forwarded-for) dengan fallback ke SocketAddr.
/// Jika keduanya tidak tersedia, gunakan "unknown".
pub fn extract_ip(headers: &HeaderMap, conn_addr: Option<SocketAddr>) -> String {
    if let Some(real_ip) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        return real_ip.to_string();
    }
    if let Some(forwarded) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        return forwarded.split(',').next().unwrap_or("unknown").trim().to_string();
    }
    if let Some(addr) = conn_addr {
        return addr.ip().to_string();
    }
    "unknown".to_string()
}

/// Middleware: rate limit untuk endpoint tiket (buy/check).
#[allow(dead_code)]
pub async fn ticket_rate_limit_middleware(
    ConnectInfo(conn_addr): ConnectInfo<SocketAddr>,
    request: axum::extract::Request,
    next: Next,
) -> Result<Response, AppError> {
    let ip = extract_ip(request.headers(), Some(conn_addr));
    limiter().check(&ip)?;
    Ok(next.run(request).await)
}