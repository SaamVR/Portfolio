-- Legacy commerce tables upgraded for multi-store CMS use.
-- Canonical sources:
-- - 20260218123954_70d6a7c0-68a0-4844-a600-2672596860ea.sql
-- - 20260218132115_57779cfd-f6f0-4e83-a33a-5e75b6866746.sql
-- - 20260219225544_2c0135ce-b117-48ff-a53e-e51e946a9dc1.sql
-- - 20260220002859_0d9ad5c9-8e5c-4930-a223-0ccfa9a8635e.sql
-- - 20260225001931_69a6ea9a-3df2-45e6-a63a-842d9c9e761d.sql
-- - 20260622000003_stock_notifications.sql
-- - 20260622000005_product_qa.sql
-- - 20260702000000_cms_engine_multi_tenant.sql

ALTER TABLE IF EXISTS public.site_settings
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.cart_items
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.coupon_codes
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.product_categories
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.product_types
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.product_reviews
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.product_qa
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.stock_notifications
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.contact_messages
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.customer_addresses
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_store_key
  ON public.site_settings(store_id, key)
  WHERE store_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_global_key
  ON public.site_settings(key)
  WHERE store_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_store_id ON public.cart_items(store_id);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_store_id ON public.coupon_codes(store_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_store_id ON public.product_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_product_types_store_id ON public.product_types(store_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_store_id ON public.product_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_product_qa_store_id ON public.product_qa(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_store_id ON public.stock_notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_store_id ON public.contact_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_store_id ON public.customer_addresses(store_id);
