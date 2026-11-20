# COMPASS — Super App Komunitas Pendukung PSS Sleman

> **Super App** portal dan pusat informasi resmi komunitas suporter sepak bola PSS Sleman (COMPASS). Dibangun dengan arsitektur modern berkinerja tinggi memakai **Rust (Axum)** pada backend dan **React + TypeScript + Tailwind CSS** pada frontend. Seluruh antarmuka berbahasa Indonesia dengan nuansa sporty, bold, dan elegan.

---

## 🎨 Palet Desain & Tipografi
- **Primary Green**: `#0B3D2E` & `#072A20` (Warna kebanggaan PSS Sleman & COMPASS)
- **Golden Brown**: `#B8860B` & `#A67C00` (Aksen tombol, border, dan sorotan elegan)
- **Dark Surface**: `#0A0A0A` & `#111111` (Nuansa modern gelap dengan kontras teks terang)
- **Tipografi**: Heading `Oswald`, Body `Inter`

---

## 🧱 Arsitektur & Tech Stack

### Backend (Rust)
- **Framework Web**: Axum 0.7 & Tokio runtime async
- **Database & Migration**: SQLx 0.8 (PostgreSQL 16) dengan automigrasi startup
- **Keamanan & Auth**: Argon2 hashing untuk password admin & JWT (JSON Web Tokens)
- **Layanan Background**: `tokio-cron-scheduler` untuk pengiriman email otomatis reminder laga
- **Protokol Email**: `lettre` (SMTP)
- **File Upload**: Axum Multipart dengan validasi tipe mime (JPG, PNG, WebP) dan batas 5MB

### Frontend (React + TypeScript)
- **Bundler & Tooling**: Vite 6 + TypeScript
- **Styling**: Tailwind CSS + Custom Design Tokens
- **State & Caching**: TanStack Query (React Query v5)
- **Routing & Guard**: React Router DOM v6 + ProtectedRoute Admin
- **Rich Media & Lightbox**: `yet-another-react-lightbox`
- **Notifikasi**: `react-hot-toast`

---

## 📂 Struktur Monorepo

```
compass-community/
├── backend/
│   ├── Cargo.toml
│   ├── .env / .env.example
│   ├── Dockerfile
│   ├── migrations/
│   │   └── 20261120000001_init.sql      # 18 tabel database
│   ├── uploads/                         # File statis disajikan di /uploads
│   │   ├── gallery/
│   │   ├── news/
│   │   ├── merch/
│   │   └── qr/
│   └── src/
│       ├── main.rs                      # Startup, CORS, Tracing, Scheduler
│       ├── config.rs                    # Env configuration
│       ├── db.rs                        # Connection pool PgPool
│       ├── errors.rs                    # AppError handling
│       ├── scheduler.rs                 # Scheduler pengirim email reminder
│       ├── models/                      # Struct database rows
│       ├── routes/                      # Route builder (public & admin)
│       ├── handlers/                    # 16 Controller modules
│       ├── middleware/                  # JWT auth guard
│       ├── services/                    # Seeder & business logic
│       └── utils/                       # JWT, upload, slugify
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── components/
│       │   ├── common/                  # Navbar, Footer, Modal, ProtectedRoute...
│       │   ├── home/                    # HeroCarousel, TimelineSection, HumanitySection...
│       ├── layouts/                     # PublicLayout, AdminLayout
│       ├── pages/
│       │   ├── public/                  # Home, About, Tiket, Merchandise, Gallery, Agenda, Jadwal, Berita, Contact
│       │   └── admin/                   # 15 Modul Super Admin
│       ├── services/                    # Axios instance & REST endpoints
│       └── context/                     # AuthContext
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🚀 Panduan Menjalankan

### Cara 1: Menjalankan di Mode Development Lokal

#### 1. Persiapan Database PostgreSQL
Pastikan database PostgreSQL aktif di port 5432 (atau 5433).
```powershell
# Jalankan PostgreSQL di background jika belum berjalan:
& "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "d:\Project\compass-community\pgdata"
```

#### 2. Jalankan Backend (Rust)
```powershell
cd backend
cargo run
# Server REST API aktif di http://localhost:8080/api/v1
```
*Catatan: Saat backend pertama kali dijalankan, migrasi database dan seeder otomatis membuat akun admin default serta data simulasi awal.*

#### 3. Jalankan Frontend (React + Vite)
```powershell
cd frontend
npm run dev
# Website aktif di http://localhost:5173
```

---

### Cara 2: Menjalankan via Docker Compose

```powershell
# Jalankan seluruh stack (Database + Backend + Frontend Nginx):
docker compose up -d --build

# Buka browser:
# Website publik: http://localhost:5173
# API backend:    http://localhost:8080/api/v1
```

---

## 🔐 Akun Super Admin Default

| Parameter | Nilai |
| :--- | :--- |
| **URL Login** | `http://localhost:5173/admin/login` |
| **Email** | `admin@compass.id` |
| **Password** | `Admin@compass123` |

*(Password dapat langsung diubah di menu **Akun Admin** di dashboard)*

---

## 📱 Fitur-Fitur Aplikasi

### Halaman Publik (Tanpa Login)
1. **Beranda (Home)**:
   - Hero Carousel 4 slide gambar bergeser otomatis tiap 3 detik (pause on hover, touch swipe support).
   - Profil singkat komunitas COMPASS.
   - Timeline vertikal sejarah perjalanan komunitas dari tahun ke tahun.
   - Section **Compass for Humanity** dengan modal donasi QR Code (QRIS), info rekening, dan panduan scan.
   - Cuplikan pertandingan terdekat & berita terbaru.
2. **About Us**: Profil komprehensif, visi misi resmi, dan grid struktur pengurus (foto, nama, jabatan).
3. **Tiket**:
   - Menampilkan pertandingan PSS Sleman 4 hari ke depan.
   - Kategori tiket, harga dalam format Rupiah, dan kuota tersisa.
   - Tombol **Beli Tiket** mengarah ke Google Form eksternal per laga.
   - Sistem **Ingatkan Saya** (email & WhatsApp) terjadwal otomatis via backend scheduler.
   - Fitur **Tambah ke Kalender** (unduh berkas `.ics`).
4. **Merchandise**:
   - Katalog dengan filter kategori (Jersey, Kaos, Aksesoris, dll).
   - Badge ketersediaan stok & ukuran (S, M, L, XL, XXL).
   - Halaman detail produk dengan galeri foto, deskripsi, dan tombol order ke formulir Google Form.
5. **Gallery**: Album foto dokumentasi (Matchday, Away Day, Kopdar, Aksi Sosial) dengan tampilan masonry grid dan viewer foto interaktif (Lightbox).
6. **Agenda**: Jadwal forum, kopdar, dan nobar dengan filter bulan dan status.
7. **Jadwal Pertandingan**: Jadwal satu musim penuh 2027 dengan filter bulan, status, skor akhir, dan penanda Home/Away.
8. **Berita**: Warta artikel seputar PSS Sleman dengan paginasi dan halaman detail per slug.
9. **Contact**: Informasi sekretariat, WhatsApp interaktif, Google Maps, dan formulir pengiriman pesan yang langsung tersimpan ke database.

### Dashboard Super Admin (`/admin`)
- **Dashboard Ringkasan**: Statistik berita, merchandise, reminder aktif, pesan masuk, dan laga terdekat.
- **Hero Carousel**: Tambah slide, ubah urutan, aktif/nonaktifkan, dan unggah gambar hero.
- **About Us & Pengurus**: Ubah teks profil dan visi misi, CRUD anggota pengurus + unggah foto.
- **Sejarah Timeline**: CRUD tonggak sejarah komunitas dari tahun ke tahun.
- **Compass for Humanity**: Ubah teks program sosial, rekening donasi, dan unggah gambar QRIS.
- **Jadwal Pertandingan**: CRUD jadwal musim 2027, impor berkas CSV, dan pencatatan skor akhir.
- **Tiket**: Pengaturan kategori tiket per laga dan tautan Google Form pembelian.
- **Reminder**: Pemantauan suporter terdaftar dan status pengiriman email otomatis.
- **Merchandise**: CRUD produk, kelola kategori, ukuran, stok, dan unggah multiple foto.
- **Gallery**: Buat album baru dan unggah banyak foto dokumentasi sekaligus.
- **Agenda**: CRUD jadwal kegiatan forum komunitas.
- **Berita**: Tulis dan kelola artikel berita, kelola status (draft/published), dan unggah thumbnail.
- **Pengaturan Situs**: Kelola nama situs, kontak, alamat, tautan maps, sosial media, dan logo.
- **Pesan Masuk**: Inbox pesan dari pengunjung publik beserta fitur tandai sudah dibaca.
- **Akun Admin**: Perubahan kata sandi administrator.
