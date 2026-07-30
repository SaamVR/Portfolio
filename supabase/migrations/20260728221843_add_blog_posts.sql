CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  featured_image text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_store_status_published
  ON public.blog_posts(store_id, status, published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published blog posts for published stores" ON public.blog_posts;
CREATE POLICY "Anyone can view published blog posts for published stores"
  ON public.blog_posts FOR SELECT
  USING (
    (
      status = 'published'
      AND published_at IS NOT NULL
      AND published_at <= now()
      AND EXISTS (
        SELECT 1
        FROM public.stores
        WHERE stores.id = blog_posts.store_id
          AND stores.is_published = true
      )
    )
    OR public.can_manage_store(store_id, auth.uid())
  );

DROP POLICY IF EXISTS "Store staff can manage blog posts" ON public.blog_posts;
CREATE POLICY "Store staff can manage blog posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
