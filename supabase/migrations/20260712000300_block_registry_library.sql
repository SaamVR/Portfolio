CREATE TABLE IF NOT EXISTS public.block_registry_entries (
  block_type text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  layer text NOT NULL DEFAULT 'core',
  compatible_business_families jsonb NOT NULL DEFAULT '["commerce"]'::jsonb,
  required_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.block_registry_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active block registry entries" ON public.block_registry_entries;
CREATE POLICY "Anyone can read active block registry entries"
  ON public.block_registry_entries FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage block registry entries" ON public.block_registry_entries;
CREATE POLICY "Admins can manage block registry entries"
  ON public.block_registry_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.block_registry_entries (
  block_type,
  label,
  description,
  layer,
  compatible_business_families,
  required_capabilities
)
VALUES
  ('hero', 'Hero', 'Main storefront hero banner', 'core', '["commerce"]'::jsonb, '[]'::jsonb),
  ('countdown', 'Countdown', 'Time-limited sale strip', 'commerce', '["commerce"]'::jsonb, '[]'::jsonb),
  ('promo-banner', 'Promo Banner', 'Mid-page promotional section', 'commerce', '["commerce"]'::jsonb, '[]'::jsonb),
  ('category-showcase', 'Category Showcase', 'Category grid with icons or images', 'commerce', '["commerce"]'::jsonb, '["catalog"]'::jsonb),
  ('featured-products', 'Featured Products', 'Featured product grid', 'commerce', '["commerce"]'::jsonb, '["catalog"]'::jsonb),
  ('recently-viewed', 'Recently Viewed', 'Customer history carousel', 'commerce', '["commerce"]'::jsonb, '["catalog"]'::jsonb),
  ('rich-text', 'Rich Text', 'Simple heading and body content', 'core', '["commerce"]'::jsonb, '[]'::jsonb),
  ('social-feed', 'Social Feed / Gallery', 'Masonry style image grid', 'core', '["commerce"]'::jsonb, '[]'::jsonb),
  ('video-reel', 'Video Reel', 'Vertical or full-width video highlight', 'commerce', '["commerce"]'::jsonb, '[]'::jsonb),
  ('faq-accordion', 'FAQ Accordion', 'Collapsible questions and answers', 'core', '["commerce"]'::jsonb, '[]'::jsonb),
  ('trust-badges', 'Trust Badges', 'Delivery, payment, return, and support promises', 'core', '["commerce"]'::jsonb, '[]'::jsonb),
  ('testimonials', 'Testimonials', 'Customer review carousel for social proof', 'core', '["commerce"]'::jsonb, '[]'::jsonb)
ON CONFLICT (block_type) DO NOTHING;
