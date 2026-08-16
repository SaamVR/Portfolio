-- Seed demo blog content only after public.blog_posts has been created.
INSERT INTO public.blog_posts (
  id,
  store_id,
  title,
  slug,
  excerpt,
  content,
  featured_image,
  status,
  seo_title,
  seo_description,
  published_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000001',
    'The Ultimate Fit & Care Guide: Modern Garment Maintenance',
    'ultimate-fit-and-care-guide',
    'Essential tips on washing, drying, and preserving premium fabrics for long-lasting comfort and sharp silhouettes.',
    '# How to Care for Premium Cotton & Heavyweight Fabrics\n\nInvesting in quality apparel is only half the journey. Proper garment care ensures your favorite t-shirts, polos, and drop-shoulder fits retain their texture, color, and silhouette for years to come.\n\n## 1. Cold Wash, Inside Out\nAlways turn your printed or heavyweight cotton garments inside out before placing them in the washing machine. Use cold water (30°C or below) to prevent shrinkage and fabric stress.\n\n## 2. Air Dry Over High Heat\nTumble dryers subject cotton fibers to extreme friction and high temperatures. For best results:\n- Hang dry in a shaded, well-ventilated area.\n- Avoid direct harsh sunlight to keep dark pigments vibrant.\n\n> *Pro-Tip: Fold heavyweight knits instead of hanging them to prevent shoulder stretch.*',
    'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800',
    'published',
    'Garment Care & Fabric Maintenance Guide',
    'Learn how to wash, dry, and maintain premium cotton t-shirts, hoodies, and streetwear.',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    'Behind the Blueprint: Designing Mobile-First Commerce',
    'behind-the-blueprint-mobile-first-commerce',
    'Inside our modern product development process, from rapid storefront rendering to lightning-fast customer checkout.',
    '# Rethinking Modern Storefront Architecture\n\nSpeed and clarity drive customer retention in today''s fast-paced digital marketplace. Here is how we engineered our latest storefront release to deliver sub-second page loads and seamless mobile browsing.\n\n## Minimalist UI Design\nExcess visual noise slows down buyers. By prioritizing clean visual hierarchy, generous white space, and bold typography, shoppers can focus on what matters most: product details.\n\n- **Instant Live Search:** Find products in milliseconds without full page refreshes.\n- **Adaptive Dark & Light Modes:** Smooth theme switching that respects system preferences.\n- **Express Mobile Checkout:** Optimized for mobile payment methods and fast delivery selection.\n\n> *Performance is the foundation of modern user conversion.*',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
    'published',
    'Mobile-First E-Commerce Blueprint & Design System',
    'Inside our product design process for fast, conversion-optimized mobile online stores.',
    now()
  )
ON CONFLICT (store_id, slug) DO UPDATE
SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  featured_image = EXCLUDED.featured_image,
  status = EXCLUDED.status,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();
