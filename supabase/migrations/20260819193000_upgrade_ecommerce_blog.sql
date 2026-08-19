-- Upgrade merchant blogging from a basic markdown journal into an ecommerce content surface.
-- All additions are nullable/defaulted so existing posts remain valid.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS featured_image_alt text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS embedded_product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS product_embed_title text,
  ADD COLUMN IF NOT EXISTS product_embed_position text NOT NULL DEFAULT 'after-content',
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_product_embed_position_check'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_product_embed_position_check
      CHECK (product_embed_position IN ('before-content', 'after-intro', 'after-content'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blog_posts_store_featured_published
  ON public.blog_posts(store_id, is_featured DESC, published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_blog_posts_store_category_published
  ON public.blog_posts(store_id, category, published_at DESC)
  WHERE status = 'published';

COMMENT ON COLUMN public.blog_posts.embedded_product_ids IS
  'Merchant-selected products displayed as ecommerce cards inside the article.';
COMMENT ON COLUMN public.blog_posts.noindex IS
  'When true, search engines should not index this individual article.';
