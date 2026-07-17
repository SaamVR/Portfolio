-- Recreate CMS features and store lifecycle tables, and fix triggers.

CREATE TABLE IF NOT EXISTS public.cms_features (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  default_visible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL REFERENCES public.cms_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.cms_features(key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.store_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.cms_features(key) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.user_email_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email text NOT NULL,
  feature_key text NOT NULL REFERENCES public.cms_features(key) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_feature_overrides_unique
  ON public.user_email_feature_overrides(normalized_email, feature_key, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid));

DO $$
BEGIN
  CREATE TYPE public.store_lifecycle_status AS ENUM ('active', 'at_risk', 'reminded', 'archived', 'pending_delete', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.store_lifecycle_states (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  lifecycle_status public.store_lifecycle_status NOT NULL DEFAULT 'active',
  status_reason text,
  last_activity_at timestamptz,
  last_storefront_activity_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  reminder_1_sent_at timestamptz,
  reminder_2_sent_at timestamptz,
  reminder_3_sent_at timestamptz,
  last_reminder_at timestamptz,
  next_reminder_at timestamptz,
  archived_at timestamptz,
  scheduled_delete_at timestamptz,
  deleted_at timestamptz,
  manual_hold boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cms_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_lifecycle_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view CMS features" ON public.cms_features;
CREATE POLICY "Anyone can view CMS features"
  ON public.cms_features FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Platform admins can manage CMS features" ON public.cms_features;
CREATE POLICY "Platform admins can manage CMS features"
  ON public.cms_features FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view CMS plan features" ON public.cms_plan_features;
CREATE POLICY "Anyone can view CMS plan features"
  ON public.cms_plan_features FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Platform admins can manage CMS plan features" ON public.cms_plan_features;
CREATE POLICY "Platform admins can manage CMS plan features"
  ON public.cms_plan_features FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admins can manage store feature overrides" ON public.store_feature_overrides;
CREATE POLICY "Platform admins can manage store feature overrides"
  ON public.store_feature_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store admins can view store feature overrides" ON public.store_feature_overrides;
CREATE POLICY "Store admins can view store feature overrides"
  ON public.store_feature_overrides FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.can_manage_store(store_id, auth.uid())
  );

DROP POLICY IF EXISTS "Platform admins can manage user email feature overrides" ON public.user_email_feature_overrides;
CREATE POLICY "Platform admins can manage user email feature overrides"
  ON public.user_email_feature_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admins can manage store lifecycle states" ON public.store_lifecycle_states;
CREATE POLICY "Platform admins can manage store lifecycle states"
  ON public.store_lifecycle_states FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store managers can view lifecycle state" ON public.store_lifecycle_states;
CREATE POLICY "Store managers can view lifecycle state"
  ON public.store_lifecycle_states FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.can_manage_store(store_id, auth.uid())
  );

DROP POLICY IF EXISTS "Platform admins can manage lifecycle events" ON public.store_lifecycle_events;
CREATE POLICY "Platform admins can manage lifecycle events"
  ON public.store_lifecycle_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed data
INSERT INTO public.cms_features (key, name, description, category, default_visible, is_active)
VALUES
  ('cms_pages', 'CMS Pages', 'Multi-page storefront builder and homepage blocks.', 'content', true, true),
  ('launch_templates', 'Launch Templates', 'Business-type templates and onboarding presets.', 'content', true, true),
  ('media_library', 'Media Library', 'Reusable uploaded media across onboarding and CMS.', 'content', true, true),
  ('backup_import', 'Backup & Import', 'Store backup, export, restore, and portability tooling.', 'operations', true, true),
  ('custom_domains', 'Custom Domains', 'Custom domain support for storefronts.', 'growth', true, true),
  ('staff_management', 'Staff Management', 'Store staff roles, invitations, and seat management.', 'operations', true, true),
  ('theme_presets', 'Theme Presets', 'Theme selection, presets, and advanced styling controls.', 'design', true, true),
  ('advanced_analytics', 'Advanced Analytics', 'Richer merchant reporting and trend dashboards.', 'analytics', true, true),
  ('automations', 'Automations', 'Lifecycle jobs, reminders, and scheduled operational tasks.', 'operations', true, true),
  ('scheduled_backups', 'Scheduled Backups', 'Automatic recurring backup generation.', 'operations', true, true),
  ('lifecycle_recovery', 'Lifecycle Recovery', 'Archived store recovery and deletion rescue controls.', 'operations', false, true)
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_visible = EXCLUDED.default_visible,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.cms_plan_features (plan_id, feature_key, enabled)
VALUES
  ('basic', 'cms_pages', true),
  ('basic', 'launch_templates', true),
  ('basic', 'media_library', true),
  ('basic', 'backup_import', false),
  ('basic', 'custom_domains', false),
  ('basic', 'staff_management', false),
  ('basic', 'theme_presets', true),
  ('basic', 'advanced_analytics', false),
  ('basic', 'automations', false),
  ('basic', 'scheduled_backups', false),
  ('basic', 'lifecycle_recovery', false),
  ('advanced', 'cms_pages', true),
  ('advanced', 'launch_templates', true),
  ('advanced', 'media_library', true),
  ('advanced', 'backup_import', true),
  ('advanced', 'custom_domains', false),
  ('advanced', 'staff_management', true),
  ('advanced', 'theme_presets', true),
  ('advanced', 'advanced_analytics', true),
  ('advanced', 'automations', true),
  ('advanced', 'scheduled_backups', false),
  ('advanced', 'lifecycle_recovery', true),
  ('pro', 'cms_pages', true),
  ('pro', 'launch_templates', true),
  ('pro', 'media_library', true),
  ('pro', 'backup_import', true),
  ('pro', 'custom_domains', true),
  ('pro', 'staff_management', true),
  ('pro', 'theme_presets', true),
  ('pro', 'advanced_analytics', true),
  ('pro', 'automations', true),
  ('pro', 'scheduled_backups', true),
  ('pro', 'lifecycle_recovery', true)
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled, updated_at = now();

INSERT INTO public.store_lifecycle_states (store_id, lifecycle_status, last_activity_at, last_storefront_activity_at)
SELECT
  id,
  CASE WHEN is_published THEN 'active'::public.store_lifecycle_status ELSE 'at_risk'::public.store_lifecycle_status END,
  updated_at,
  updated_at
FROM public.stores
ON CONFLICT (store_id) DO UPDATE
SET
  last_activity_at = COALESCE(public.store_lifecycle_states.last_activity_at, EXCLUDED.last_activity_at),
  last_storefront_activity_at = COALESCE(public.store_lifecycle_states.last_storefront_activity_at, EXCLUDED.last_storefront_activity_at),
  updated_at = now();

-- Trigger for updated_at column
DROP TRIGGER IF EXISTS update_cms_features_updated_at ON public.cms_features;
CREATE TRIGGER update_cms_features_updated_at
  BEFORE UPDATE ON public.cms_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cms_plan_features_updated_at ON public.cms_plan_features;
CREATE TRIGGER update_cms_plan_features_updated_at
  BEFORE UPDATE ON public.cms_plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_feature_overrides_updated_at ON public.store_feature_overrides;
CREATE TRIGGER update_store_feature_overrides_updated_at
  BEFORE UPDATE ON public.store_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_email_feature_overrides_updated_at ON public.user_email_feature_overrides;
CREATE TRIGGER update_user_email_feature_overrides_updated_at
  BEFORE UPDATE ON public.user_email_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_lifecycle_states_updated_at ON public.store_lifecycle_states;
CREATE TRIGGER update_store_lifecycle_states_updated_at
  BEFORE UPDATE ON public.store_lifecycle_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fix triggers
DROP TRIGGER IF EXISTS on_store_lifecycle_update ON public.stores;

CREATE OR REPLACE FUNCTION public.handle_store_lifecycle_update()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
  v_store_owner_id uuid;
  v_store_name text;
  v_store_slug text;
BEGIN
  -- We only want to trigger this when lifecycle_status changes
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    
    -- Get the store details
    SELECT owner_id, name, slug INTO v_store_owner_id, v_store_name, v_store_slug
    FROM public.stores
    WHERE id = NEW.store_id;

    IF v_store_owner_id IS NOT NULL THEN
      -- Get the owner's email
      SELECT email INTO v_owner_email
      FROM auth.users
      WHERE id = v_store_owner_id;

      IF v_owner_email IS NOT NULL THEN
        IF NEW.lifecycle_status = 'reminded' THEN
          v_payload := json_build_object(
            'to', v_owner_email,
            'templateName', 'inactivity-warning',
            'storeName', v_store_name,
            'storeSlug', v_store_slug
          );
        ELSIF NEW.lifecycle_status = 'deletion_queued' THEN
          v_payload := json_build_object(
            'to', v_owner_email,
            'templateName', 'deletion-notice',
            'storeName', v_store_name,
            'storeSlug', v_store_slug
          );
        END IF;

        IF v_payload IS NOT NULL THEN
          PERFORM net.http_post(
            url := current_setting('app.settings.edge_function_url', true) || '/send-email',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := v_payload
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.handle_store_lifecycle_update() FROM public;
GRANT EXECUTE ON FUNCTION public.handle_store_lifecycle_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_store_lifecycle_update() TO service_role;

CREATE TRIGGER on_store_lifecycle_update
  AFTER UPDATE ON public.store_lifecycle_states
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_store_lifecycle_update();

-- Create store publish trigger
CREATE OR REPLACE FUNCTION public.handle_store_publish()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
BEGIN
  -- Trigger store-published if is_published changes to true
  IF (OLD.is_published IS FALSE OR OLD.is_published IS NULL) AND NEW.is_published IS TRUE THEN
    SELECT email INTO v_owner_email
    FROM auth.users
    WHERE id = NEW.owner_id;

    IF v_owner_email IS NOT NULL THEN
      v_payload := json_build_object(
        'to', v_owner_email,
        'templateName', 'store-published',
        'storeName', NEW.name,
        'storeSlug', NEW.slug
      );
      
      PERFORM net.http_post(
        url := current_setting('app.settings.edge_function_url', true) || '/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := v_payload
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.handle_store_publish() FROM public;
GRANT EXECUTE ON FUNCTION public.handle_store_publish() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_store_publish() TO service_role;

DROP TRIGGER IF EXISTS on_store_publish ON public.stores;
CREATE TRIGGER on_store_publish
  AFTER UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_store_publish();
