-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 003_phase3_employees_attendance.sql
-- Description: Employee Onboarding, Profiles branch/shift links,
--              join_company_by_code RPC, and Attendance Policies
-- ====================================================================

-- 1. Add branch_id and shift_template_id to public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS shift_template_id UUID REFERENCES public.shift_templates(id) ON DELETE SET NULL;

-- 2. Ensure all branches have a qr_secret for dynamic kiosk token generation
UPDATE public.branches 
SET qr_secret = encode(gen_random_bytes(16), 'hex') 
WHERE qr_secret IS NULL OR qr_secret = '';

ALTER TABLE public.branches 
ALTER COLUMN qr_secret SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- 3. RPC: join_company_by_code
CREATE OR REPLACE FUNCTION public.join_company_by_code(
    p_invite_code TEXT,
    p_full_name TEXT,
    p_national_id TEXT,
    p_nationality TEXT,
    p_job_title TEXT,
    p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_company_name TEXT;
    v_company_status TEXT;
    v_max_employees INTEGER;
    v_current_employee_count INTEGER;
    v_existing_profile_company UUID;
BEGIN
    -- Verify user authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User must be authenticated to join a company.';
    END IF;

    -- Validate required inputs
    IF TRIM(COALESCE(p_invite_code, '')) = '' THEN
        RAISE EXCEPTION 'Company invite code is required.';
    END IF;

    IF TRIM(COALESCE(p_full_name, '')) = '' THEN
        RAISE EXCEPTION 'Full name is required.';
    END IF;

    -- Find company by invite_code
    SELECT id, name, status, max_employees
    INTO v_company_id, v_company_name, v_company_status, v_max_employees
    FROM public.companies
    WHERE UPPER(invite_code) = UPPER(TRIM(p_invite_code));

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code. Company not found.';
    END IF;

    IF v_company_status = 'suspended' THEN
        RAISE EXCEPTION 'This company is currently suspended. Please contact company management.';
    END IF;

    -- Check if user already belongs to another company
    SELECT company_id INTO v_existing_profile_company
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_existing_profile_company IS NOT NULL AND v_existing_profile_company != v_company_id THEN
        RAISE EXCEPTION 'User is already registered with another organization.';
    END IF;

    -- Enforce company max_employees limit
    SELECT COUNT(*) INTO v_current_employee_count
    FROM public.profiles
    WHERE company_id = v_company_id
      AND role IN ('employee', 'branch_supervisor')
      AND status IN ('active', 'pending')
      AND id != v_user_id;

    IF v_current_employee_count >= v_max_employees THEN
        RAISE EXCEPTION 'Company has reached its maximum employee limit (% / %). Please contact your manager to upgrade the subscription.', v_current_employee_count, v_max_employees;
    END IF;

    -- Check unique constraints within company (national_id & phone)
    IF TRIM(COALESCE(p_national_id, '')) != '' THEN
        IF EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE company_id = v_company_id 
              AND national_id = TRIM(p_national_id) 
              AND id != v_user_id
        ) THEN
            RAISE EXCEPTION 'National ID / Iqama is already registered with this company.';
        END IF;
    END IF;

    IF TRIM(COALESCE(p_phone, '')) != '' THEN
        IF EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE company_id = v_company_id 
              AND phone = TRIM(p_phone) 
              AND id != v_user_id
        ) THEN
            RAISE EXCEPTION 'Phone number is already registered with this company.';
        END IF;
    END IF;

    -- Upsert profile with role = 'employee' and status = 'pending'
    INSERT INTO public.profiles (
        id,
        company_id,
        role,
        full_name,
        national_id,
        nationality,
        job_title,
        phone,
        status,
        created_at
    ) VALUES (
        v_user_id,
        v_company_id,
        'employee',
        TRIM(p_full_name),
        NULLIF(TRIM(p_national_id), ''),
        NULLIF(TRIM(p_nationality), ''),
        NULLIF(TRIM(p_job_title), ''),
        NULLIF(TRIM(p_phone), ''),
        'pending',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        role = 'employee',
        full_name = EXCLUDED.full_name,
        national_id = EXCLUDED.national_id,
        nationality = EXCLUDED.nationality,
        job_title = EXCLUDED.job_title,
        phone = EXCLUDED.phone,
        status = 'pending';

    RETURN jsonb_build_object(
        'success', true,
        'company_id', v_company_id,
        'company_name', v_company_name,
        'role', 'employee',
        'status', 'pending'
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.join_company_by_code(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. Attendance Check-out update policy for employees
DROP POLICY IF EXISTS "Employees can check out their own attendance logs" ON public.attendance_logs;
CREATE POLICY "Employees can check out their own attendance logs"
    ON public.attendance_logs FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        AND employee_id = auth.uid()
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND employee_id = auth.uid()
    );

-- 5. Helper function for counting weekly grace uses
CREATE OR REPLACE FUNCTION public.get_weekly_grace_count(p_employee_id UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.attendance_logs
    WHERE employee_id = p_employee_id
      AND grace_used = true
      AND shift_date >= (p_date - ((EXTRACT(DOW FROM p_date)::INTEGER + 1) % 7 || ' days')::INTERVAL)::DATE
      AND shift_date <= p_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_grace_count(UUID, DATE) TO authenticated;
