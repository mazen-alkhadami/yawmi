-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 008_fix_announcements_rls_and_notifications.sql
-- Description: Fix table-level GRANTs and SECURITY DEFINER RLS policies
--              on public.announcements and public.pwa_installs
-- ====================================================================

-- 1. Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT ON public.pwa_installs TO authenticated;

-- 2. Ensure safe SECURITY DEFINER helpers exist
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;

-- 3. Re-create RLS policies on public.announcements
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
    )
    WITH CHECK (
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
