use compass_backend::utils::{
    detect_and_verify_image_magic_bytes, escape_like_pattern, generate_random_pin, hash_pin,
    mask_name, mask_phone, sanitize_csv_field, verify_pin,
};
use chrono::{NaiveDate, Utc, Duration};

#[test]
fn test_sanitize_csv_field_formula_injection() {
    // Karakter formula berbahaya harus diberi prefix apostrof (')
    assert_eq!(sanitize_csv_field("=SUM(A1:A10)"), "'=SUM(A1:A10)");
    assert_eq!(sanitize_csv_field("-2+3*[1]"), "'-2+3*[1]");
    assert_eq!(sanitize_csv_field("@IMPORTXML()"), "'@IMPORTXML()");

    // Bug 15: Nomor telepon berawalan '+' TIDAK boleh dirusak dengan kutip
    assert_eq!(sanitize_csv_field("+6281234567890"), "+6281234567890");
    assert_eq!(sanitize_csv_field("+123456789"), "+123456789");

    // Teks biasa tetap utuh
    assert_eq!(sanitize_csv_field("Budi Santoso"), "Budi Santoso");
    assert_eq!(sanitize_csv_field("CMP-0001"), "CMP-0001");
}

#[test]
fn test_mask_name_and_phone() {
    let masked_n = mask_name("Budi Santoso");
    assert_eq!(masked_n, "B*** S******");

    let masked_p = mask_phone("081234567890");
    assert_eq!(masked_p, "0812*****890");

    let short_phone = mask_phone("12345");
    assert_eq!(short_phone, "***");
}

#[test]
fn test_detect_image_magic_bytes() {
    // JPEG magic bytes: FF D8 FF
    let mut jpeg_bytes = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];
    jpeg_bytes.resize(100, 0);
    assert_eq!(detect_and_verify_image_magic_bytes(&jpeg_bytes).unwrap(), "jpg");

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    let mut png_bytes = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];
    png_bytes.resize(100, 0);
    assert_eq!(detect_and_verify_image_magic_bytes(&png_bytes).unwrap(), "png");

    // WebP magic bytes: RIFF .... WEBP
    let mut webp_bytes = b"RIFF\x00\x00\x00\x00WEBPVP8 ".to_vec();
    webp_bytes.resize(100, 0);
    assert_eq!(detect_and_verify_image_magic_bytes(&webp_bytes).unwrap(), "webp");

    // File palsu (shell script / text) harus ditolak
    let fake_file = b"<?php echo 'hacked'; ?>\n\n\n\n".to_vec();
    assert!(detect_and_verify_image_magic_bytes(&fake_file).is_err());
}

#[test]
fn test_pin_generation_hashing_and_no_fallback() {
    // Generate PIN 6 digit
    let pin = generate_random_pin();
    assert_eq!(pin.len(), 6);
    assert!(pin.chars().all(|c| c.is_ascii_digit()));

    // Hash dengan Argon2
    let hash = hash_pin(&pin).expect("Gagal hashing PIN");
    assert!(hash.starts_with("$argon2"));

    // Verifikasi PIN valid
    assert!(verify_pin(&pin, &hash));

    // PIN salah harus gagal
    assert!(!verify_pin("000000", &hash) || pin == "000000");

    // Bug 1: Fallback "123456" tidak boleh otomatis lolos bila hash berbeda
    if pin != "123456" {
        assert!(!verify_pin("123456", &hash));
    }

    // Hash kosong / invalid tidak boleh lolos
    assert!(!verify_pin(&pin, "invalid_plain_hash"));
}

#[test]
fn test_escape_like_pattern() {
    assert_eq!(escape_like_pattern("test%_\\val"), "test\\%\\_\\\\val");
    assert_eq!(escape_like_pattern("normal string"), "normal string");
}

#[test]
fn test_checkin_match_date_validation() {
    let today_jakarta = (Utc::now() + Duration::hours(7)).date_naive();
    let yesterday = today_jakarta - Duration::days(1);
    let tomorrow = today_jakarta + Duration::days(1);

    // Fungsi helper simulasi aturan validasi checkin
    let validate_checkin_date = |match_date: NaiveDate| -> Result<(), &'static str> {
        if match_date < today_jakarta {
            return Err("laga_sudah_berakhir");
        }
        if match_date > today_jakarta {
            return Err("laga_belum_dimulai");
        }
        Ok(())
    };

    // Hari H pertandingan -> valid
    assert!(validate_checkin_date(today_jakarta).is_ok());

    // Kemarin -> ditolak (laga sudah berakhir)
    assert_eq!(validate_checkin_date(yesterday), Err("laga_sudah_berakhir"));

    // Besok -> ditolak (laga belum dimulai)
    assert_eq!(validate_checkin_date(tomorrow), Err("laga_belum_dimulai"));
}

#[test]
fn test_ticket_status_transitions() {
    // Validasi aturan transisi status tiket
    let can_upload_proof = |status: &str| -> bool {
        status == "menunggu_pembayaran"
    };

    let can_checkin = |status: &str| -> bool {
        status == "lunas"
    };

    assert!(can_upload_proof("menunggu_pembayaran"));
    assert!(!can_upload_proof("lunas"));
    assert!(!can_upload_proof("sudah_checkin"));
    assert!(!can_upload_proof("dibatalkan"));

    assert!(can_checkin("lunas"));
    assert!(!can_checkin("menunggu_pembayaran"));
    assert!(!can_checkin("sudah_checkin"));
    assert!(!can_checkin("dibatalkan"));
}
