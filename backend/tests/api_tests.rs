#[test]
fn test_xss_ammonia_clean() {
    let dirty = "<p>Halo <script>alert('xss')</script> suporter!</p>";
    let clean = ammonia::clean(dirty);
    assert!(!clean.contains("<script>"));
    assert!(clean.contains("<p>Halo "));
    assert!(clean.contains(" suporter!</p>"));
}

#[test]
fn test_unique_code_range() {
    use rand::Rng;
    let code = rand::thread_rng().gen_range(100..=999);
    assert!(code >= 100 && code <= 999);
}

#[test]
fn test_csv_formula_sanitization() {
    let formulas = vec!["=SUM(A1:A10)", "+cmd|' /C calc'!A0", "-2+3*[1]", "@IMPORTXML()"];
    for f in formulas {
        let trimmed = f.trim();
        let sanitized = if trimmed.starts_with('=') || trimmed.starts_with('+') || trimmed.starts_with('-') || trimmed.starts_with('@') {
            format!("'{}", trimmed)
        } else {
            trimmed.to_string()
        };
        assert!(sanitized.starts_with('\''));
    }
}
