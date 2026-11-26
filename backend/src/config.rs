use anyhow::Context;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_pass: String,
    pub smtp_from: String,
    pub admin_email: String,
    pub admin_password: String,
    pub upload_dir: String,
    pub frontend_url: String,
    pub port: u16,
    pub seed_demo: bool,
    // Supabase Storage
    pub supabase_url: String,
    pub supabase_service_key: String,
    pub supabase_bucket: String,
    pub supabase_private_bucket: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Config {
            database_url: std::env::var("DATABASE_URL")
                .context("DATABASE_URL tidak ditemukan")?,
            jwt_secret: std::env::var("JWT_SECRET")
                .context("JWT_SECRET tidak ditemukan")?,
            smtp_host: std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".into()),
            smtp_port: std::env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".into())
                .parse()
                .unwrap_or(587),
            smtp_user: std::env::var("SMTP_USER").unwrap_or_default(),
            smtp_pass: std::env::var("SMTP_PASS").unwrap_or_default(),
            smtp_from: std::env::var("SMTP_FROM").unwrap_or_else(|_| "COMPASS <noreply@compass.id>".into()),
            admin_email: std::env::var("ADMIN_EMAIL")
                .unwrap_or_else(|_| "admin@compass.id".into()),
            admin_password: std::env::var("ADMIN_PASSWORD")
                .unwrap_or_else(|_| "Admin@compass123".into()),
            upload_dir: std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".into()),
            frontend_url: std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:5173".into()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()
                .unwrap_or(8080),
            seed_demo: std::env::var("SEED_DEMO")
                .map(|v| v.to_lowercase() == "true" || v == "1")
                .unwrap_or(false),
            supabase_url: std::env::var("SUPABASE_URL").unwrap_or_default(),
            supabase_service_key: std::env::var("SUPABASE_SERVICE_KEY").unwrap_or_default(),
            supabase_bucket: std::env::var("SUPABASE_BUCKET")
                .unwrap_or_else(|_| "compass-uploads".into()),
            supabase_private_bucket: std::env::var("SUPABASE_PRIVATE_BUCKET")
                .unwrap_or_else(|_| "compass-private".into()),
        })
    }
}
