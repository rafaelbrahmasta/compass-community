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
- **Database & Migration**: SQLx 0.8 (PostgreSQL 16) dengan automigrasi startup (`20261120000001_init.sql` & `20261120000002_rbac_members_tickets.sql`)
- **Autentikasi & RBAC**: Argon2 password hashing, JWT (jsonwebtoken) membawa claims `sub`, `email`, `name`, dan `role`. Middleware otorisasi `require_super_admin` & `require_any_admin` di level route backend (balas HTTP 403 bila role tidak berhak).
- **Layanan Background**: `tokio-cron-scheduler`:
  - Scheduler pengiriman email otomatis reminder laga via SMTP (`lettre`)
  - Scheduler pembatalan otomatis tiket expired yang belum dibayar lewat batas waktu 24 jam (`expires_at <= NOW()`) serta pengembalian kuota tiket.
- **File Upload**: Axum Multipart dengan validasi tipe mime (JPG, PNG, WebP) dan batas ukuran file.

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
│   ├── migrations/
│   │   ├── 20261120000001_init.sql              # Skema awal (18 tabel)
│   │   └── 20261120000002_rbac_members_tickets.sql # RBAC, members, ticket_purchases
│   ├── uploads/                                 # File statis disajikan di /uploads
│   │   ├── gallery/
│   │   ├── news/
│   │   ├── merch/
│   │   └── qr/
│   └── src/
│       ├── main.rs                              # Startup, CORS, Tracing, Scheduler
│       ├── config.rs                            # Env loader
│       ├── db.rs                                # Connection pool PgPool
│       ├── errors.rs                            # AppError (401, 403 Forbidden, 400, 404, 500)
│       ├── scheduler.rs                         # Email reminder & auto cancel tiket expired
│       ├── models/                              # Struct DB (Admin, Member, TicketPurchase, dll)
│       ├── routes/                              # Route builder (public.rs & admin.rs)
│       ├── handlers/                            # 20 Controller modules
│       │   ├── auth.rs                          # Login, me, change password
│       │   ├── members.rs                       # CRUD anggota, import CSV, export CSV
│       │   ├── tickets_purchase.rs              # Pembelian tiket & cek tiket publik
│       │   ├── admin_tickets.rs                 # Kelola pesanan tiket & check-in QR
│       │   ├── admin_admins.rs                  # Kelola akun admin (super_admin only)
│       │   └── ... (carousel, matches, news...)
│       ├── middleware/                          # auth_middleware & role guards
│       ├── services/seeder.rs                   # Seeder data awal & akun admin default
│       └── utils/                               # JWT, upload, slugify
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── components/
│       │   ├── common/                          # Navbar, Footer (4 kolom), Reveal, Modal...
│       │   └── home/                            # HeroCarousel, TimelineSection, HumanitySection...
│       ├── layouts/                             # PublicLayout, AdminLayout (Role-based Sidebar)
│       ├── pages/
│       │   ├── public/
│       │   │   ├── Home.tsx                     # Hero, About, Sejarah, Humanity, Berita
│       │   │   ├── Tiket.tsx                    # Laga H-4, Modal Beli Tiket Langsung
│       │   │   ├── CekTiket.tsx                 # Pencarian & QR Code Check-in suporter
│       │   │   ├── Merchandise.tsx / Detail
│       │   │   ├── Gallery.tsx, Agenda.tsx, Jadwal.tsx, Berita.tsx, Contact.tsx
│       │   └── admin/
│       │       ├── AdminAnggota.tsx             # Kelola Anggota (Import/Export CSV)
│       │       ├── AdminKelolaAdmin.tsx         # Kelola Admin (super_admin, admin_1, admin_2)
│       │       ├── AdminPembayaranTiket.tsx     # Pesanan Tiket, Status & Scan Check-in
│       │       ├── AdminTiket.tsx, AdminJadwal.tsx, AdminCarousel.tsx, dll.
│       ├── services/endpoints.ts                # Axios instance & REST endpoints
│       └── context/AuthContext.tsx              # Autentikasi JWT & Role Context
├── docker-compose.yml
└── README.md
```

---

## 🚀 Panduan Menjalankan Sistem

### 1. Persiapan Database PostgreSQL
Pastikan database PostgreSQL 16 berjalan di port `5433` (atau sesuai konfigurasi `.env`):
```powershell
& "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "d:\Project\compass-community\pgdata"
```

### 2. Menjalankan Backend (Rust)
```powershell
cd d:\Project\compass-community\backend
cargo run
# Server berjalan di http://localhost:8080/api/v1
```
*Catatan: Saat backend pertama kali dijalankan, migrasi database dijalankan otomatis, dan seeder langsung menginisialisasi akun admin default serta contoh anggota komunitas.*

### 3. Menjalankan Frontend (React + Vite)
```powershell
cd d:\Project\compass-community\frontend
npm run dev
# Website aktif di http://localhost:5173
```

---

## 🔐 Akun Administrator & Role-Based Access Control (RBAC)

Terdapat 3 tingkatan peran (role) dalam sistem:
1. **`super_admin`**: Akses penuh ke seluruh modul sistem. Satu-satunya peran yang berhak mengelola akun admin, mengelola data anggota, mengonfirmasi transaksi pembayaran tiket, melakukan scan check-in di stadion, mengatur kuota tiket laga, mengelola keuangan donasi Humanity, dan pengaturan situs.
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

Sistem pembelian tiket telah dimodernisasi sepenuhnya **tanpa perantara Google Form**:
1. **Validasi Anggota**: Pengunjung memilih kategori tribun, lalu memasukkan **Kode Anggota** (misal: `CMP-0001`) dan **Nomor HP Terdaftar**. Sistem memvalidasi keaktifan anggota dan memberlakukan batas tegas **1 tiket per anggota per pertandingan** (ditegakkan via database unique constraint).
2. **Pemesanan & Reservasi Kuota**: Saat pesanan dibuat, kuota kategori tiket langsung terpotong secara atomik dengan status `menunggu_pembayaran` dan batas waktu pembayaran **24 jam**.
3. **Instruksi Pembayaran**: Sistem menyajikan nomor rekening resmi COMPASS, rincian nominal transfer, kode tiket unik (misal: `TCK-20261120-XXXX`), dan QR code.
4. **Pembatalan Otomatis**: Background scheduler memeriksa tiket setiap 5-10 menit. Tiket yang tidak dibayar dalam 24 jam otomatis dibatalkan dan kuotanya dikembalikan ke sistem.
5. **Cek Tiket Saya (`/tiket/cek`)**: Suporter dapat memeriksa status tiket secara mandiri kapan pun dengan memasukkan kode tiket atau kode anggota + nomor HP.
6. **Scan & Check-in di Stadion**: Setelah admin mengonfirmasi status menjadi `lunas`, QR code tiket aktif dan siap discan oleh panitia di stadion melalui panel admin `/admin/pembayaran-tiket`. Tiket yang sudah discan dicatat waktu check-in-nya dan dicegah dari penggunaan ganda.

---

## 👥 Contoh Akun Anggota Terdaftar (Untuk Pengujian Pembelian)

| Kode Anggota | Nama Lengkap | Nomor HP | Email |
| :--- | :--- | :--- | :--- |
| **CMP-0001** | Bagus Prasetyo | `081234567891` | `bagus@gmail.com` |
| **CMP-0002** | Dimas Wahyu | `081234567892` | `dimas@gmail.com` |
| **CMP-0003** | Rizky Pratama | `081234567893` | `rizky@gmail.com` |
| **CMP-0004** | Aditya Nugroho | `081234567894` | `aditya@gmail.com` |
| **CMP-0005** | Farhan Saputra | `081234567895` | `farhan@gmail.com` |

---

## 🧪 Verifikasi Build & Pengujian

- **Backend Rust**: `cargo build` lulus tanpa error (Exit Code 0).
- **Frontend React**: `npm run build` lulus tanpa error TypeScript (Exit Code 0).
- **REST API Test**: Seluruh pengujian otorisasi token JWT, validasi role RBAC, pembuatan tiket langsung, pencarian tiket mandiri, konfirmasi pembayaran, dan validasi check-in stadion berjalan sukses.
