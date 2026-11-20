-- Migration: Tambah kolom is_active pada ticket_categories
ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;