# COMPASS — Super App Komunitas Pendukung PSS Sleman

> **Super App** portal dan sistem informasi resmi komunitas suporter sepak bola PSS Sleman (**COMPASS**). Dibangun dari nol dengan arsitektur modern berkinerja tinggi menggunakan **Rust (Axum)** pada backend dan **React + TypeScript + Tailwind CSS** pada frontend. Seluruh antarmuka berbahasa Indonesia dengan nuansa sporty, bold, dan elegan.

---

## 🎨 Palet Desain, Tipografi & Animasi
- **Primary Green**: `#0B3D2E` & `#072A20` (Warna kebanggaan PSS Sleman & COMPASS)
- **Golden Brown**: `#B8860B` & `#A67C00` (Aksen tombol, border, garis pembatas, dan badge)
- **Dark Surface**: `#060A08`, `#0A100D` & `#0B120E` (Nuansa gelap modern dengan kontras teks terang)
- **Tipografi**: Heading `Oswald`, Body `Inter`
- **Ikon**: Seragam menggunakan `lucide-react` (stroke tipis 1.5) di seluruh website publik dan dashboard admin.
- **Animasi Scroll**: Reusable hook `useInView` & komponen `<Reveal>` berbasis Intersection Observer dengan durasi 600ms, transisi halus `cubic-bezier(0.16, 1, 0.3, 1)`, dan otomatis menghormati setelan `prefers-reduced-motion`.
- **Navbar Efek**: Transisi otomatis background blur dan bayangan gelap saat halaman di-scroll turun.
- **Footer Responsif**: Layout CSS Grid 4 kolom horizontal di desktop (brand & medsos, navigasi menu, kontak resmi, sekretariat & aksi sosial), 2 kolom di tablet, 1 kolom di mobile, dengan baris hak cipta bergaris emas tipis di bagian paling bawah.

---

## 🧱 Arsitektur & Tech Stack

### Backend (Rust)
- **Framework Web**: Axum 0.7 & Tokio runtime async
- **Database & Migration**: SQLx 0.8 (PostgreSQL 16) dengan automigrasi startup:
  1. `20261120000001_init.sql` — Skema dasar tabel portal
  2. `20261120000002_rbac_members_tickets.sql` — RBAC admin, members, ticket_purchases
  3. `20261120000003_ticket_categories_active.sql` — Status aktif kategori tiket
  4. `20261124000001_member_pin.sql` — Kolom PIN anggota
  5. `20261124000002_business_logic_fixes.sql` — Rekening tiket terpisah, kode unik nominal, bukti transfer, dan retry reminder
- **Autentikasi & RBAC**: Argon2 password hashing, JWT (jsonwebtoken) dengan klaim `sub`, `email`, `name`, dan `role`. Middleware otorisasi `require_super_admin` & `require_any_admin` di level route backend (balas HTTP 403 bila role tidak berhak) serta pengecekan aktif status per request.
- **Keamanan Siber**:
  - Sanitasi Stored XSS dengan `ammonia` (backend) & `DOMPurify` (frontend)
  - Rate Limiter per client IP (login 5 attempt/15 menit, api 120 req/menit)
  - Masking nomor HP dan nama pada endpoint publik `/tickets/check`
  - Validasi signature magic bytes biner file upload (JPEG, PNG, WebP)
  - Security Headers (CSP, Frame-Options DENY, X-Content-Type-Options nosniff)
- **Layanan Background & Scheduler**:
  - Scheduler pengiriman email otomatis reminder laga via SMTP (`lettre`) non-blocking (`spawn_blocking`) dengan retry limit max 3x.
  - Scheduler pembatalan otomatis tiket expired yang belum dibayar lewat batas waktu 24 jam menggunakan CTE atomik tunggal (mengembalikan kuota tiket secara presisi).
- **File Upload**: Axum Multipart dengan validator magic bytes biner dan batas ukuran file 5 MB.

### Frontend (React + TypeScript)
- **Bundler & Tooling**: Vite 6 + TypeScript (strict mode)
- **Styling**: Tailwind CSS + Custom Design Tokens
- **Ikon**: `lucide-react` (stroke 1.5)
- **QR Code Rendering**: `qrcode.react` (SVG rendering)
- **State & Caching**: TanStack Query (React Query v5)
- **Routing & Guard**: React Router DOM v6 + `ProtectedRoute` dengan verifikasi role (RBAC)
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
│   ├── migrations/                              # 5 Skema migrasi database SQLx
│   ├── tests/                                   # Integration & Unit tests
│   ├── uploads/                                 # File statis (gallery, news, merch, proof, qr)
│   └── src/
│       ├── main.rs                              # Startup, CORS, Security Headers, Tracing
│       ├── config.rs                            # Env loader
│       ├── db.rs                                # Connection pool PgPool
│       ├── errors.rs                            # AppError (400, 401, 403, 404, 409, 429, 500)
│       ├── scheduler.rs                         # Atomic CTE cancellation & non-blocking SMTP
│       ├── models/                              # Struct DB (Admin, Member, TicketPurchase, dll)
│       ├── routes/                              # Route builder (public.rs & admin.rs)
│       ├── handlers/                            # Controller modules
│       ├── middleware/                          # auth_middleware & role guards
│       ├── services/seeder.rs                   # Seeder akun default & anggota demo
│       └── utils/                               # JWT, upload magic bytes, slugify, email async
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── public/                                  # Favicon & 50x.html error page
│   └── src/
│       ├── components/                          # Navbar, Footer (4 kolom), Reveal, Modal...
│       ├── layouts/                             # PublicLayout, AdminLayout
│       ├── pages/
│       │   ├── public/                          # Home, Tiket, CekTiket, Merch, Gallery...
│       │   └── admin/                           # Kelola Anggota, Admin, Tiket, Laga, dll.
│       ├── services/endpoints.ts                # Axios instance & REST endpoints
│       └── context/AuthContext.tsx              # Autentikasi JWT & Role Context
├── .github/workflows/ci.yml                     # Otomatisasi GitHub Actions CI
├── scripts/                                     # Script backup database
├── docker-compose.yml
└── README.md
```

---

## 🚀 Panduan Menjalankan Sistem

### Opsi A: Menjalankan dengan Docker Compose (Rekomendasi Production)

```bash
docker compose up -d --build
```
- **Frontend & Web Server (Nginx)**: `http://localhost:80`
- **Backend API**: `http://localhost:80/api/v1`
- **PostgreSQL**: `localhost:5432`

---

### Opsi B: Menjalankan Secara Lokal (Development)

#### 1. Persiapan Database PostgreSQL
Pastikan database PostgreSQL 16 berjalan di port `5432` (atau `5433` untuk cluster lokal), dan sesuaikan URL di `backend/.env`:
```bash
DATABASE_URL=postgres://compass:compass123@localhost:5433/compass_db
```

#### 2. Menjalankan Backend (Rust)
```bash
cd backend
cargo run
# Server berjalan di http://localhost:8080/api/v1
```
*Catatan: Saat backend pertama kali dijalankan, migrasi database dijalankan otomatis, dan seeder langsung menginisialisasi akun admin default serta contoh anggota komunitas.*

#### 3. Menjalankan Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Website aktif di http://localhost:5173
```

---

## 🔐 Akun Administrator & Role-Based Access Control (RBAC)

Terdapat 3 tingkatan peran (role) dalam sistem:
1. **`super_admin`**: Akses penuh ke seluruh modul sistem. Mengelola akun admin, mengelola data anggota, mengonfirmasi transaksi pembayaran tiket, scan check-in gerbang stadion, mengatur kuota tiket, rekening pembayaran tiket resmi, donasi Humanity, dan pengaturan situs.
2. **`admin_1`** & **`admin_2`**: Dibatasi **HANYA** untuk pengelolaan konten informasi publik (Berita, Hero Carousel, About Us/Pengurus, Sejarah Timeline, Agenda Acara, Gallery Foto, Merchandise, dan Pesan Kontak). Dilarang keras mengakses modul sensitif (backend mengembalikan respons HTTP `403 Forbidden`).

### Kredensial Default:

| Peran (Role) | Email | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@compass.id` | `Admin@compass123` | Akses Penuh ke Semua Fitur & Transaksi |
| **Admin Konten 1** | `admin1@compass.id` | `Admin1@compass123` | Kelola Konten & Informasi Publik |
| **Admin Konten 2** | `admin2@compass.id` | `Admin2@compass123` | Kelola Konten & Informasi Publik |

*(Semua password dapat diubah melalui menu **Ganti Password** di dashboard admin)*

---

## 🎟️ Alur Pembelian & Verifikasi Tiket Langsung

Sistem pembelian tiket berjalan mandiri langsung di website:
1. **Validasi Anggota & PIN**: Pengunjung memilih kategori tribun, lalu memasukkan **Kode Anggota** (misal: `CMP-0002`), **Nomor HP Terdaftar**, dan **PIN 6 Digit** (secara default berupa 6 digit terakhir nomor HP suporter).
2. **Pemesanan & Reservasi Kuota**: Kuota tiket terpotong secara atomik dengan status `menunggu_pembayaran` dan batas waktu pembayaran **24 jam**.
3. **Instruksi Pembayaran & Kode Unik**: Sistem menyajikan nomor rekening resmi tiket COMPASS (Bank BCA / COMPASS TIKET RESMI), 3 digit kode unik nominal (misal: Rp 75.387), dan petunjuk transfer.
4. **Unggah Bukti Pembayaran**: Suporter dapat mengunggah foto bukti transfer langsung di menu **Cek Tiket** (`/tiket/cek`).
5. **Pembatalan Otomatis (Scheduler)**: Background worker secara berkala membatalkan tiket yang kedaluwarsa dalam satu query CTE atomik dan mengembalikan kuota tiket secara akurat.
6. **Scan & Check-in di Stadion**: Setelah admin memverifikasi bukti transfer dan status tiket menjadi `lunas`, QR code tiket aktif. Panitia pintu masuk memindai QR code via panel admin `/admin/pembayaran-tiket`. Sistem mencegah tiket laga yang sudah lewat atau tiket yang sudah pernah digunakan agar tidak disalahgunakan.

---

## 💾 Backup Database

Gunakan script backup yang disediakan untuk mencadangkan database secara berkala:
- **Linux / macOS**: `./scripts/backup-db.sh`
- **Windows (PowerShell)**: `.\scripts\backup-db.ps1`

File backup SQL akan otomatis tersimpan dengan format timestamp di folder `backups/`.

---

## 🧪 Pengujian & Otomatisasi CI

- **Backend Rust**: `cargo test` lulus 100%.
- **Frontend React**: `npm run build` lulus 100% tanpa error TypeScript.
- **GitHub Actions**: Pipeline otomatis di `.github/workflows/ci.yml` memvalidasi build & test pada setiap push/PR.
