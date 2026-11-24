use lettre::{
    Message, SmtpTransport, Transport,
    transport::smtp::authentication::Credentials,
};
use crate::config::Config;

pub fn send_email_async(config: Config, to: String, subject: String, body: String) {
    tokio::task::spawn_blocking(move || {
        let from_mailbox = match config.smtp_from.parse() {
            Ok(m) => m,
            Err(_) => match "COMPASS <noreply@compass.id>".parse() {
                Ok(m) => m,
                Err(e) => {
                    tracing::error!("Konfigurasi SMTP_FROM tidak valid: {}", e);
                    return;
                }
            },
        };

        let to_mailbox = match to.trim().parse() {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!("Alamat email tujuan '{}' tidak valid: {}", to, e);
                return;
            }
        };

        let email_msg = match Message::builder()
            .from(from_mailbox)
            .to(to_mailbox)
            .subject(subject)
            .body(body)
        {
            Ok(msg) => msg,
            Err(e) => {
                tracing::error!("Gagal membuat email: {}", e);
                return;
            }
        };

        let creds = Credentials::new(config.smtp_user, config.smtp_pass);
        let mailer = match SmtpTransport::starttls_relay(&config.smtp_host) {
            Ok(builder) => builder.credentials(creds).port(config.smtp_port).build(),
            Err(e) => {
                tracing::error!("Gagal koneksi relay SMTP: {}", e);
                return;
            }
        };

        match mailer.send(&email_msg) {
            Ok(_) => tracing::info!("Email notifikasi berhasil dikirim ke {}", to),
            Err(e) => tracing::error!("Gagal kirim email notifikasi ke {}: {}", to, e),
        }
    });
}
