-- Migration: Tambah kolom is_active pada ticket_categories
-- dan perbaiki unique constraint ticket_purchases untuk izinkan beli ulang setelah dibatalkan
ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Drop constraint unique_member_match lama (mencegah beli ulang setelah dibatalkan)
ALTER TABLE ticket_purchases DROP CONSTRAINT IF EXISTS unique_member_match;

-- Buat partial unique index: hanya berlaku untuk tiket yang BELUM dibatalkan
CREATE UNIQUE INDEX IF NOT EXISTS uniq_member_match_active
  ON ticket_purchases(member_id, match_id) WHERE status <> 'dibatalkan';