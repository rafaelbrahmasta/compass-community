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

async fn cancel_expired_tickets(pool: &PgPool) -> anyhow::Result<()> {
    // Eksekusi pembatalan tiket dan pengembalian kuota dalam SATU query CTE atomik
    let rows_affected = sqlx::query(
        r#"WITH expired AS (
               UPDATE ticket_purchases
               SET status = 'dibatalkan',
                   notes = COALESCE(notes || ' | ', '') || 'Dibatalkan otomatis karena batas waktu pembayaran 24 jam berakhir'
               WHERE status = 'menunggu_pembayaran' AND expires_at <= NOW()
                 AND payment_proof_url IS NULL
               RETURNING category_id
           ),
           grouped AS (
               SELECT category_id, COUNT(*) AS cnt
               FROM expired
               GROUP BY category_id
           )
           UPDATE ticket_categories tc
           SET sold = GREATEST(0, tc.sold - grouped.cnt)
           FROM grouped
           WHERE tc.id = grouped.category_id"#
    )
    .execute(pool)
    .await?;

    if rows_affected.rows_affected() > 0 {
        tracing::info!("Scheduler: Berhasil memproses pembatalan tiket kedaluwarsa secara atomik.");
    }

    Ok(())
}

#[derive(sqlx::FromRow, Clone)]
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
    // Ambil reminder yang belum dikirim, belum melebihi 3x retry, dan sudah waktunya
    let reminders = sqlx::query_as::<_, PendingReminder>(
        r#"SELECT r.id, r.email, r.remind_before,
                  m.opponent_name, m.match_date, m.match_time, m.stadium, m.competition
           FROM reminders r
           JOIN matches m ON m.id = r.match_id
           WHERE r.email_sent = false
           AND r.retry_count < 3
           AND r.scheduled_at <= NOW()
           ORDER BY r.scheduled_at ASC
           LIMIT 20"#
    )
    .fetch_all(pool)
    .await?;

    if reminders.is_empty() {
        return Ok(());
    }

    for r in reminders {
        let when = if r.remind_before == "h_minus_1_day" {
            "1 hari lagi"
        } else {
            "3 jam lagi"
        };

        let body_text = format!(
            "Halo!\n\nIni adalah pengingat dari COMPASS:\n\n\
             PSS Sleman vs {} akan berlangsung {} ({})\n\
             Tanggal: {}\nWaktu: {}\nStadion: {}\n\
             Kompetisi: {}\n\n\
             Yuk kita dukung bersama! 💚\n\n\
             Salam Super Elja!\nCOMPASS - Komunitas Pendukung PSS Sleman",
            r.opponent_name,
            when,
            r.match_date,
            r.match_date,
            r.match_time,
            r.stadium,
            r.competition,
        );

        // Validasi parse email pengirim dan penerima tanpa fallback ke user@example.com
        let from_mailbox = match config.smtp_from.parse() {
            Ok(m) => m,
            Err(_) => match "COMPASS <noreply@compass.id>".parse() {
                Ok(m) => m,
                Err(e) => {
                    tracing::error!("Konfigurasi SMTP_FROM tidak valid: {}", e);
                    continue;
                }
            },
        };

        let to_mailbox = match r.email.trim().parse() {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!("Alamat email reminder {} tidak valid: {}. Menandai gagal.", r.email, e);
                let _ = sqlx::query(
                    "UPDATE reminders SET email_sent = true, last_error = $1 WHERE id = $2"
                )
                .bind(format!("Format email tidak valid: {}", e))
                .bind(r.id)
                .execute(pool)
                .await;
                continue;
            }
        };

        let email_msg = match Message::builder()
            .from(from_mailbox)
            .to(to_mailbox)
            .subject(format!("⚽ Pengingat Pertandingan: PSS Sleman vs {} - {}", r.opponent_name, when))
            .body(body_text)
        {
            Ok(msg) => msg,
            Err(e) => {
                tracing::error!("Gagal membuat pesan email: {}", e);
                continue;
            }
        };

        // Buat SMTP transport & jalankan pengiriman di blocking task agar tidak memblokir tokio runtime
        let smtp_host = config.smtp_host.clone();
        let smtp_port = config.smtp_port;
        let smtp_user = config.smtp_user.clone();
        let smtp_pass = config.smtp_pass.clone();

        let send_result = tokio::task::spawn_blocking(move || {
            let creds = Credentials::new(smtp_user, smtp_pass);
            let mailer = SmtpTransport::starttls_relay(&smtp_host)?
                .credentials(creds)
                .port(smtp_port)
                .build();
            mailer.send(&email_msg).map_err(|e| anyhow::anyhow!("{}", e))
        })
        .await;

        match send_result {
            Ok(Ok(_)) => {
                let _ = sqlx::query(
                    "UPDATE reminders SET email_sent = true, sent_at = NOW(), last_error = NULL WHERE id = $1"
                )
                .bind(r.id)
                .execute(pool)
                .await;
                tracing::info!("Email reminder terkirim ke {}", r.email);
            }
            Ok(Err(e)) => {
                tracing::error!("Gagal kirim email ke {}: {}", r.email, e);
                let _ = sqlx::query(
                    "UPDATE reminders SET retry_count = retry_count + 1, last_error = $1 WHERE id = $2"
                )
                .bind(e.to_string())
                .bind(r.id)
                .execute(pool)
                .await;
            }
            Err(join_err) => {
                tracing::error!("Task blocking SMTP panic: {}", join_err);
            }
        }
    }

    Ok(())
}
