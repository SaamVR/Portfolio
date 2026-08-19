-- Keep legacy published posts visible and align database policy with the
-- application rule: a published row with no explicit publish time is live now.

UPDATE public.blog_posts
SET published_at = COALESCE(published_at, created_at, now())
WHERE status = 'published'
  AND published_at IS NULL;

DROP POLICY IF EXISTS "Anyone can view published blog posts for published stores" ON public.blog_posts;
CREATE POLICY "Anyone can view published blog posts for published stores"
  ON public.blog_posts FOR SELECT
  USING (
    (
      status = 'published'
      AND (published_at IS NULL OR published_at <= now())
      AND EXISTS (
        SELECT 1
        FROM public.stores
        WHERE stores.id = blog_posts.store_id
          AND stores.is_published = true
      )
    )
    OR public.can_manage_store(store_id, auth.uid())
  );
