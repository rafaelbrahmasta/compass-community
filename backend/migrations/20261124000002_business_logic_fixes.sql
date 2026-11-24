-- Migrasi 20261124000002: Perbaikan Logika Bisnis
-- 1. Pengaturan Rekening Khusus Tiket (terpisah dari donasi kemanusiaan)
CREATE TABLE IF NOT EXISTS ticket_bank_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name VARCHAR(100) NOT NULL DEFAULT 'Bank BCA',
    account_name VARCHAR(100) NOT NULL DEFAULT 'COMPASS TIKET OFFICIAL',
    account_number VARCHAR(100) NOT NULL DEFAULT '9876543210',
    qr_image_url TEXT,
    instructions TEXT DEFAULT 'Silakan transfer tepat sesuai jumlah Total Pembayaran termasuk 3 digit kode unik untuk verifikasi otomatis/cepat.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data awal rekening tiket jika belum ada
INSERT INTO ticket_bank_settings (bank_name, account_name, account_number, instructions)
SELECT 'Bank BCA', 'COMPASS TIKET RESMI', '9876543210', 'Transfer tepat hingga 3 digit terakhir. Simpan bukti transfer Anda.'
WHERE NOT EXISTS (SELECT 1 FROM ticket_bank_settings);

-- 2. Kolom kode unik, total nominal, dan bukti transfer pada ticket_purchases
ALTER TABLE ticket_purchases
ADD COLUMN IF NOT EXISTS unique_code INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Update record yang sudah ada agar total_price = price
UPDATE ticket_purchases SET total_price = price WHERE total_price = 0;

-- 3. Kolom retry_count dan last_error pada reminders untuk mencegah spam loop tak terbatas
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT;
