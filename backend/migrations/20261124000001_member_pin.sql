-- Migration: Tambah kolom pin_hash untuk keamanan autentikasi anggota saat memesan tiket
ALTER TABLE members ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
