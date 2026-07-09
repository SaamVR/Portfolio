-- Storefront CMS content model.
-- Canonical sources:
-- - 20260701000000_storefront_cms_foundation.sql
-- - 20260701000001_storefront_admin_policies.sql

CREATE TABLE IF NOT EXISTS public.store_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  preset_id text NOT NULL DEFAULT 'default',
  mode text NOT NULL DEFAULT 'dark' CHECK (mode IN ('light', 'dark')),
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_css text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  seo_title text,
  seo_description text,
  is_homepage boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE TABLE IF NOT EXISTS public.store_page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.store_pages(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_page_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.store_pages(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  blocks_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  revision_label text NOT NULL DEFAULT 'Auto-save',
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_page_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view themes for published stores" ON public.store_themes;
CREATE POLICY "Anyone can view themes for published stores"
  ON public.store_themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_themes.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage themes" ON public.store_themes;
CREATE POLICY "Store owners can manage themes"
  ON public.store_themes FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view pages for published stores" ON public.store_pages;
CREATE POLICY "Anyone can view pages for published stores"
  ON public.store_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_pages.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage pages" ON public.store_pages;
CREATE POLICY "Store owners can manage pages"
  ON public.store_pages FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view blocks for published stores" ON public.store_page_blocks;
CREATE POLICY "Anyone can view blocks for published stores"
  ON public.store_page_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_blocks.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage blocks" ON public.store_page_blocks;
CREATE POLICY "Store owners can manage blocks"
  ON public.store_page_blocks FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store owners can view revisions" ON public.store_page_revisions;
CREATE POLICY "Store owners can view revisions"
  ON public.store_page_revisions FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store owners can manage revisions" ON public.store_page_revisions;
CREATE POLICY "Store owners can manage revisions"
  ON public.store_page_revisions FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));
