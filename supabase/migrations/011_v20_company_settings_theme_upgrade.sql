-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 011_v20_company_settings_theme_upgrade.sql
-- Description: Full Company Profile columns, Employee/Supervisor
--              theme_color, Super Admin dynamic support contact fields,
--              and company-logos storage bucket
-- ====================================================================

-- 1. Add missing Company Profile columns to public.companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS commercial_register TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Add theme_color to public.profiles for Employee & Supervisor theme preference
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme_color TEXT;

-- 3. Add dynamic support contact columns to public.platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS support_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS support_email TEXT;

-- 4. Ensure company-logos storage bucket exists with public read & authenticated upload
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for company logos" ON storage.objects;
CREATE POLICY "Public read access for company logos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload company logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
CREATE POLICY "Authenticated users can update company logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'company-logos');
