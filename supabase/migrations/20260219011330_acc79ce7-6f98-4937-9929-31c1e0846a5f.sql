
-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS generate_order_number ON public.orders;
DROP TRIGGER IF EXISTS check_stock_availability ON public.products;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;

-- Re-create all triggers
CREATE TRIGGER generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

CREATE TRIGGER check_stock_availability
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_availability();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed site_settings
INSERT INTO public.site_settings (key, value) VALUES
  ('payment_settings', '{"bkash_number": "", "nagad_number": "", "bkash_enabled": false, "nagad_enabled": false}'::jsonb),
  ('faq_entries', '[{"q": "What is your return policy?", "a": "We accept returns within 3 days of delivery."}, {"q": "How long does delivery take?", "a": "Delivery takes 2-5 business days inside Dhaka, 5-7 days outside."}, {"q": "Do you offer Cash on Delivery?", "a": "Yes, we offer COD across Bangladesh."}]'::jsonb),
  ('contact_page', '{"address": "Dhaka, Bangladesh", "phone": "+880 1XXX-XXXXXX", "email": "hello@threadbd.com"}'::jsonb),
  ('categories', '[{"label": "T-Shirts", "value": "T-Shirt"}, {"label": "Polos", "value": "Polo"}, {"label": "Shirts", "value": "Shirt"}, {"label": "Trousers", "value": "Trousers"}, {"label": "Innerwear", "value": "Innerwear"}]'::jsonb),
  ('seo_settings', '{"site_title": "ThreadBD - Premium Streetwear Bangladesh", "meta_description": "Shop premium streetwear, t-shirts, polos, and more from ThreadBD. Free delivery across Bangladesh.", "og_image": "", "keywords": "streetwear, bangladesh, t-shirt, fashion, clothing"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
