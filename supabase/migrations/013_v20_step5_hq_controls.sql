-- Migration 013: Yawmi v2.0 Step 5 — Super Admin HQ Controls (Maintenance, Global Broadcast, Dynamic Pricing)

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message TEXT DEFAULT 'نجري تحديثاً سريعاً لتحسين الأداء، نعود خلال دقائق.',
  ADD COLUMN IF NOT EXISTS global_announcement_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS global_announcement_title TEXT,
  ADD COLUMN IF NOT EXISTS global_announcement_body TEXT,
  ADD COLUMN IF NOT EXISTS global_announcement_severity TEXT NOT NULL DEFAULT 'info'
    CHECK (global_announcement_severity IN ('info', 'warning', 'urgent')),
  ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{"pro":{"monthly":149,"annual":1490},"enterprise":{"monthly":349,"annual":3490}}'::jsonb;

-- Ensure RLS allows public/authenticated SELECT and restricts writes strictly to super_admin
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'platform_settings' AND policyname = 'Anyone can read platform settings'
  ) THEN
    CREATE POLICY "Anyone can read platform settings"
      ON public.platform_settings FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'platform_settings' AND policyname = 'Super admins can manage platform settings'
  ) THEN
    CREATE POLICY "Super admins can manage platform settings"
      ON public.platform_settings FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
      );
  END IF;
END $$;
