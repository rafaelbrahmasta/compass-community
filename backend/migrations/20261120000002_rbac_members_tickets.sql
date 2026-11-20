-- Migration: RBAC, Members, Ticket Purchases
-- Tambah kolom role dan is_active ke admins
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'admin_1';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Update super_admin (admin pertama yang ada) ke role super_admin
UPDATE admins SET role = 'super_admin' WHERE id = (SELECT id FROM admins ORDER BY created_at ASC LIMIT 1);

-- Tabel members (anggota komunitas)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_code VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence untuk auto-generate member_code (CMP-0001, CMP-0002, dst)
CREATE SEQUENCE IF NOT EXISTS member_code_seq START 1;

-- Tabel ticket_purchases (pembelian tiket oleh anggota)
CREATE TABLE IF NOT EXISTS ticket_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(30) NOT NULL UNIQUE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT,
    price NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'menunggu_pembayaran',
    -- status: menunggu_pembayaran, lunas, dibatalkan, sudah_checkin
    qr_payload TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    CONSTRAINT unique_member_match UNIQUE (member_id, match_id)
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_member ON ticket_purchases(member_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_match ON ticket_purchases(match_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_status ON ticket_purchases(status);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_code ON ticket_purchases(ticket_code);
CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
