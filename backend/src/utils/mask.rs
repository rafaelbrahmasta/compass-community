pub fn mask_name(name: &str) -> String {
    name.split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => {
                    let rest = chars.count();
                    if rest > 0 {
                        format!("{}{}", first, "*".repeat(rest))
                    } else {
                        first.to_string()
                    }
                }
                None => "".to_string(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn mask_phone(phone: &str) -> String {
    let clean = phone.trim().replace(" ", "").replace("-", "");
    if clean.len() <= 6 {
        return "***".to_string();
    }
    let prefix = &clean[..4];
    let suffix = &clean[clean.len() - 3..];
    let stars = "*".repeat(clean.len() - 7);
    format!("{}{}{}", prefix, stars, suffix)
}
