-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 009_v101_targeted_announcements_and_hq.sql
-- Description: Targeted branch-scoped announcements with sender
--              attribution and supervisor RLS enforcement
-- ====================================================================

-- 1. Add branch_id, sender_name, and sender_role to public.announcements
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_role TEXT;

CREATE INDEX IF NOT EXISTS idx_announcements_company_branch_created
    ON public.announcements (company_id, branch_id, created_at DESC);

-- 2. Helper functions for branch-scoped RLS
CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT branch_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_of_branch(p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p_branch_id IS NOT NULL AND (
        p_branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.branch_supervisors
            WHERE supervisor_id = auth.uid() AND branch_id = p_branch_id
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supervisor_of_branch(UUID) TO authenticated;

-- 3. Update RLS policies on public.announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read announcements" ON public.announcements;
CREATE POLICY "Company members can read announcements"
    ON public.announcements FOR SELECT
    TO authenticated
    USING (
        public.get_my_role() = 'super_admin'
        OR (
            company_id = public.get_my_company_id()
            AND (
                public.get_my_role() = 'company_manager'
                OR branch_id IS NULL
                OR branch_id = public.get_my_branch_id()
                OR public.is_supervisor_of_branch(branch_id)
            )
        )
    );

DROP POLICY IF EXISTS "Company managers can insert announcements" ON public.announcements;
CREATE POLICY "Company managers can insert announcements"
    ON public.announcements FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_manager', 'super_admin')
            OR (
                public.get_my_role() = 'branch_supervisor'
                AND branch_id IS NOT NULL
                AND public.is_supervisor_of_branch(branch_id)
            )
        )
    );

DROP POLICY IF EXISTS "Company managers can update announcements" ON public.announcements;
CREATE POLICY "Company managers can update announcements"
    ON public.announcements FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_manager', 'super_admin')
            OR (
                public.get_my_role() = 'branch_supervisor'
                AND branch_id IS NOT NULL
                AND public.is_supervisor_of_branch(branch_id)
            )
        )
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_manager', 'super_admin')
            OR (
                public.get_my_role() = 'branch_supervisor'
                AND branch_id IS NOT NULL
                AND public.is_supervisor_of_branch(branch_id)
            )
        )
    );

DROP POLICY IF EXISTS "Company managers can delete announcements" ON public.announcements;
CREATE POLICY "Company managers can delete announcements"
    ON public.announcements FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_manager', 'super_admin')
            OR (
                public.get_my_role() = 'branch_supervisor'
                AND branch_id IS NOT NULL
                AND public.is_supervisor_of_branch(branch_id)
            )
        )
    );

-- 4. Enable Supabase Realtime for public.announcements
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'announcements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
