-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 005_phase5_hq_settings.sql
-- Description: Platform Settings Initial Row, Super Admin & Manager Policies,
--              and Month Closing Security
-- ====================================================================

-- 1. Ensure platform_settings table has a default record if empty
INSERT INTO public.platform_settings (
    id,
    commercial_reg_number,
    freelance_cert_number,
    sbc_verification_url,
    bank_transfer_details
)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    '1010998877',
    'FL-987654321',
    'https://mc.gov.sa',
    '{
        "bank_name": "مصرف الراجحي (Al Rajhi Bank)",
        "account_name": "مؤسسة يومي لحلول تقنية المعلومات",
        "iban": "SA4480000456608010123456"
    }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 2. Allow Super Admins to update platform_settings
DROP POLICY IF EXISTS "Super admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Super admins can manage platform settings"
    ON public.platform_settings FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'super_admin')
    WITH CHECK (public.get_my_role() = 'super_admin');

-- 3. Allow Super Admins to update companies directly (for plan upgrades, suspension, quota adjustment)
DROP POLICY IF EXISTS "Super admins can update companies" ON public.companies;
CREATE POLICY "Super admins can update companies"
    ON public.companies FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'super_admin')
    WITH CHECK (public.get_my_role() = 'super_admin');

-- 4. Ensure monthly_reports has explicit WITH CHECK for closing month
DROP POLICY IF EXISTS "Managers and supervisors can manage monthly reports" ON public.monthly_reports;
CREATE POLICY "Managers and supervisors can manage monthly reports"
    ON public.monthly_reports FOR ALL
    TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        AND (
            public.get_my_role() IN ('company_manager', 'super_admin')
            OR (
                public.get_my_role() = 'branch_supervisor'
                AND (SELECT (supervisor_permissions->>'can_close_month')::boolean FROM public.profiles WHERE id = auth.uid()) = true
            )
        )
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND (
            public.get_my_role() IN ('company_manager', 'super_admin')
            OR (
                public.get_my_role() = 'branch_supervisor'
                AND (SELECT (supervisor_permissions->>'can_close_month')::boolean FROM public.profiles WHERE id = auth.uid()) = true
            )
        )
    );

-- ====================================================================
-- NOTE: TO PROMOTE AN ACCOUNT TO SUPER ADMIN FOR TESTING:
-- Run this in the Supabase SQL Editor:
-- UPDATE public.profiles SET role = 'super_admin' WHERE id = '<YOUR_USER_ID>';
-- ====================================================================
