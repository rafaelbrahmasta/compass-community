use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use rand::Rng;

/// Generate PIN acak 6 digit (000000-999999, padded)
pub fn generate_random_pin() -> String {
    let n: u32 = rand::thread_rng().gen_range(0..1_000_000);
    format!("{:06}", n)
}

/// Hash PIN dengan Argon2
pub fn hash_pin(pin: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(pin.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("Gagal hash PIN: {}", e))?
        .to_string();
    Ok(hash)
}

/// Verifikasi PIN dengan hash Argon2. Mengembalikan false jika hash tidak valid.
pub fn verify_pin(input_pin: &str, hash: &str) -> bool {
    match PasswordHash::new(hash) {
        Ok(parsed) => Argon2::default()
            .verify_password(input_pin.as_bytes(), &parsed)
            .is_ok(),
        Err(_) => false,
    }
}
