INSERT INTO public.page_blueprints (
  id,
  name,
  description,
  business_family,
  catalog_modes,
  page_payload
)
VALUES
  (
    'landing',
    'Landing',
    'Hero, promo, categories, and featured products for campaign pages.',
    'commerce',
    '["single_product","multi_product","menu","inquiry_only"]'::jsonb,
    '{"slug":"/landing","title":"Landing Page","seoTitle":"Landing Page","seoDescription":"A campaign-focused landing page for product launches and promotions.","isHomepage":false,"blocks":[{"id":"landing-hero","type":"hero","isVisible":true,"sortOrder":0,"props":{"tagline":"New Collection","title":"Launch Your Next","highlight":"Drop","subtitle":"Use this landing template for new product lines, campaign pages, or seasonal offers.","ctaText":"Browse the collection","ctaLink":"/shop","secondaryCtaText":"See the story","secondaryCtaLink":"/about"}},{"id":"landing-promo","type":"promo-banner","isVisible":true,"sortOrder":1,"props":{"title":"A strong offer in the middle of the page","subtitle":"Pair this with your main campaign message and one decisive CTA.","ctaText":"Shop the offer","ctaLink":"/shop?sale=1","badgeText":"Featured Campaign","bgStyle":"gradient","textAlignment":"center"}},{"id":"landing-categories","type":"category-showcase","isVisible":true,"sortOrder":2,"props":{}},{"id":"landing-featured","type":"featured-products","isVisible":true,"sortOrder":3,"props":{"limit":6,"title":"Featured Picks","tagline":"Curated"}},{"id":"landing-copy","type":"rich-text","isVisible":true,"sortOrder":4,"props":{"eyebrow":"Why buyers convert here","title":"Give customers a reason to trust the offer","body":"Campaign pages work best when the promise feels specific and safe.\n\n- Clear value and product positioning\n- Trusted payments and direct support\n- Delivery or exchange expectations before checkout","align":"left"}},{"id":"landing-faq","type":"faq-accordion","isVisible":true,"sortOrder":5,"props":{"title":"Questions before checkout","subtitle":"Answer the buying questions people ask on campaign pages.","faqs":[{"q":"What makes this offer worth buying now?","a":"Use this answer to explain your limited drop, bundle value, early access, or any concrete reason for urgency."},{"q":"How long does delivery take?","a":"Set clear delivery timing so customers can decide with confidence."},{"q":"Which payment options are available?","a":"Mention whether customers can use bKash, Nagad, card, or cash on delivery."}]}}]}'::jsonb
  ),
  (
    'about',
    'About',
    'Story-driven page with brand intro, mission, and trust-building sections.',
    'commerce',
    '["single_product","multi_product","menu","inquiry_only"]'::jsonb,
    '{"slug":"/about-brand","title":"About Brand","seoTitle":"About Our Brand","seoDescription":"Share your story, values, and what makes the brand worth following.","isHomepage":false,"blocks":[{"id":"about-story","type":"rich-text","isVisible":true,"sortOrder":0,"props":{"eyebrow":"Our Story","title":"Tell customers where the brand comes from","body":"Use this page to explain your origin, the people behind the store, and why your products matter.","align":"left"}},{"id":"about-craft","type":"rich-text","isVisible":true,"sortOrder":1,"props":{"eyebrow":"Craft","title":"What you care about in product quality","body":"Explain fabrics, fit, sourcing, finishing, or anything that helps customers trust the product.\n\n- Materials and quality standards\n- Fit philosophy or sizing help\n- Service approach after the sale","align":"left"}},{"id":"about-products","type":"featured-products","isVisible":true,"sortOrder":2,"props":{"limit":3,"title":"Start Here","tagline":"Recommended"}},{"id":"about-gallery","type":"social-feed","isVisible":true,"sortOrder":3,"props":{"title":"How the brand shows up","subtitle":"Use real product, lifestyle, or behind-the-scenes images to make the story believable.","images":[]}}]}'::jsonb
  ),
  (
    'policy',
    'Policy',
    'Refund, delivery, and service information in a simple content-first layout.',
    'commerce',
    '["single_product","multi_product","menu","inquiry_only"]'::jsonb,
    '{"slug":"/policy","title":"Policy","seoTitle":"Store Policy","seoDescription":"Refunds, shipping, exchange policy, and customer support notes.","isHomepage":false,"blocks":[{"id":"policy-summary","type":"rich-text","isVisible":true,"sortOrder":0,"props":{"eyebrow":"Store Policy","title":"Set clear expectations before purchase","body":"Summarize delivery times, return windows, payment terms, exchange rules, and support availability.","align":"left"}},{"id":"policy-help","type":"rich-text","isVisible":true,"sortOrder":1,"props":{"eyebrow":"Need help?","title":"Make support easy to find","body":"Add WhatsApp response hours, phone support, or order-issue escalation details here.\n\n- Best channel for quick help\n- Hours when responses are fastest\n- What to include when reporting an order issue","align":"left"}},{"id":"policy-faq","type":"faq-accordion","isVisible":true,"sortOrder":2,"props":{"title":"Policy FAQs","subtitle":"Use these answers to reduce confusion before the customer orders.","faqs":[{"q":"What is your exchange or return window?","a":"Explain how many days customers have, what condition the item must be in, and how they should request support."},{"q":"How are delivery charges calculated?","a":"Clarify delivery charges by region and whether free delivery applies above a threshold."},{"q":"How are order issues resolved?","a":"Explain the steps customers should follow if they receive the wrong item, damaged packaging, or a delayed delivery."}]}}]}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
