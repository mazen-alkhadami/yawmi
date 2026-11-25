-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 007_v101_employee_experience_and_pwa.sql
-- Description: PWA Install Tracking, Company Announcements,
--              Annual Leave Balance, and Interactive Product Tour state
-- ====================================================================

-- 1. Create public.pwa_installs table
CREATE TABLE IF NOT EXISTS public.pwa_installs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    role TEXT,
    platform TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pwa_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert own pwa_installs" ON public.pwa_installs;
CREATE POLICY "Authenticated users can insert own pwa_installs"
    ON public.pwa_installs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Super admins can view all pwa_installs" ON public.pwa_installs;
CREATE POLICY "Super admins can view all pwa_installs"
    ON public.pwa_installs FOR SELECT
    TO authenticated
    USING (public.get_my_role() = 'super_admin' OR user_id = auth.uid());

-- 2. Create public.announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_announcements_company_created
    ON public.announcements (company_id, created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read announcements" ON public.announcements;
CREATE POLICY "Company members can read announcements"
    ON public.announcements FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        OR public.get_my_role() = 'super_admin'
    );

DROP POLICY IF EXISTS "Company managers can insert announcements" ON public.announcements;
CREATE POLICY "Company managers can insert announcements"
    ON public.announcements FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_manager', 'branch_supervisor', 'super_admin')
    );

DROP POLICY IF EXISTS "Company managers can update announcements" ON public.announcements;
CREATE POLICY "Company managers can update announcements"
    ON public.announcements FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_manager', 'branch_supervisor', 'super_admin')
    );

DROP POLICY IF EXISTS "Company managers can delete announcements" ON public.announcements;
CREATE POLICY "Company managers can delete announcements"
    ON public.announcements FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_manager', 'branch_supervisor', 'super_admin')
    );

-- 3. Add annual_leave_balance and has_completed_tour to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS annual_leave_balance INTEGER NOT NULL DEFAULT 21,
ADD COLUMN IF NOT EXISTS has_completed_tour BOOLEAN NOT NULL DEFAULT false;

-- Safe guard if public.employees exists in any environment
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'employees'
    ) THEN
        EXECUTE 'ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS annual_leave_balance INTEGER DEFAULT 21';
    END IF;
END $$;
