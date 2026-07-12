-- Keep storefront-visible settings public, but prevent secrets such as
-- payment gateway credentials and notification API keys from being readable.

DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can view published store site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can view storefront site settings" ON public.site_settings;

CREATE POLICY "Public can view storefront site settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (
    store_id IS NOT NULL
    AND key = ANY (ARRAY[
      'about_page',
      'announcement_bar',
      'brand_settings',
      'categories_custom_data',
      'contact_page',
      'countdown_timer',
      'delivery_settings',
      'exit_intent',
      'faq_entries',
      'footer',
      'hero_section',
      'home_categories',
      'home_featured',
      'loyalty_settings',
      'promo_banner',
      'theme_customization',
      'upsells',
      'whatsapp_support'
    ])
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = site_settings.store_id
        AND stores.is_published = true
    )
  );
