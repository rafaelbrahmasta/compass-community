use sqlx::PgPool;
use tokio_cron_scheduler::{Job, JobScheduler};
use lettre::{
    Message, SmtpTransport, Transport,
    transport::smtp::authentication::Credentials,
};
use crate::config::Config;

pub async fn start_scheduler(pool: PgPool, config: Config) -> anyhow::Result<()> {
    let sched = JobScheduler::new().await?;

    // Cek dan kirim reminder setiap menit
    let pool_clone = pool.clone();
    let config_clone = config.clone();
    sched.add(Job::new_async("0 * * * * *", move |_, _| {
        let pool = pool_clone.clone();
        let config = config_clone.clone();
        Box::pin(async move {
            if let Err(e) = send_pending_reminders(&pool, &config).await {
                tracing::error!("Error scheduler reminder: {}", e);
            }
        })
    })?).await?;

    // Cek pembatalan tiket expired setiap 5 menit
    let pool_cancel = pool.clone();
    sched.add(Job::new_async("0 */5 * * * *", move |_, _| {
        let pool = pool_cancel.clone();
        Box::pin(async move {
            if let Err(e) = cancel_expired_tickets(&pool).await {
                tracing::error!("Error scheduler pembatalan tiket expired: {}", e);
            }
        })
    })?).await?;

    sched.start().await?;
    tracing::info!("Scheduler email reminder & pembatalan tiket aktif");

    Ok(())
}

#[derive(sqlx::FromRow)]
struct ExpiredTicket {
    #[allow(dead_code)]
    id: uuid::Uuid,
    category_id: uuid::Uuid,
}

async fn cancel_expired_tickets(pool: &PgPool) -> anyhow::Result<()> {
    let expired: Vec<ExpiredTicket> = sqlx::query_as::<_, ExpiredTicket>(
        r#"UPDATE ticket_purchases
           SET status = 'dibatalkan',
               notes = COALESCE(notes || ' | ', '') || 'Dibatalkan otomatis karena batas waktu pembayaran 24 jam berakhir'
           WHERE status = 'menunggu_pembayaran' AND expires_at <= NOW()
           RETURNING id, category_id"#
    )
    .fetch_all(pool)
    .await?;

    if !expired.is_empty() {
        tracing::info!("Scheduler: {} tiket kedaluwarsa otomatis dibatalkan", expired.len());
        for item in expired {
            let _ = sqlx::query(
                "UPDATE ticket_categories SET sold = GREATEST(0, sold - 1) WHERE id = $1"
            )
            .bind(item.category_id)
            .execute(pool)
            .await;
        }
    }

    Ok(())
}

#[derive(sqlx::FromRow)]
struct PendingReminder {
    id: uuid::Uuid,
    email: String,
    remind_before: String,
    opponent_name: String,
    match_date: chrono::NaiveDate,
    match_time: chrono::NaiveTime,
    stadium: String,
    competition: String,
}

async fn send_pending_reminders(pool: &PgPool, config: &Config) -> anyhow::Result<()> {
    // Ambil reminder yang belum dikirim dan sudah waktunya
    let reminders = sqlx::query_as::<_, PendingReminder>(
        r#"SELECT r.id, r.email, r.remind_before,
                  m.opponent_name, m.match_date, m.match_time, m.stadium, m.competition
           FROM reminders r
           JOIN matches m ON m.id = r.match_id
           WHERE r.email_sent = false
           AND r.scheduled_at <= NOW()"#
    )
    .fetch_all(pool)
    .await?;

    if reminders.is_empty() {
        return Ok(());
    }

    // Setup SMTP
    let creds = Credentials::new(config.smtp_user.clone(), config.smtp_pass.clone());
    let mailer = SmtpTransport::starttls_relay(&config.smtp_host)?
        .credentials(creds)
        .port(config.smtp_port)
        .build();

    for r in &reminders {
        let when = if r.remind_before == "h_minus_1_day" {
            "1 hari lagi"
        } else {
            "3 jam lagi"
        };

        let body = format!(
            "Halo!\n\nIni adalah pengingat dari COMPASS:\n\n\
             PSS Sleman vs {} akan berlangsung {} ({})\n\
             Tanggal: {}\nWaktu: {}\nStadion: {}\n\
             Kompetisi: {}\n\n\
             Yuk kita dukung bersama! 💚\n\n\
             Salam Supercan!\nCOMPASS - Komunitas Pendukung PSS Sleman",
            r.opponent_name,
            when,
            r.match_date,
            r.match_date,
            r.match_time,
            r.stadium,
            r.competition,
        );

        let email = Message::builder()
            .from(config.smtp_from.parse().unwrap_or_else(|_| "COMPASS <noreply@compass.id>".parse().unwrap()))
            .to(r.email.parse().unwrap_or_else(|_| "user@example.com".parse().unwrap()))
            .subject(format!("⚽ Reminder: PSS Sleman vs {} - {}", r.opponent_name, when))
            .body(body);

        match email {
            Ok(email_msg) => {
                match mailer.send(&email_msg) {
                    Ok(_) => {
                        sqlx::query("UPDATE reminders SET email_sent = true, sent_at = NOW() WHERE id = $1")
                            .bind(r.id)
                            .execute(pool)
                            .await?;
                        tracing::info!("Email reminder terkirim ke {}", r.email);
                    }
                    Err(e) => {
                        tracing::error!("Gagal kirim email ke {}: {}", r.email, e);
                    }
                }
            }
            Err(e) => tracing::error!("Gagal membuat email: {}", e),
        }
    }

    Ok(())
}
