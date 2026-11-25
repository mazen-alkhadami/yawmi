-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 010_v20_fixes_and_step2.sql
-- Description: Email sync trigger, requests.updated_at trigger,
--              public.audit_logs table + RLS, and Realtime attendance
-- ====================================================================

-- 1. Ensure profiles.email exists & sync automatically for new/updated profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill any remaining null emails from auth.users
DO $$
BEGIN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Trigger on public.profiles (BEFORE INSERT OR UPDATE) to auto-populate email from auth.users
CREATE OR REPLACE FUNCTION public.populate_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.email IS NULL OR NEW.email = '' THEN
        SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_profile_email ON public.profiles;
CREATE TRIGGER trg_populate_profile_email
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.populate_profile_email();

-- Safe optional trigger on auth.users if email changes
CREATE OR REPLACE FUNCTION public.sync_auth_user_email_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE public.profiles
    SET email = NEW.email
    WHERE id = NEW.id AND (email IS DISTINCT FROM NEW.email);
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    DROP TRIGGER IF EXISTS trg_sync_auth_email_to_profile ON auth.users;
    CREATE TRIGGER trg_sync_auth_email_to_profile
        AFTER INSERT OR UPDATE OF email ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_auth_user_email_to_profile();
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Add updated_at to public.requests with auto_update_timestamp trigger
ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE OR REPLACE FUNCTION public.auto_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_requests_updated_at ON public.requests;
CREATE TRIGGER trg_requests_updated_at
    BEFORE UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_update_timestamp();

-- 3. Create public.audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    actor_role TEXT,
    action_type TEXT NOT NULL,
    target_summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
    ON public.audit_logs (company_id, created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company admins can view company audit logs" ON public.audit_logs;
CREATE POLICY "Company admins can view company audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        public.get_my_role() = 'super_admin'
        OR (
            company_id = public.get_my_company_id()
            AND public.get_my_role() IN ('company_manager', 'branch_supervisor')
        )
    );

DROP POLICY IF EXISTS "Admins and supervisors can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins and supervisors can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_manager', 'branch_supervisor', 'super_admin')
    );

-- 4. Enable Supabase Realtime on public.attendance_logs for Live Attendance Now
ALTER TABLE public.attendance_logs REPLICA IDENTITY FULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'attendance_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
