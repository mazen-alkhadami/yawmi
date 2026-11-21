-- ====================================================================
-- Yawmi (يومي) - Multi-tenant Attendance SaaS Platform
-- Migration: 004_phase4_requests_supervisor_hr.sql
-- Description: RLS Policies for Incoming Requests, Employee Confirmations,
--              Branch Supervisors Management, and Employee History
-- ====================================================================

-- 1. Allow Managers to insert incoming requests (e.g. salary confirmation)
DROP POLICY IF EXISTS "Managers can insert requests" ON public.requests;
CREATE POLICY "Managers can insert requests"
    ON public.requests FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_manager', 'super_admin')
    );

-- 2. Allow Employees to update/confirm their incoming requests
DROP POLICY IF EXISTS "Employees can confirm incoming requests" ON public.requests;
CREATE POLICY "Employees can confirm incoming requests"
    ON public.requests FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND employee_id = auth.uid()
        AND direction = 'incoming'
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND employee_id = auth.uid()
        AND direction = 'incoming'
    );

-- 3. Ensure branch_supervisors management has explicit WITH CHECK
DROP POLICY IF EXISTS "Company managers can manage branch supervisors" ON public.branch_supervisors;
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
    )
    WITH CHECK (
        public.get_my_role() = 'company_manager' 
        AND EXISTS (
            SELECT 1 FROM public.branches b 
            WHERE b.id = branch_id 
            AND b.company_id = public.get_my_company_id()
        )
    );

-- 4. Ensure managers can update attendance_logs when approving manual_edit
-- (attendance_logs already has update policy for company_manager & branch_supervisor)
