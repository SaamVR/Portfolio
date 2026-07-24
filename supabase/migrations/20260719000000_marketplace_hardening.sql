-- Hardens community template marketplace publishing with review states,
-- safety metadata, install tracking, and review aggregation.

CREATE TABLE IF NOT EXISTS public.cms_marketplace_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image text,
  category text NOT NULL DEFAULT 'minimal',
  pricing_mode text NOT NULL DEFAULT 'free',
  price numeric NOT NULL DEFAULT 0,
  bundle_json jsonb NOT NULL,
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  install_count integer NOT NULL DEFAULT 0,
  rating_avg numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_marketplace_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cms_marketplace_templates
  ALTER COLUMN status SET DEFAULT 'draft';

UPDATE public.cms_marketplace_templates
SET status = 'published'
WHERE status IS NULL OR status NOT IN ('draft', 'in_review', 'published', 'rejected');

ALTER TABLE public.cms_marketplace_templates
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS aesthetic text,
  ADD COLUMN IF NOT EXISTS best_for text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preview_asset_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mobile_ready boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS safety_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS safety_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.cms_marketplace_templates
  DROP CONSTRAINT IF EXISTS cms_marketplace_templates_status_check,
  ADD CONSTRAINT cms_marketplace_templates_status_check
    CHECK (status IN ('draft', 'in_review', 'published', 'rejected'));

ALTER TABLE public.cms_marketplace_templates
  DROP CONSTRAINT IF EXISTS cms_marketplace_templates_safety_status_check,
  ADD CONSTRAINT cms_marketplace_templates_safety_status_check
    CHECK (safety_status IN ('pending', 'passed', 'failed'));

ALTER TABLE public.cms_marketplace_templates
  DROP CONSTRAINT IF EXISTS cms_marketplace_templates_pricing_mode_check,
  ADD CONSTRAINT cms_marketplace_templates_pricing_mode_check
    CHECK (pricing_mode IN ('free', 'premium'));

ALTER TABLE public.cms_marketplace_templates
  DROP CONSTRAINT IF EXISTS cms_marketplace_templates_price_check,
  ADD CONSTRAINT cms_marketplace_templates_price_check
    CHECK (price >= 0);

ALTER TABLE public.cms_marketplace_templates
  DROP CONSTRAINT IF EXISTS cms_marketplace_templates_rating_count_check,
  ADD CONSTRAINT cms_marketplace_templates_rating_count_check
    CHECK (rating_count >= 0);

ALTER TABLE public.cms_marketplace_templates
  DROP CONSTRAINT IF EXISTS cms_marketplace_templates_install_count_check,
  ADD CONSTRAINT cms_marketplace_templates_install_count_check
    CHECK (install_count >= 0);

CREATE INDEX IF NOT EXISTS cms_marketplace_templates_status_created_idx
  ON public.cms_marketplace_templates (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cms_marketplace_template_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.cms_marketplace_templates(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, reviewer_id)
);

ALTER TABLE public.cms_marketplace_template_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read template reviews" ON public.cms_marketplace_template_reviews;
CREATE POLICY "Anyone can read template reviews"
  ON public.cms_marketplace_template_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.cms_marketplace_templates templates
      WHERE templates.id = template_id
        AND templates.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can review templates" ON public.cms_marketplace_template_reviews;
CREATE POLICY "Authenticated users can review templates"
  ON public.cms_marketplace_template_reviews FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = reviewer_id);

DROP POLICY IF EXISTS "Reviewers can update their template reviews" ON public.cms_marketplace_template_reviews;
CREATE POLICY "Reviewers can update their template reviews"
  ON public.cms_marketplace_template_reviews FOR UPDATE TO authenticated
  USING ((select auth.uid()) = reviewer_id)
  WITH CHECK ((select auth.uid()) = reviewer_id);

CREATE TABLE IF NOT EXISTS public.cms_marketplace_template_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.cms_marketplace_templates(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  installed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_marketplace_template_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store managers can create template install records" ON public.cms_marketplace_template_installs;
CREATE POLICY "Store managers can create template install records"
  ON public.cms_marketplace_template_installs FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = installed_by
    AND (
      store_id IS NULL
      OR public.can_manage_store(store_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Template creators can read install records for their templates" ON public.cms_marketplace_template_installs;
CREATE POLICY "Template creators can read install records for their templates"
  ON public.cms_marketplace_template_installs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cms_marketplace_templates templates
      WHERE templates.id = template_id
        AND templates.creator_id = (select auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.refresh_marketplace_template_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cms_marketplace_templates template
  SET
    rating_avg = stats.rating_avg,
    rating_count = stats.rating_count,
    updated_at = now()
  FROM (
    SELECT
      template_id,
      round(avg(rating)::numeric, 2) AS rating_avg,
      count(*)::integer AS rating_count
    FROM public.cms_marketplace_template_reviews
    WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    GROUP BY template_id
  ) stats
  WHERE template.id = stats.template_id;

  UPDATE public.cms_marketplace_templates template
  SET rating_avg = NULL, rating_count = 0, updated_at = now()
  WHERE template.id = COALESCE(NEW.template_id, OLD.template_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.cms_marketplace_template_reviews reviews
      WHERE reviews.template_id = template.id
    );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_marketplace_template_rating_after_change
  ON public.cms_marketplace_template_reviews;
CREATE TRIGGER refresh_marketplace_template_rating_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_marketplace_template_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_marketplace_template_rating();

CREATE OR REPLACE FUNCTION public.increment_marketplace_template_install_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cms_marketplace_templates
  SET install_count = install_count + 1, updated_at = now()
  WHERE id = NEW.template_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS increment_marketplace_template_install_count_after_insert
  ON public.cms_marketplace_template_installs;
CREATE TRIGGER increment_marketplace_template_install_count_after_insert
  AFTER INSERT ON public.cms_marketplace_template_installs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_marketplace_template_install_count();

DROP POLICY IF EXISTS "Anyone can read published marketplace templates" ON public.cms_marketplace_templates;
CREATE POLICY "Anyone can read published marketplace templates"
  ON public.cms_marketplace_templates FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Creators can read their marketplace templates" ON public.cms_marketplace_templates;
CREATE POLICY "Creators can read their marketplace templates"
  ON public.cms_marketplace_templates FOR SELECT TO authenticated
  USING ((select auth.uid()) = creator_id);

DROP POLICY IF EXISTS "Authenticated users can publish marketplace templates" ON public.cms_marketplace_templates;
CREATE POLICY "Authenticated users can publish marketplace templates"
  ON public.cms_marketplace_templates FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = creator_id
    AND status IN ('draft', 'in_review')
    AND safety_status IN ('pending', 'passed', 'failed')
  );

DROP POLICY IF EXISTS "Creators can update their marketplace templates" ON public.cms_marketplace_templates;
CREATE POLICY "Creators can update their marketplace templates"
  ON public.cms_marketplace_templates FOR UPDATE TO authenticated
  USING ((select auth.uid()) = creator_id AND status IN ('draft', 'rejected'))
  WITH CHECK ((select auth.uid()) = creator_id AND status IN ('draft', 'in_review'));

DROP POLICY IF EXISTS "Platform admins can moderate marketplace templates" ON public.cms_marketplace_templates;
CREATE POLICY "Platform admins can moderate marketplace templates"
  ON public.cms_marketplace_templates FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
