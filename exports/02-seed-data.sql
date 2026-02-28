-- ============================================================
-- THREADBD SEED DATA
-- Insert this AFTER running 01-schema.sql
-- Generated: 2026-02-28
-- ============================================================

-- =====================
-- PRODUCT CATEGORIES
-- =====================
INSERT INTO public.product_categories (id, name, sort_order) VALUES
  ('86785b54-9011-47b1-9cf2-9a14b642d33d', 'Essentials', 1),
  ('e5248d20-9d98-469b-8eb2-c24c61d20862', 'Premium', 2),
  ('6df46f41-76ba-48b1-a5a9-953368b71d17', 'Street', 3);

-- =====================
-- PRODUCT TYPES
-- =====================
INSERT INTO public.product_types (id, name, sort_order) VALUES
  ('67d5b8a9-953b-4c0a-adeb-0a599cdb224e', 'T-Shirt', 1),
  ('6a334ca5-1dba-40b4-8d7f-7e0d8098fb30', 'Polo', 2),
  ('5286ea2a-281b-4d8a-83ad-f73a9bf0249e', 'Shirt', 3),
  ('8065ec2d-9282-4d47-8d74-19e5a4baa2b5', 'Drop Shoulder', 4),
  ('a5b41ba5-a8fd-4177-a9fc-d6df4b8d8a04', 'Undergarment', 5),
  ('ef5aaa98-30b3-4d8d-8d76-efd61cf01617', 'Pants', 6);

-- =====================
-- PRODUCTS
-- =====================
INSERT INTO public.products (id, name, price, original_price, image_url, images, description, sizes, colors, category, type, featured, badge, stock, is_available) VALUES
  ('17d987d6-a08c-4ad6-8a56-6987d41f96fa', 'Essential Black Tee', 850, 1000, 'tshirt-black.jpg', '{}', 'Premium 100% combed cotton, 180 GSM heavyweight tee. Pre-shrunk with reinforced stitching for lasting comfort.', '{S,M,L,XL,XXL}', '{Black}', 'Essentials', 'T-Shirt', true, 'Sale', 50, true),
  ('28fd9aeb-a894-4041-99bf-5a125176cf3a', 'Classic White Tee', 850, NULL, 'tshirt-white.jpg', '{}', 'Clean white heavyweight tee crafted from premium Egyptian cotton. A wardrobe staple that elevates any look.', '{S,M,L,XL,XXL}', '{White}', 'Essentials', 'T-Shirt', true, NULL, 45, true),
  ('8d8c05f0-41df-4d2e-9b83-6830f81eaf0f', 'Olive Street Tee', 950, NULL, 'tshirt-olive.jpg', '{}', 'Military-inspired olive green tee with a relaxed fit. Garment-dyed for a unique vintage wash effect.', '{S,M,L,XL}', '{Olive}', 'Street', 'T-Shirt', false, NULL, 30, true),
  ('7d6f3753-86eb-4f90-b503-2fd54701c236', 'Navy Crew Tee', 900, NULL, 'tshirt-navy.jpg', '{}', 'Deep navy crew neck tee with ribbed collar. Perfect layering piece for the modern wardrobe.', '{S,M,L,XL,XXL}', '{Navy}', 'Essentials', 'T-Shirt', false, NULL, 40, true),
  ('70e43f8e-af04-479c-a9ce-ff39dfe52dab', 'Burgundy Drop Tee', 1050, NULL, 'tshirt-burgundy.jpg', '{}', 'Rich burgundy drop-shoulder tee with extended body. Premium reactive dye for deep, lasting color.', '{M,L,XL}', '{Burgundy}', 'Premium', 'T-Shirt', true, 'New', 25, true),
  ('67c7ae0e-3b92-4a33-a96e-8889afd324a8', 'Heather Grey Tee', 800, NULL, 'tshirt-grey.jpg', '{}', 'Soft heather grey tee with a lived-in feel. Cotton-polyester blend for ultimate comfort and durability.', '{S,M,L,XL,XXL}', '{Grey}', 'Essentials', 'T-Shirt', false, NULL, 60, true),
  ('dd99caa9-e4ba-4beb-938b-f0c8f28732e6', 'Classic Pique Polo — Black', 1250, NULL, 'polo-black.jpg', '{}', 'Timeless pique polo in deep black. Ribbed collar, two-button placket, and breathable cotton mesh weave.', '{S,M,L,XL,XXL}', '{Black}', 'Essentials', 'Polo', true, NULL, 35, true),
  ('d3da7e13-3981-443b-b348-e9af8fafa621', 'Tipped Polo — Navy', 1350, NULL, 'polo-navy.jpg', '{}', 'Navy polo with contrast tipping on collar and sleeves. Slim fit with side vents for a polished casual look.', '{S,M,L,XL}', '{Navy}', 'Premium', 'Polo', false, NULL, 20, true),
  ('97443026-e76a-4935-a3fc-e025dfabfa29', 'Oxford Button-Down — White', 1650, NULL, 'shirt-white.jpg', '{}', 'Crisp white Oxford cloth button-down shirt. Washed for softness, perfect from office to weekend.', '{S,M,L,XL}', '{White}', 'Premium', 'Shirt', false, NULL, 15, true),
  ('5ec4587e-52d9-48dc-9ea9-76e4b2feb9ba', 'Linen Casual Shirt — Olive', 1800, NULL, 'shirt-olive.jpg', '{}', 'Lightweight linen shirt in earthy olive. Relaxed fit with a camp collar for effortless summer style.', '{M,L,XL,XXL}', '{Olive}', 'Premium', 'Shirt', true, NULL, 18, true),
  ('326d54c6-fa36-4764-8790-fdc8570b1b6c', 'Oversized Drop Shoulder — Grey', 1100, NULL, 'dropshoulder-grey.jpg', '{}', 'Ultra-relaxed oversized drop shoulder tee. 220 GSM heavyweight cotton with raw-cut hems for a streetwear edge.', '{M,L,XL,XXL}', '{Grey}', 'Street', 'Drop Shoulder', false, NULL, 22, true),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Drop Shoulder — Black', 1150, NULL, 'dropshoulder-black.jpg', '{}', 'Pitch-black oversized drop shoulder with boxy cut. 240 GSM ultra-heavy cotton for a premium street look.', '{S,M,L,XL}', '{Black}', 'Street', 'Drop Shoulder', true, 'New', 28, true),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Drop Shoulder — Burgundy', 1200, NULL, 'dropshoulder-burgundy.jpg', '{}', 'Statement burgundy drop shoulder with elongated sleeves. Double-needle stitching for durability.', '{M,L,XL}', '{Burgundy}', 'Premium', 'Drop Shoulder', false, NULL, 15, true),
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'Classic Boxer — Black', 450, NULL, 'boxer-black.jpg', '{}', 'Breathable cotton boxer in classic black. Elastic waistband with comfortable leg openings.', '{S,M,L,XL,XXL}', '{Black}', 'Essentials', 'Undergarment', false, NULL, 100, true),
  ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'Athletic Vest — White', 550, NULL, 'vest-white.jpg', '{}', 'Ribbed cotton vest for layering or lounging. Deep armholes and scoop neck for a sporty fit.', '{S,M,L,XL,XXL}', '{White}', 'Essentials', 'Undergarment', false, NULL, 80, true),
  ('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', 'Trunk Brief — Grey', 500, NULL, 'trunk-grey.jpg', '{}', 'Mid-rise trunk brief in heather grey. Moisture-wicking cotton-spandex blend for all-day comfort.', '{S,M,L,XL}', '{Grey}', 'Essentials', 'Undergarment', false, NULL, 90, true),
  ('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', 'Slim Chinos — Navy', 1600, NULL, 'chinos-navy.jpg', '{}', 'Tailored slim-fit chinos in deep navy. Stretch cotton twill for comfort and mobility.', '{28,30,32,34,36}', '{Navy}', 'Premium', 'Pants', true, NULL, 20, true),
  ('a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d', 'Cargo Joggers — Olive', 1450, NULL, 'cargo-olive.jpg', '{}', 'Utility-inspired cargo joggers in olive. Elasticated waist and cuffs with multiple pockets.', '{S,M,L,XL,XXL}', '{Olive}', 'Street', 'Pants', false, 'New', 25, true),
  ('b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e', 'Joggers — Black', 1350, NULL, 'joggers-black.jpg', '{}', 'Clean black joggers with tapered leg. French terry fabric with zip pockets for a refined athleisure look.', '{S,M,L,XL,XXL}', '{Black}', 'Essentials', 'Pants', false, NULL, 30, true),
  ('c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f', 'Formal Trousers — Grey', 1900, NULL, 'trousers-grey.jpg', '{}', 'Classic grey formal trousers. Flat front with a tailored fit. Perfect for office wear.', '{28,30,32,34,36}', '{Grey}', 'Premium', 'Pants', false, NULL, 12, true);

-- =====================
-- COUPON CODES
-- =====================
INSERT INTO public.coupon_codes (id, code, discount_type, discount_value, min_order, max_uses, uses_count, is_active) VALUES
  ('edce542e-8fb3-4cca-9459-8b246cc42ee0', 'SA', 'percentage', 10, 1000, 1, 0, true);

-- =====================
-- SITE SETTINGS
-- =====================
INSERT INTO public.site_settings (key, value) VALUES
  ('footer', '{"about_text": "THREADBD — Premium menswear for the modern Bangladeshi man.", "social_links": {}}'),
  ('about_page', '{"title": "About THREADBD", "content": "We are a premium menswear brand based in Bangladesh."}'),
  ('faq_entries', '[{"q": "What is your return policy?", "a": "We accept returns within 3 days of delivery."}, {"q": "How long does delivery take?", "a": "Delivery takes 2-5 business days inside Dhaka, 5-7 days outside."}, {"q": "Do you offer Cash on Delivery?", "a": "Yes, we offer COD across Bangladesh."}]'),
  ('categories', '[{"label": "T-Shirts", "value": "T-Shirt"}, {"label": "Polos", "value": "Polo"}, {"label": "Shirts", "value": "Shirt"}, {"label": "Trousers", "value": "Trousers"}, {"label": "Innerwear", "value": "Innerwear"}]'),
  ('seo_settings', '{"site_title": "ThreadBD - Premium Streetwear Bangladesh", "meta_description": "Shop premium streetwear, t-shirts, polos, and more from ThreadBD. Free delivery across Bangladesh.", "keywords": "streetwear, bangladesh, t-shirt, fashion, clothing", "og_image": ""}'),
  ('payment_settings', '{"bkash_enabled": true, "bkash_number": "01307762156", "nagad_enabled": true, "nagad_number": "01638543758"}'),
  ('whatsapp_support', '{"enabled": true, "number": "8801307762156", "message": "Hi! I need help with my order."}'),
  ('delivery_settings', '{"enabled": true, "delivery_fee": 100, "free_threshold": 2000}'),
  ('active_theme', '"default"'),
  ('announcement_bar', '{"enabled": true, "bg_color": "#b00c0c", "text": "Free shipping on orders over ৳2000 🚚", "messages": ["bkash 5 offf", "Announcement Bar", "Announcement Bar", "Announcement Bar"], "link": "/shop"}'),
  ('contact_page', '{"address": "Dhaka, Bangladesh", "email": "hello@threadbd.com", "phone": "+880 1307762156"}'),
  ('hero_section', '{"title": "Elevate Your Style with ThreadBD", "subtitle": "Premium menswear crafted for the modern gentleman", "cta_text": "Shop Now!!", "cta_link": "/shop", "media_type": "image", "media_url": "", "overlay_color": "#d6d6d6", "overlay_opacity": 24}'),
  ('promo_banner', '{"enabled": false, "title": "Summer Sale: Up to 50% Off", "subtitle": "Shop the latest drops before they''re gone", "badge_text": "Limited Time", "bg_style": "accent", "cta_text": "Shop Now!!", "cta_link": "/shop"}');
