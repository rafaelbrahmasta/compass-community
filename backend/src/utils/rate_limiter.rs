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

/// Rate limiter global untuk endpoint tiket & otentikasi
static TICKET_RATE_LIMITER: OnceLock<TicketRateLimiter> = OnceLock::new();
static LOGIN_RATE_LIMITER: OnceLock<TicketRateLimiter> = OnceLock::new();

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

        // Eviction / Cleanup: bersihkan entri kosong secara berkala agar tidak memory leak
        if store.len() > 500 {
            store.retain(|_, timestamps| {
                timestamps.retain(|t| now.duration_since(*t) < window);
                !timestamps.is_empty()
            });
        }

        let timestamps = store.entry(key.to_string()).or_default();
        timestamps.retain(|t| now.duration_since(*t) < window);
        if timestamps.len() >= self.max_requests {
            return Err(AppError::BadRequest(
                "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit demi keamanan.".into(),
            ));
        }
        timestamps.push(now);
        Ok(())
    }

    pub fn reset(&self, key: &str) {
        let mut store = self.store.lock().unwrap();
        store.remove(key);
    }
}

/// Rate limiter untuk pemesanan & pengecekan tiket (10 req / menit per IP)
pub fn limiter() -> &'static TicketRateLimiter {
    TICKET_RATE_LIMITER.get_or_init(|| TicketRateLimiter::new(10, 60))
}

/// Rate limiter untuk login admin (5 percobaan gagal / 15 menit per IP & email)
pub fn login_limiter() -> &'static TicketRateLimiter {
    LOGIN_RATE_LIMITER.get_or_init(|| TicketRateLimiter::new(5, 15 * 60))
}

/// Ekstrak IP klien yang aman:
/// 1. Prioritaskan header X-Real-IP (di-set secara tepercaya oleh reverse proxy Nginx dari $remote_addr)
/// 2. Jika tidak ada, gunakan alamat koneksi TCP socket nyata (conn_addr)
/// 3. Fallback ke segmen pertama X-Forwarded-For atau "127.0.0.1"
pub fn extract_ip(headers: &HeaderMap, conn_addr: Option<SocketAddr>) -> String {
    if let Some(real_ip) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        let cleaned = real_ip.trim();
        if !cleaned.is_empty() {
            return cleaned.to_string();
        }
    }
    if let Some(addr) = conn_addr {
        return addr.ip().to_string();
    }
    if let Some(forwarded) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first) = forwarded.split(',').next() {
            let cleaned = first.trim();
            if !cleaned.is_empty() {
                return cleaned.to_string();
            }
        }
    }
    "127.0.0.1".to_string()
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
