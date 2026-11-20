use sqlx::PgPool;
use uuid::Uuid;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use crate::config::Config;

pub async fn run_seeder(pool: &PgPool, config: &Config) -> anyhow::Result<()> {
    seed_admin(pool, config).await?;
    seed_site_settings(pool).await?;
    seed_carousel(pool).await?;
    seed_about(pool).await?;
    seed_humanity(pool).await?;
    seed_matches(pool).await?;
    seed_merch(pool).await?;
    seed_gallery(pool).await?;
    seed_agendas(pool).await?;
    seed_news(pool).await?;
    seed_members(pool).await?;
    Ok(())
}

async fn seed_admin(pool: &PgPool, config: &Config) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM admins")
        .fetch_one(pool).await?;

    let salt = SaltString::generate(&mut OsRng);

    if count == 0 {
        let hash = Argon2::default()
            .hash_password(config.admin_password.as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("Gagal hashing password admin: {}", e))?
            .to_string();

        sqlx::query(
            "INSERT INTO admins (id, email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(Uuid::new_v4())
        .bind(&config.admin_email)
        .bind(&hash)
        .bind("Super Admin")
        .bind("super_admin")
        .bind(true)
        .execute(pool).await?;

        tracing::info!("Admin seeder: akun super admin dibuat untuk {}", config.admin_email);
    } else {
        // Pastikan admin utama memiliki role super_admin dan aktif
        sqlx::query("UPDATE admins SET role = 'super_admin', is_active = true WHERE email = $1")
            .bind(&config.admin_email)
            .execute(pool).await?;
    }

    // Seed admin_1 (Admin Konten 1)
    let admin1_exists: Option<Uuid> = sqlx::query_scalar("SELECT id FROM admins WHERE email = 'admin1@compass.id'")
        .fetch_optional(pool).await?;
    if admin1_exists.is_none() {
        let hash1 = Argon2::default()
            .hash_password("Admin1@compass123".as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("Gagal hashing password admin_1: {}", e))?
            .to_string();

        sqlx::query(
            "INSERT INTO admins (id, email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(Uuid::new_v4())
        .bind("admin1@compass.id")
        .bind(&hash1)
        .bind("Admin Konten 1")
        .bind("admin_1")
        .bind(true)
        .execute(pool).await?;
        tracing::info!("Admin seeder: akun admin_1 dibuat (admin1@compass.id)");
    }

    // Seed admin_2 (Admin Konten 2)
    let admin2_exists: Option<Uuid> = sqlx::query_scalar("SELECT id FROM admins WHERE email = 'admin2@compass.id'")
        .fetch_optional(pool).await?;
    if admin2_exists.is_none() {
        let hash2 = Argon2::default()
            .hash_password("Admin2@compass123".as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("Gagal hashing password admin_2: {}", e))?
            .to_string();

        sqlx::query(
            "INSERT INTO admins (id, email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(Uuid::new_v4())
        .bind("admin2@compass.id")
        .bind(&hash2)
        .bind("Admin Konten 2")
        .bind("admin_2")
        .bind(true)
        .execute(pool).await?;
        tracing::info!("Admin seeder: akun admin_2 dibuat (admin2@compass.id)");
    }

    Ok(())
}

async fn seed_site_settings(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM site_settings")
        .fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    let settings = vec![
        ("site_name", "COMPASS"),
        ("contact_name", "Admin COMPASS"),
        ("contact_email", "compass@compass.id"),
        ("contact_phone", "+62 812-3456-7890"),
        ("contact_whatsapp", "+62 812-3456-7890"),
        ("address", "Yogyakarta, Daerah Istimewa Yogyakarta"),
        ("maps_embed_url", ""),
        ("instagram_url", "https://instagram.com/compass_pss"),
        ("twitter_url", "https://twitter.com/compass_pss"),
        ("facebook_url", ""),
        ("youtube_url", ""),
        ("tiktok_url", ""),
        ("merch_global_form_url", "https://forms.google.com"),
    ];

    for (key, value) in settings {
        sqlx::query(
            "INSERT INTO site_settings (id, key, value) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING"
        )
        .bind(Uuid::new_v4()).bind(key).bind(value)
        .execute(pool).await?;
    }
    Ok(())
}

async fn seed_carousel(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM carousel_slides")
        .fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    let slides = vec![
        ("Bersama Kita Kuat", "Satu hati, satu jiwa, satu PSS Sleman", 1),
        ("Supercan Forever", "Komunitas yang solid, dukungan yang tak pernah padam", 2),
        ("Jadikan Kandang Tak Tertembus", "Markas kita, kebanggaan kita", 3),
        ("Compass for Humanity", "Karena sepak bola lebih dari sekadar gol", 4),
    ];

    for (title, subtitle, order) in slides {
        sqlx::query(
            "INSERT INTO carousel_slides (id, image_url, title, subtitle, sort_order, is_active)
             VALUES ($1, '', $2, $3, $4, true)"
        )
        .bind(Uuid::new_v4()).bind(title).bind(subtitle).bind(order)
        .execute(pool).await?;
    }
    Ok(())
}

async fn seed_about(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM about_content")
        .fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    let sections = vec![
        ("about", "COMPASS (Komunitas Pendukung PSS Sleman) adalah organisasi suporter resmi PSS Sleman yang berdiri dengan semangat cinta dan kesetiaan kepada kesebelasan kebanggaan Yogyakarta. Kami hadir sebagai wadah bagi para Supercan untuk bersatu, bergerak, dan mendukung PSS Sleman dalam setiap langkahnya."),
        ("visi_misi", "<h3>Visi</h3><p>Menjadi komunitas suporter PSS Sleman yang solid, berprestasi, dan memberikan dampak positif bagi masyarakat.</p><h3>Misi</h3><ul><li>Mempererat tali silaturahmi antar Supercan</li><li>Mendukung PSS Sleman secara aktif di setiap pertandingan</li><li>Berkontribusi positif bagi masyarakat melalui program sosial</li><li>Menjaga nilai-nilai sportivitas dalam bersepak bola</li></ul>"),
    ];

    for (section, content) in sections {
        sqlx::query(
            "INSERT INTO about_content (id, section, content) VALUES ($1, $2, $3) ON CONFLICT (section) DO NOTHING"
        )
        .bind(Uuid::new_v4()).bind(section).bind(content)
        .execute(pool).await?;
    }

    // Timeline
    let timeline = vec![
        (2015, "Lahirnya COMPASS", "COMPASS resmi berdiri sebagai komunitas pendukung PSS Sleman dengan anggota awal 50 orang.", 1),
        (2017, "Ekspansi Anggota", "Keanggotaan COMPASS tumbuh pesat mencapai 500 anggota aktif dari berbagai daerah.", 2),
        (2019, "Program Sosial Perdana", "Compass for Humanity diluncurkan sebagai program CSR komunitas pertama.", 3),
        (2021, "Digitalisasi COMPASS", "Peluncuran website resmi dan media sosial COMPASS untuk memperluas jangkauan.", 4),
        (2024, "Super App COMPASS", "Peluncuran Super App COMPASS sebagai pusat informasi dan interaksi komunitas.", 5),
    ];

    let tl_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM history_timeline").fetch_one(pool).await?;
    if tl_count == 0 {
        for (year, title, desc, order) in timeline {
            sqlx::query(
                "INSERT INTO history_timeline (id, year, title, description, sort_order) VALUES ($1,$2,$3,$4,$5)"
            )
            .bind(Uuid::new_v4()).bind(year).bind(title).bind(desc).bind(order)
            .execute(pool).await?;
        }
    }

    Ok(())
}

async fn seed_humanity(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM humanity_settings").fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    sqlx::query(
        "INSERT INTO humanity_settings (id, program_text, bank_name, account_name, account_number)
         VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(Uuid::new_v4())
    .bind("Compass for Humanity adalah program sosial COMPASS yang berfokus pada kegiatan kemanusiaan dan pemberdayaan masyarakat. Melalui program ini, kami berkolaborasi untuk memberikan dampak positif di luar lapangan sepak bola.")
    .bind("Bank BCA")
    .bind("COMPASS PSS Sleman")
    .bind("1234567890")
    .execute(pool).await?;

    Ok(())
}

async fn seed_matches(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM matches").fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    // DATA DUMMY - HARUS DIGANTI DENGAN DATA MUSIM 2027 YANG SEBENARNYA
    let matches = vec![
        ("Persija Jakarta", "2027-01-10", "19:00", "Maguwoharjo", "home", "BRI Liga 1"),
        ("Arema FC", "2027-01-20", "15:30", "Maguwoharjo", "home", "BRI Liga 1"),
        ("Persib Bandung", "2027-02-05", "19:00", "GBLA", "away", "BRI Liga 1"),
        ("Persebaya Surabaya", "2027-02-15", "19:00", "Maguwoharjo", "home", "BRI Liga 1"),
        ("Bali United", "2027-03-01", "15:30", "Kapten I Wayan Dipta", "away", "BRI Liga 1"),
        ("PSM Makassar", "2027-03-15", "19:00", "Maguwoharjo", "home", "BRI Liga 1"),
        ("Dewa United", "2027-04-02", "15:30", "Maguwoharjo", "home", "BRI Liga 1"),
        ("Borneo FC", "2027-04-18", "19:00", "Segiri", "away", "BRI Liga 1"),
    ];

    tracing::warn!("SEED DATA: Data jadwal pertandingan adalah DUMMY. Harap ganti dengan data musim 2027 yang sebenarnya melalui admin panel.");

    for (opponent, date, time, stadium, home_away, competition) in matches {
        sqlx::query(
            "INSERT INTO matches (id, opponent_name, match_date, match_time, stadium, home_away, competition, status)
             VALUES ($1, $2, $3::date, $4::time, $5, $6, $7, 'upcoming')"
        )
        .bind(Uuid::new_v4()).bind(opponent)
        .bind(date).bind(time)
        .bind(stadium).bind(home_away).bind(competition)
        .execute(pool).await?;
    }
    Ok(())
}

async fn seed_merch(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM merch_categories").fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    let cats = vec![
        ("Jersey", 1),
        ("Kaos", 2),
        ("Aksesoris", 3),
        ("Lainnya", 4),
    ];

    let mut cat_ids = vec![];
    for (name, order) in cats {
        let id = Uuid::new_v4();
        sqlx::query("INSERT INTO merch_categories (id, name, sort_order) VALUES ($1, $2, $3)")
            .bind(id).bind(name).bind(order).execute(pool).await?;
        cat_ids.push((id, name));
    }

    if let Some((jersey_id, _)) = cat_ids.first() {
        sqlx::query(
            "INSERT INTO merch_products (id, category_id, name, description, price, sizes, stock_status, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
        )
        .bind(Uuid::new_v4())
        .bind(jersey_id)
        .bind("Jersey Home 2027")
        .bind("Jersey kandang resmi PSS Sleman musim 2027. Material premium, nyaman dipakai seharian.")
        .bind(rust_decimal::Decimal::new(35000000, 2)) // 350.000
        .bind(serde_json::json!(["S", "M", "L", "XL", "XXL"]))
        .bind("available")
        .bind(1)
        .execute(pool).await?;
    }

    Ok(())
}

async fn seed_gallery(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM gallery_albums").fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    let albums = vec![
        ("Matchday", "Dokumentasi hari pertandingan", 1),
        ("Away Day", "Perjalanan tandang bersama Supercan", 2),
        ("Kopdar", "Kopi darat komunitas COMPASS", 3),
        ("Aksi Sosial", "Kegiatan Compass for Humanity", 4),
    ];

    for (name, desc, order) in albums {
        sqlx::query("INSERT INTO gallery_albums (id, name, description, sort_order) VALUES ($1,$2,$3,$4)")
            .bind(Uuid::new_v4()).bind(name).bind(desc).bind(order)
            .execute(pool).await?;
    }
    Ok(())
}

async fn seed_agendas(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM agendas").fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    let agendas = vec![
        ("Rapat Bulanan COMPASS", "2027-01-15", "19:30", "Sekretariat COMPASS, Yogyakarta", "Forum bulanan seluruh anggota COMPASS untuk membahas kegiatan dan evaluasi.", "upcoming"),
        ("Nobar PSS vs Persija", "2027-01-10", "18:30", "Warung Supercan, Jl. Kaliurang", "Nonton bareng pertandingan kandang PSS Sleman vs Persija Jakarta.", "upcoming"),
        ("Compass for Humanity #5", "2027-02-01", "08:00", "Panti Asuhan Al-Hikmah, Sleman", "Kegiatan sosial rutin COMPASS: berbagi dengan sesama.", "upcoming"),
    ];

    for (title, date, time, location, desc, status) in agendas {
        sqlx::query(
            "INSERT INTO agendas (id, title, agenda_date, agenda_time, location, description, status)
             VALUES ($1,$2,$3::date,$4::time,$5,$6,$7)"
        )
        .bind(Uuid::new_v4()).bind(title).bind(date).bind(time)
        .bind(location).bind(desc).bind(status)
        .execute(pool).await?;
    }
    Ok(())
}

async fn seed_news(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM news").fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    let articles = vec![
        (
            "PSS Sleman Siap Berjuang di Musim 2027",
            "pss-sleman-siap-berjuang-musim-2027",
            "<p>PSS Sleman telah merampungkan persiapan menghadapi musim BRI Liga 1 2027. Tim Supercan telah menjalani pramusim yang intensif di bawah arahan pelatih kepala.</p><p>Skuad yang diperkuat beberapa pemain baru diharapkan mampu bersaing di papan atas klasemen.</p>",
            "PSS Sleman telah menyelesaikan persiapan pramusim dengan matang. Tim diperkuat beberapa pemain baru untuk bersaing di BRI Liga 1 2027.",
            "Admin COMPASS",
        ),
        (
            "COMPASS Gelar Program Sosial Perdana 2027",
            "compass-gelar-program-sosial-2027",
            "<p>Memasuki tahun 2027, COMPASS kembali menggelar program Compass for Humanity sebagai wujud kepedulian terhadap masyarakat sekitar.</p><p>Kegiatan ini melibatkan ratusan anggota yang dengan antusias berpartisipasi dalam aksi sosial.</p>",
            "COMPASS memulai tahun 2027 dengan program sosial Compass for Humanity yang melibatkan ratusan anggota.",
            "Admin COMPASS",
        ),
        (
            "Jadwal Away Day Supercan ke Jakarta",
            "jadwal-away-day-supercan-jakarta",
            "<p>COMPASS mengumumkan rencana perjalanan away day mendukung PSS Sleman melawan Persija Jakarta pada Januari 2027.</p><p>Pendaftaran dibuka mulai tanggal 1 Januari 2027 melalui link yang tersedia di menu Agenda.</p>",
            "COMPASS membuka pendaftaran perjalanan away day ke Jakarta untuk mendukung PSS Sleman pada Januari 2027.",
            "Admin COMPASS",
        ),
    ];

    for (title, slug, content, summary, author) in articles {
        sqlx::query(
            "INSERT INTO news (id, title, slug, content, summary, author, status, published_at)
             VALUES ($1,$2,$3,$4,$5,$6,'published', NOW())"
        )
        .bind(Uuid::new_v4()).bind(title).bind(slug).bind(content).bind(summary).bind(author)
        .execute(pool).await?;
    }
    Ok(())
}

async fn seed_members(pool: &PgPool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM members").fetch_one(pool).await?;
    if count > 0 { return Ok(()); }

    let members = vec![
        ("CMP-0001", "Bagus Prasetyo", "081234567891", Some("bagus@gmail.com")),
        ("CMP-0002", "Dimas Wahyu", "081234567892", Some("dimas@gmail.com")),
        ("CMP-0003", "Rizky Pratama", "081234567893", Some("rizky@gmail.com")),
        ("CMP-0004", "Aditya Nugroho", "081234567894", Some("aditya@gmail.com")),
        ("CMP-0005", "Farhan Saputra", "081234567895", Some("farhan@gmail.com")),
    ];

    for (code, name, phone, email) in members {
        sqlx::query(
            r#"INSERT INTO members (id, member_code, full_name, phone, email, is_active)
               VALUES ($1, $2, $3, $4, $5, true)"#
        )
        .bind(Uuid::new_v4())
        .bind(code)
        .bind(name)
        .bind(phone)
        .bind(email)
        .execute(pool).await?;
    }

    // Set sequence ke 5 agar ID berikutnya CMP-0006
    let _ = sqlx::query("SELECT setval('member_code_seq', 5, true)").execute(pool).await;

    tracing::info!("Member seeder: 5 data anggota awal berhasil dibuat");
    Ok(())
}
