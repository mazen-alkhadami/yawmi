-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 002_register_company_rpc.sql
-- Description: Security Definer RPC function for New Company Registration
-- ====================================================================

CREATE OR REPLACE FUNCTION public.register_new_company(
    p_company_name TEXT,
    p_full_name TEXT,
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
    v_invite_code TEXT;
    v_collision BOOLEAN;
    v_counter INTEGER := 0;
BEGIN
    -- 1. Verify user authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User must be authenticated to register a company.';
    END IF;

    -- 2. Validate inputs
    IF TRIM(COALESCE(p_company_name, '')) = '' THEN
        RAISE EXCEPTION 'Company name cannot be empty.';
    END IF;

    IF TRIM(COALESCE(p_full_name, '')) = '' THEN
        RAISE EXCEPTION 'Manager full name cannot be empty.';
    END IF;

    -- 3. Check if profile already associated with an active company
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_company_id IS NOT NULL THEN
        RAISE EXCEPTION 'User already belongs to an existing company.';
    END IF;

    -- 4. Generate a unique 6-character uppercase invite code
    LOOP
        v_invite_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
        SELECT EXISTS(SELECT 1 FROM public.companies WHERE invite_code = v_invite_code) INTO v_collision;
        
        IF NOT v_collision THEN
            EXIT;
        END IF;

        v_counter := v_counter + 1;
        IF v_counter > 20 THEN
            -- Fallback with timestamp slice
            v_invite_code := UPPER(SUBSTRING(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT) FROM 1 FOR 6));
            EXIT;
        END IF;
    END LOOP;

    -- 5. Insert new company
    INSERT INTO public.companies (
        name,
        invite_code,
        plan,
        max_branches,
        max_employees,
        status,
        custom_limits,
        created_at
    ) VALUES (
        TRIM(p_company_name),
        v_invite_code,
        'starter',
        1,
        5,
        'active',
        '{}'::jsonb,
        NOW()
    )
    RETURNING id INTO v_company_id;

    -- 6. Insert / Upsert user profile as company_manager
    INSERT INTO public.profiles (
        id,
        company_id,
        role,
        full_name,
        phone,
        status,
        supervisor_permissions,
        created_at
    ) VALUES (
        v_user_id,
        v_company_id,
        'company_manager',
        TRIM(p_full_name),
        TRIM(p_phone),
        'active',
        '{"can_approve_employees": true, "can_exceed_edit_limit": true, "can_close_month": true}'::jsonb,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        status = EXCLUDED.status;

    -- 7. Return summary
    RETURN jsonb_build_object(
        'success', true,
        'company_id', v_company_id,
        'company_name', TRIM(p_company_name),
        'invite_code', v_invite_code,
        'role', 'company_manager'
    );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.register_new_company(TEXT, TEXT, TEXT) TO authenticated;
