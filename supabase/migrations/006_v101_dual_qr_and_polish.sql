-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 006_v101_dual_qr_and_polish.sql
-- Description: Dual QR Mode, Static QR Token, & Employee Email Sync
-- ====================================================================

-- 1. Dual QR Mode & Static QR Token on branches
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS qr_mode TEXT NOT NULL DEFAULT 'dynamic_kiosk' CHECK (qr_mode IN ('dynamic_kiosk', 'static_printable')),
ADD COLUMN IF NOT EXISTS static_qr_token TEXT;

-- Generate static_qr_token for any existing branches that do not have one
UPDATE public.branches 
SET static_qr_token = encode(gen_random_bytes(16), 'hex') 
WHERE static_qr_token IS NULL OR static_qr_token = '';

ALTER TABLE public.branches 
ALTER COLUMN static_qr_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- 2. Add email to profiles for administrative search & password reset
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Sync email from auth.users if available
DO $$
BEGIN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

