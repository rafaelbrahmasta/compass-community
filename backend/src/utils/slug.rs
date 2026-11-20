pub fn to_slug(text: &str) -> String {
    slug::slugify(text)
}

pub fn unique_slug(text: &str, suffix: &str) -> String {
    format!("{}-{}", to_slug(text), &suffix[..8])
}
