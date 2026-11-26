use axum::{extract::{State, Path, Query, Multipart}, Json};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::{AppError, AppResult, ok};
use crate::models::{MerchCategory, MerchProduct, MerchImage};

#[derive(Deserialize)]
pub struct ProductFilter {
    pub category_id: Option<Uuid>,
}

pub async fn get_categories(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let cats = sqlx::query_as::<_, MerchCategory>(
        "SELECT * FROM merch_categories ORDER BY sort_order ASC"
    ).fetch_all(&pool).await?;
    Ok(ok("Kategori merchandise", cats))
}

pub async fn get_products(
    State((pool, _config)): State<(PgPool, Config)>,
    Query(filter): Query<ProductFilter>,
) -> AppResult<impl axum::response::IntoResponse> {
    let products = sqlx::query_as::<_, MerchProduct>(
        "SELECT * FROM merch_products WHERE ($1::uuid IS NULL OR category_id = $1) ORDER BY sort_order ASC"
    ).bind(filter.category_id).fetch_all(&pool).await?;

    if products.is_empty() {
        return Ok(ok("Produk merchandise", Vec::<serde_json::Value>::new()));
    }

    // Ambil gambar untuk seluruh produk sekaligus dalam 1 query (mencegah N+1 query)
    let product_ids: Vec<Uuid> = products.iter().map(|p| p.id).collect();
    let all_images = sqlx::query_as::<_, MerchImage>(
        "SELECT * FROM merch_images WHERE product_id = ANY($1) ORDER BY sort_order ASC"
    )
    .bind(&product_ids)
    .fetch_all(&pool)
    .await?;

    use std::collections::HashMap;
    let mut image_map: HashMap<Uuid, Vec<MerchImage>> = HashMap::new();
    for img in all_images {
        image_map.entry(img.product_id).or_default().push(img);
    }

    let mut result = Vec::with_capacity(products.len());
    for p in products {
        let images = image_map.remove(&p.id).unwrap_or_default();
        result.push(serde_json::json!({
            "id": p.id,
            "category_id": p.category_id,
            "name": p.name,
            "description": p.description,
            "price": p.price,
            "sizes": p.sizes,
            "stock_status": p.stock_status,
            "order_form_url": p.order_form_url,
            "sort_order": p.sort_order,
            "created_at": p.created_at,
            "images": images,
        }));
    }
    Ok(ok("Produk merchandise", result))
}

pub async fn get_product_detail(
    State((pool, _config)): State<(PgPool, Config)>,
    Path(id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    let p = sqlx::query_as::<_, MerchProduct>(
        "SELECT * FROM merch_products WHERE id = $1"
    ).bind(id).fetch_optional(&pool).await?
    .ok_or_else(|| AppError::NotFound("Produk tidak ditemukan".into()))?;

    let images = sqlx::query_as::<_, MerchImage>(
        "SELECT * FROM merch_images WHERE product_id = $1 ORDER BY sort_order ASC"
    ).bind(p.id).fetch_all(&pool).await?;

    Ok(ok("Detail produk", serde_json::json!({
        "id": p.id, "category_id": p.category_id, "name": p.name,
        "description": p.description, "price": p.price, "sizes": p.sizes,
        "stock_status": p.stock_status, "order_form_url": p.order_form_url,
        "sort_order": p.sort_order, "created_at": p.created_at, "images": images,
    })))
}

pub async fn admin_get_categories(
    State((pool, _config)): State<(PgPool, Config)>,
) -> AppResult<impl axum::response::IntoResponse> {
    let cats = sqlx::query_as::<_, MerchCategory>("SELECT * FROM merch_categories ORDER BY sort_order ASC")
        .fetch_all(&pool).await?;
    Ok(ok("Kategori", cats))
}

#[derive(Deserialize)]
pub struct CategoryRequest { pub name: String, pub sort_order: Option<i32> }

pub async fn create_category(State((pool, _config)): State<(PgPool, Config)>, Json(body): Json<CategoryRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let cat = sqlx::query_as::<_, MerchCategory>("INSERT INTO merch_categories (id, name, sort_order) VALUES ($1, $2, $3) RETURNING *")
        .bind(Uuid::new_v4()).bind(&body.name).bind(body.sort_order.unwrap_or(0))
        .fetch_one(&pool).await?;
    Ok(ok("Kategori ditambahkan", cat))
}

pub async fn update_category(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>, Json(body): Json<CategoryRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let cat = sqlx::query_as::<_, MerchCategory>("UPDATE merch_categories SET name=$1, sort_order=$2 WHERE id=$3 RETURNING *")
        .bind(&body.name).bind(body.sort_order.unwrap_or(0)).bind(id)
        .fetch_optional(&pool).await?.ok_or_else(|| AppError::NotFound("Kategori tidak ditemukan".into()))?;
    Ok(ok("Kategori diperbarui", cat))
}

pub async fn delete_category(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM merch_categories WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Kategori dihapus", ()))
}

pub async fn admin_get_products(State((pool, _config)): State<(PgPool, Config)>) -> AppResult<impl axum::response::IntoResponse> {
    let products = sqlx::query_as::<_, MerchProduct>("SELECT * FROM merch_products ORDER BY sort_order ASC")
        .fetch_all(&pool).await?;
    Ok(ok("Produk", products))
}

#[derive(Deserialize)]
pub struct ProductRequest {
    pub category_id: Uuid,
    pub name: String,
    pub description: String,
    pub price: rust_decimal::Decimal,
    pub sizes: serde_json::Value,
    pub stock_status: String,
    pub order_form_url: Option<String>,
    pub sort_order: Option<i32>,
}

pub async fn create_product(State((pool, _config)): State<(PgPool, Config)>, Json(body): Json<ProductRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let p = sqlx::query_as::<_, MerchProduct>(
        "INSERT INTO merch_products (id, category_id, name, description, price, sizes, stock_status, order_form_url, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *"
    ).bind(Uuid::new_v4()).bind(body.category_id).bind(&body.name).bind(&body.description)
    .bind(body.price).bind(&body.sizes).bind(&body.stock_status).bind(&body.order_form_url).bind(body.sort_order.unwrap_or(0))
    .fetch_one(&pool).await?;
    Ok(ok("Produk ditambahkan", p))
}

pub async fn update_product(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>, Json(body): Json<ProductRequest>) -> AppResult<impl axum::response::IntoResponse> {
    let p = sqlx::query_as::<_, MerchProduct>(
        "UPDATE merch_products SET category_id=$1,name=$2,description=$3,price=$4,sizes=$5,stock_status=$6,order_form_url=$7,sort_order=$8 WHERE id=$9 RETURNING *"
    ).bind(body.category_id).bind(&body.name).bind(&body.description).bind(body.price).bind(&body.sizes)
    .bind(&body.stock_status).bind(&body.order_form_url).bind(body.sort_order.unwrap_or(0)).bind(id)
    .fetch_optional(&pool).await?.ok_or_else(|| AppError::NotFound("Produk tidak ditemukan".into()))?;
    Ok(ok("Produk diperbarui", p))
}

pub async fn delete_product(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM merch_products WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Produk dihapus", ()))
}

pub async fn upload_product_image(
    State((pool, config)): State<(PgPool, Config)>,
    Path(product_id): Path<Uuid>,
    mut multipart: Multipart,
) -> AppResult<impl axum::response::IntoResponse> {
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        if field.name() == Some("image") {
            let ct = field.content_type().unwrap_or("image/jpeg").to_string();
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let url = crate::utils::save_upload(&config, "merch", &ct, &data).await?;

            let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM merch_images WHERE product_id = $1")
                .bind(product_id).fetch_one(&pool).await?;

            let img = sqlx::query_as::<_, MerchImage>(
                "INSERT INTO merch_images (id, product_id, image_url, is_primary, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *"
            ).bind(Uuid::new_v4()).bind(product_id).bind(&url).bind(count == 0).bind(count as i32)
            .fetch_one(&pool).await?;

            return Ok(ok("Gambar produk diupload", img));
        }
    }
    Err(AppError::BadRequest("Field 'image' tidak ditemukan".into()))
}

pub async fn delete_product_image(State((pool, _config)): State<(PgPool, Config)>, Path(id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    sqlx::query("DELETE FROM merch_images WHERE id = $1").bind(id).execute(&pool).await?;
    Ok(ok::<()>("Gambar dihapus", ()))
}

