-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 001_initial_schema.sql
-- Description: Core 11 Tables, Security Definer RLS Helpers, & Policies
-- ====================================================================

-- 1. Helper extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean teardown if needed (for fresh setup)
-- DROP TABLE IF EXISTS public.employee_history CASCADE;
-- DROP TABLE IF EXISTS public.attendance_logs CASCADE;
-- DROP TABLE IF EXISTS public.requests CASCADE;
-- DROP TABLE IF EXISTS public.monthly_reports CASCADE;
-- DROP TABLE IF EXISTS public.branch_supervisors CASCADE;
-- DROP TABLE IF EXISTS public.shift_templates CASCADE;
-- DROP TABLE IF EXISTS public.branches CASCADE;
-- DROP TABLE IF EXISTS public.upgrade_requests CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.companies CASCADE;
-- DROP TABLE IF EXISTS public.platform_settings CASCADE;

-- --------------------------------------------------------------------
-- TABLE 1: companies
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#4F46E5',
    invite_code TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'business')),
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_employees INTEGER NOT NULL DEFAULT 5,
    custom_limits JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    subscription_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- TABLE 2: profiles
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'company_manager', 'branch_supervisor', 'employee')),
    full_name TEXT NOT NULL,
    national_id TEXT,
    nationality TEXT,
    job_title TEXT,
    phone TEXT,
    hire_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    device_id TEXT,
    supervisor_permissions JSONB DEFAULT '{"can_approve_employees": false, "can_exceed_edit_limit": false, "can_close_month": false}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_company_national_id UNIQUE (company_id, national_id),
    CONSTRAINT uq_company_phone UNIQUE (company_id, phone)
);

-- --------------------------------------------------------------------
-- TABLE 3: branches
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    qr_secret TEXT,
    require_selfie BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- TABLE 4: branch_supervisors
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branch_supervisors (
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (branch_id, supervisor_id)
);

-- --------------------------------------------------------------------
-- TABLE 5: shift_templates
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_dual_shift BOOLEAN NOT NULL DEFAULT false,
    shift1_start TIME NOT NULL,
    shift1_end TIME NOT NULL,
    shift2_start TIME,
    shift2_end TIME,
    grace_minutes INTEGER NOT NULL DEFAULT 15,
    weekly_grace_limit INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- TABLE 6: attendance_logs
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    selfie_url TEXT,
    late_minutes INTEGER NOT NULL DEFAULT 0,
    grace_used BOOLEAN NOT NULL DEFAULT false,
    overtime_minutes INTEGER NOT NULL DEFAULT 0,
    overtime_approved BOOLEAN NOT NULL DEFAULT false,
    is_manual_edit BOOLEAN NOT NULL DEFAULT false,
    edit_reason TEXT,
    edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- TABLE 7: requests
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('manual_edit', 'leave', 'permission', 'shift_change', 'device_reset', 'salary_confirmation')),
    direction TEXT NOT NULL DEFAULT 'outgoing' CHECK (direction IN ('outgoing', 'incoming')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'confirmed')),
    payload JSONB DEFAULT '{}'::jsonb,
    attachment_url TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- TABLE 8: monthly_reports
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'submitted', 'approved', 'closed')),
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ,
    is_exceptional_close BOOLEAN NOT NULL DEFAULT false,
    close_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- TABLE 9: employee_history
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('promotion', 'transfer')),
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- TABLE 10: upgrade_requests
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    requested_plan TEXT NOT NULL CHECK (requested_plan IN ('pro', 'business')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------------------
-- TABLE 11: platform_settings
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commercial_reg_number TEXT,
    freelance_cert_number TEXT,
    sbc_verification_url TEXT,
    bank_transfer_details JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- RLS RECURSION PREVENTION HELPER FUNCTIONS
-- ====================================================================

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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 1. COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to companies"
    ON public.companies FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Members can view their own company"
    ON public.companies FOR SELECT
    TO authenticated
    USING (id = public.get_my_company_id());

CREATE POLICY "Company managers can update their own company"
    ON public.companies FOR UPDATE
    TO authenticated
    USING (
        id = public.get_my_company_id() 
        AND public.get_my_role() IN ('company_manager', 'super_admin')
    )
    WITH CHECK (
        id = public.get_my_company_id() 
        AND public.get_my_role() IN ('company_manager', 'super_admin')
    );

-- 2. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Users can view profile in same company or self"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR company_id = public.get_my_company_id()
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Company managers can manage profiles in company"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        public.get_my_role() = 'company_manager' 
        AND company_id = public.get_my_company_id()
    )
    WITH CHECK (
        public.get_my_role() = 'company_manager' 
        AND company_id = public.get_my_company_id()
    );

-- 3. BRANCHES
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to branches"
    ON public.branches FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Company members can read branches"
    ON public.branches FOR SELECT
    TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Company managers can manage branches"
    ON public.branches FOR ALL
    TO authenticated
    USING (
        public.get_my_role() = 'company_manager' 
        AND company_id = public.get_my_company_id()
    )
    WITH CHECK (
        public.get_my_role() = 'company_manager' 
        AND company_id = public.get_my_company_id()
    );

-- 4. BRANCH SUPERVISORS
ALTER TABLE public.branch_supervisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to branch supervisors"
    ON public.branch_supervisors FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Company members can view branch supervisors"
    ON public.branch_supervisors FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.branches b 
            WHERE b.id = branch_id 
            AND b.company_id = public.get_my_company_id()
        )
    );

CREATE POLICY "Company managers can manage branch supervisors"
    ON public.branch_supervisors FOR ALL
    TO authenticated
    USING (
        public.get_my_role() = 'company_manager' 
        AND EXISTS (
            SELECT 1 FROM public.branches b 
            WHERE b.id = branch_id 
            AND b.company_id = public.get_my_company_id()
        )
    );

-- 5. SHIFT TEMPLATES
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to shift templates"
    ON public.shift_templates FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Company members can view shift templates"
    ON public.shift_templates FOR SELECT
    TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Company managers can manage shift templates"
    ON public.shift_templates FOR ALL
    TO authenticated
    USING (
        public.get_my_role() = 'company_manager' 
        AND company_id = public.get_my_company_id()
    )
    WITH CHECK (
        public.get_my_role() = 'company_manager' 
        AND company_id = public.get_my_company_id()
    );

-- 6. ATTENDANCE LOGS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to attendance logs"
    ON public.attendance_logs FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Company members can read attendance logs"
    ON public.attendance_logs FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_manager', 'branch_supervisor')
            OR employee_id = auth.uid()
        )
    );

CREATE POLICY "Employees can insert their own attendance logs"
    ON public.attendance_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND employee_id = auth.uid()
    );

CREATE POLICY "Company managers can modify attendance logs"
    ON public.attendance_logs FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() IN ('company_manager', 'branch_supervisor')
    );

-- 7. REQUESTS
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to requests"
    ON public.requests FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Company members can view relevant requests"
    ON public.requests FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_manager', 'branch_supervisor')
            OR employee_id = auth.uid()
        )
    );

CREATE POLICY "Employees can create outgoing requests"
    ON public.requests FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND employee_id = auth.uid()
    );

CREATE POLICY "Managers and supervisors can update requests"
    ON public.requests FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() IN ('company_manager', 'branch_supervisor')
    );

-- 8. MONTHLY REPORTS
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to monthly reports"
    ON public.monthly_reports FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Company members can view monthly reports"
    ON public.monthly_reports FOR SELECT
    TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Managers and supervisors can manage monthly reports"
    ON public.monthly_reports FOR ALL
    TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() IN ('company_manager', 'branch_supervisor')
    );

-- 9. EMPLOYEE HISTORY
ALTER TABLE public.employee_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to employee history"
    ON public.employee_history FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Company members can view employee history"
    ON public.employee_history FOR SELECT
    TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Managers can manage employee history"
    ON public.employee_history FOR ALL
    TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() = 'company_manager'
    );

-- 10. UPGRADE REQUESTS
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to upgrade requests"
    ON public.upgrade_requests FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Company managers can view and submit upgrade requests"
    ON public.upgrade_requests FOR SELECT
    TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Company managers can insert upgrade requests"
    ON public.upgrade_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() = 'company_manager'
    );

-- 11. PLATFORM SETTINGS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view platform settings"
    ON public.platform_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Super admins can manage platform settings"
    ON public.platform_settings FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin');
