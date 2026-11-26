/// Bug 15 fix: sanitize hanya field teks (nama, catatan, email), bukan nomor HP
pub fn sanitize_csv_field(val: &str) -> String {
    let trimmed = val.trim();
    if trimmed.starts_with('+') {
        return trimmed.to_string();
    }
    if trimmed.starts_with('=') || trimmed.starts_with('-') || trimmed.starts_with('@') {
        format!("'{}", trimmed)
    } else {
        trimmed.to_string()
    }
}
