use chrono::{DateTime, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,   // admin id (UUID as string)
    pub email: String,
    pub name: String,
    pub role: String,  // super_admin | admin_1 | admin_2
    pub exp: usize,
    pub iat: usize,
}

pub fn create_token(admin_id: Uuid, email: &str, name: &str, role: &str) -> anyhow::Result<String> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".into());
    let now = Utc::now();
    let exp = now + chrono::Duration::hours(24);

    let claims = Claims {
        sub: admin_id.to_string(),
        email: email.to_string(),
        name: name.to_string(),
        role: role.to_string(),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok(token)
}

pub fn verify_token(token: &str) -> anyhow::Result<Claims> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".into());
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(token_data.claims)
}
