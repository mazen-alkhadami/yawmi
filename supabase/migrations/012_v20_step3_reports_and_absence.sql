-- Migration 012: Yawmi v2.0 Step 3 — Request Attachments Storage & Automated Daily Absence Calculation

-- 1. Ensure attendance_logs has a status column ('present', 'late', 'absent', 'excused')
ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'present'
  CHECK (status IN ('present', 'late', 'absent', 'excused'));

-- Ensure one attendance log per employee per shift_date for automated absence deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_logs_employee_shift_date_unique
  ON public.attendance_logs (employee_id, shift_date);

-- 2. Private Storage Bucket for Request Attachments (5MB limit, images + PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-attachments',
  'request-attachments',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies for request-attachments: path format is {company_id}/{user_id}/{filename}
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Company members can upload request attachments'
  ) THEN
    CREATE POLICY "Company members can upload request attachments"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'request-attachments'
        AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners and company admins or supervisors can view request attachments'
  ) THEN
    CREATE POLICY "Owners and company admins or supervisors can view request attachments"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'request-attachments'
        AND (
          (storage.foldername(name))[2] = auth.uid()::text
          OR (
            (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
            AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('company_admin', 'company_manager', 'branch_supervisor', 'supervisor', 'super_admin')
          )
        )
      );
  END IF;
END $$;

-- 3. Automated Absence Calculation Function
CREATE OR REPLACE FUNCTION public.mark_daily_absences(
  p_company_id UUID DEFAULT NULL,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_local TIMESTAMP;
  v_today_local DATE;
  v_inserted_count INTEGER := 0;
BEGIN
  -- Use Asia/Riyadh local time as default platform timezone
  v_now_local := timezone('Asia/Riyadh', now());
  v_today_local := v_now_local::date;

  -- Do not mark absences for future dates
  IF p_target_date > v_today_local THEN
    RETURN 0;
  END IF;

  WITH eligible_employees AS (
    SELECT
      p.id AS employee_id,
      p.company_id,
      p.branch_id,
      COALESCE(
        CASE WHEN st.is_dual_shift AND st.shift2_end IS NOT NULL THEN st.shift2_end ELSE st.shift1_end END,
        TIME '17:00:00'
      ) AS shift_end_time
    FROM public.profiles p
    LEFT JOIN public.shift_templates st ON st.id = p.shift_template_id
    WHERE p.status = 'active'
      AND p.role = 'employee'
      AND p.company_id IS NOT NULL
      AND (p_company_id IS NULL OR p.company_id = p_company_id)
      -- Only process employees whose shift end time has passed on p_target_date
      AND (
        p_target_date < v_today_local
        OR (
          p_target_date = v_today_local
          AND v_now_local::time > COALESCE(
            CASE WHEN st.is_dual_shift AND st.shift2_end IS NOT NULL THEN st.shift2_end ELSE st.shift1_end END,
            TIME '17:00:00'
          )
        )
      )
      -- Skip if already has an attendance_logs record for p_target_date
      AND NOT EXISTS (
        SELECT 1
        FROM public.attendance_logs al
        WHERE al.employee_id = p.id
          AND al.shift_date = p_target_date
      )
      -- Skip if covered by an approved leave request for p_target_date
      AND NOT EXISTS (
        SELECT 1
        FROM public.requests r
        WHERE r.employee_id = p.id
          AND r.type = 'leave'
          AND r.status = 'approved'
          AND (
            (
              COALESCE(r.payload->>'start_date', r.payload->>'date') IS NOT NULL
              AND p_target_date >= (COALESCE(r.payload->>'start_date', r.payload->>'date'))::date
              AND p_target_date <= (COALESCE(r.payload->>'end_date', r.payload->>'start_date', r.payload->>'date'))::date
            )
          )
      )
  ),
  inserted AS (
    INSERT INTO public.attendance_logs (
      company_id,
      branch_id,
      employee_id,
      shift_date,
      status
    )
    SELECT
      e.company_id,
      e.branch_id,
      e.employee_id,
      p_target_date,
      'absent'
    FROM eligible_employees e
    ON CONFLICT (employee_id, shift_date) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted_count FROM inserted;

  RETURN v_inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_daily_absences(UUID, DATE) TO authenticated, service_role;
