import { createDefaultBlock } from "@/lib/cms/block-library";
import { createStoreSlug, slugify } from "@/lib/slug";
import type { StorePage, StorePageBlock, StoreTheme } from "@/lib/cms/schema";

export type LaunchTemplateId = "clothing" | "food" | "general" | "landing" | "gadgets" | "crafts";

export interface LaunchTemplatePaymentDefaults {
  bkash_enabled: boolean;
  nagad_enabled: boolean;
  cod_enabled: boolean;
  prepaid_badge_text: string;
  prepayment_discount_type: "none" | "free_delivery" | "percentage" | "fixed";
  prepayment_discount_value: number;
}

export interface LaunchTemplate {
  id: LaunchTemplateId;
  name: string;
  shortName: string;
  description: string;
  storeDescription: string;
  theme: StoreTheme;
  hero: {
    tagline: string;
    title: string;
    highlight: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
    mediaUrl?: string;
  };
  pages: Omit<StorePage, "id">[];
  paymentDefaults: LaunchTemplatePaymentDefaults;
}

function block<TType extends StorePageBlock["type"]>(
  type: TType,
  sortOrder: number,
  props: Extract<StorePageBlock, { type: TType }>["props"],
): Extract<StorePageBlock, { type: TType }> {
  return {
    ...createDefaultBlock(type, sortOrder),
    props,
  } as Extract<StorePageBlock, { type: TType }>;
}

export const launchTemplates: LaunchTemplate[] = [
  {
    id: "clothing",
    name: "Clothing Store",
    shortName: "Clothing",
    description: "A fashion-first storefront for drops, categories, and featured products.",
    storeDescription: "Premium clothing, curated drops, and everyday essentials with fast local delivery.",
    theme: {
      presetId: "default",
      mode: "dark",
      aesthetic: "minimal",
      effects: { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    hero: {
      tagline: "New Season",
      title: "Wear Your",
      highlight: "Identity",
      subtitle: "Launch your clothing store with curated drops, premium product sections, and mobile-first checkout.",
      ctaText: "Shop Now",
      ctaLink: "/shop",
      secondaryCtaText: "Explore Collections",
      secondaryCtaLink: "/shop",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "Clothing Store",
        seoDescription: "Shop curated clothing drops and everyday essentials.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "New Season",
            title: "Wear Your",
            highlight: "Identity",
            subtitle: "Curated clothing drops, everyday essentials, and fast checkout for your customers.",
            ctaText: "Shop Now",
            ctaLink: "/shop",
            secondaryCtaText: "View Collection",
            secondaryCtaLink: "/shop",
          }),
          block("promo-banner", 1, {
            title: "Launch Drop Is Live",
            subtitle: "Show your newest shirts, polos, sets, or accessories with a strong campaign banner.",
            ctaText: "Browse New Arrivals",
            ctaLink: "/shop",
            badgeText: "Fresh Drop",
            bgStyle: "gradient",
            textAlignment: "center",
          }),
          block("category-showcase", 2, {
            tagline: "Categories",
            title: "Shop by Style",
          }),
          block("featured-products", 3, {
            limit: 6,
            title: "Featured Fits",
            tagline: "Curated",
          }),
          block("rich-text", 4, {
            eyebrow: "Why Shop Here",
            title: "Built for confident first purchases and repeat customers",
            body: "Turn first-time visitors into confident buyers with a clearer promise.\n\n- Clear product quality and selection guidance\n- Checkout options customers understand quickly\n- Straightforward exchange or support steps if something is not right",
            align: "left",
          }),
          block("faq-accordion", 5, {
            title: "Questions customers ask before they buy",
            subtitle: "Use these answers to remove hesitation around sizing, delivery, and payment.",
            faqs: [
              { q: "How long does delivery take?", a: "Explain your fulfillment timing by region, shipping method, or pickup flow so customers know what to expect." },
              { q: "How can customers pay?", a: "Describe the payment, inquiry, or booking options available for this store so buyers can choose the flow they trust." },
              { q: "What if the size does not fit?", a: "Add your exchange window and clear size-change steps here so customers feel safe ordering their first item." },
            ],
          }),
          block("social-feed", 6, {
            title: "Seen on customers and creators",
            subtitle: "Use real product photos, campaign shots, or creator images to make the brand feel active and trustworthy.",
            images: [],
          }),
          block("testimonials", 7, {
            title: "What shoppers notice after their first order",
            subtitle: "Keep short, specific proof close to the product discovery flow.",
            reviews: [
              { name: "Nafisa", rating: 5, comment: "The fit guidance was clear and delivery updates felt reliable from the first order." },
              { name: "Rahat", rating: 5, comment: "The collection felt premium without being confusing. I found what I needed quickly." },
            ],
          }),
        ],
      },
      {
        slug: "/policy",
        title: "Policy",
        seoTitle: "Return and Delivery Policy",
        seoDescription: "Delivery, exchange, and return policy.",
        isHomepage: false,
        blocks: [
          block("rich-text", 0, {
            eyebrow: "Store Policy",
            title: "Clear delivery and exchange rules",
            body: "Customers are more likely to place an order when your rules feel clear and fair.\n\n- Fulfillment timelines by region or service area\n- Exchange window and condition rules\n- Confirmation and support hours",
            align: "left",
          }),
          block("faq-accordion", 1, {
            title: "Policy questions",
            subtitle: "Answer the important details in plain language.",
            faqs: [
              { q: "How do exchanges work?", a: "Explain your exchange window, item condition rules, and how customers should contact support to start the process." },
              { q: "Do delivery charges vary by location?", a: "Clarify delivery charges by zone, region, or service type and explain when free fulfillment applies." },
              { q: "How are prepaid orders confirmed?", a: "Let buyers know how prepaid or manually verified orders are confirmed and when they receive an update." },
            ],
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: true,
      cod_enabled: true,
      prepaid_badge_text: "Priority Delivery",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
  {
    id: "food",
    name: "Food Store",
    shortName: "Food",
    description: "A menu-style store for homemade food, bakery items, meal boxes, and local delivery.",
    storeDescription: "Fresh food, meal boxes, bakery items, and local delivery made simple.",
    theme: {
      presetId: "warm-earth",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    hero: {
      tagline: "Fresh Today",
      title: "Homemade",
      highlight: "Goodness",
      subtitle: "Sell meals, bakery items, and daily specials with a simple storefront built for local orders.",
      ctaText: "Order Now",
      ctaLink: "/shop",
      secondaryCtaText: "See Specials",
      secondaryCtaLink: "/shop",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "Fresh Food Delivery",
        seoDescription: "Order fresh meals, bakery items, and local food specials.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "Fresh Today",
            title: "Homemade",
            highlight: "Goodness",
            subtitle: "Daily meals, bakery items, and local delivery from your kitchen to their table.",
            ctaText: "Order Now",
            ctaLink: "/shop",
            secondaryCtaText: "Today's Specials",
            secondaryCtaLink: "/shop",
          }),
          block("promo-banner", 1, {
            title: "Today's Special Menu",
            subtitle: "Feature combo meals, pre-order items, or limited daily batches before they sell out.",
            ctaText: "View Menu",
            ctaLink: "/shop",
            badgeText: "Fresh Batch",
            bgStyle: "luxury-gold",
            textAlignment: "center",
          }),
          block("featured-products", 2, {
            limit: 6,
            title: "Popular Items",
            tagline: "Best Sellers",
          }),
          block("rich-text", 3, {
            eyebrow: "Delivery Notes",
            title: "Set expectations before customers order",
            body: "Food buyers need confidence around freshness, timing, and service.\n\n- Delivery zones and timing windows\n- Daily cut-off time for same-day orders\n- Hygiene, packaging, and support commitments",
            align: "left",
          }),
          block("faq-accordion", 4, {
            title: "Ordering questions",
            subtitle: "Help customers understand exactly how ordering and delivery works.",
            faqs: [
              { q: "When should customers place an order?", a: "Use this answer to explain your same-day order cut-off time, pre-order rules, or seasonal availability." },
              { q: "How is the food delivered?", a: "Describe your packaging, delivery zones, and how long items usually take to reach the customer." },
              { q: "Can customers pay online or on delivery?", a: "Mention whether customers can pay in advance, on delivery, or through any other flow you support." },
            ],
          }),
          block("trust-badges", 5, {
            title: "Why regular customers keep reordering",
            badges: [
              { label: "Fresh batch handling", description: "Use this badge to explain freshness, prep timing, or daily limits.", icon: "shield" },
              { label: "Reliable local delivery", description: "Clarify the delivery zone, rider timing, or pickup handoff process.", icon: "truck" },
              { label: "Simple payment options", description: "Tell customers whether they can prepay, confirm manually, or pay on delivery.", icon: "payment" },
            ],
          }),
        ],
      },
      {
        slug: "/about-kitchen",
        title: "About Kitchen",
        seoTitle: "About Our Kitchen",
        seoDescription: "Learn about our kitchen, food quality, and delivery process.",
        isHomepage: false,
        blocks: [
          block("rich-text", 0, {
            eyebrow: "Our Kitchen",
            title: "Tell customers what makes your food trusted",
            body: "Use this page to tell a stronger trust story, not just a short intro.\n\n- Who cooks and prepares the food\n- Ingredient quality and hygiene standards\n- How delivery and freshness are protected",
            align: "left",
          }),
          block("social-feed", 1, {
            title: "From our kitchen to your table",
            subtitle: "Show real meals, prep moments, packaging, and happy customers.",
            images: [],
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: true,
      cod_enabled: true,
      prepaid_badge_text: "Confirmed Pre-Order",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
  {
    id: "general",
    name: "General Store",
    shortName: "General",
    description: "A flexible storefront for accessories, gifts, home goods, and mixed catalog sellers.",
    storeDescription: "A simple online store for curated products, gifts, essentials, and local delivery.",
    theme: {
      presetId: "ocean-teal",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    hero: {
      tagline: "Curated Picks",
      title: "Everything",
      highlight: "You Love",
      subtitle: "Start with a flexible storefront for products, offers, and clear customer support.",
      ctaText: "Browse Store",
      ctaLink: "/shop",
      secondaryCtaText: "Contact Us",
      secondaryCtaLink: "/contact",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "",
        seoDescription: "Browse curated products and local offers.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "Curated Picks",
            title: "Everything",
            highlight: "You Love",
            subtitle: "A flexible storefront for products, gift items, essentials, and local offers.",
            ctaText: "Browse Store",
            ctaLink: "/shop",
            secondaryCtaText: "Get Support",
            secondaryCtaLink: "/contact",
          }),
          block("promo-banner", 1, {
            title: "Featured Offers",
            subtitle: "Highlight new stock, bundles, seasonal campaigns, or special delivery offers.",
            ctaText: "Shop Offers",
            ctaLink: "/shop",
            badgeText: "Limited Offer",
            bgStyle: "indigo",
            textAlignment: "center",
          }),
          block("category-showcase", 2, {
            tagline: "Browse",
            title: "Shop by Category",
          }),
          block("featured-products", 3, {
            limit: 6,
            title: "Featured Products",
            tagline: "Recommended",
          }),
          block("rich-text", 4, {
            eyebrow: "Why customers choose us",
            title: "Make the store feel trustworthy before the first order",
            body: "A general store converts better when people quickly understand what you sell and how the service works.\n\n- Clear product presentation and honest pricing\n- Checkout options explained without friction\n- Delivery support and responsive customer care",
            align: "left",
          }),
          block("faq-accordion", 5, {
            title: "Need-to-know questions",
            subtitle: "Use this section to remove doubt around delivery, support, and payment.",
            faqs: [
              { q: "How long does delivery take?", a: "Set clear delivery expectations by region or service level so customers know what to expect before checkout." },
              { q: "Which payment methods are available?", a: "Tell customers whether they can pay online, on delivery, or through any other checkout flow you support." },
              { q: "How do customers get support after ordering?", a: "Add your preferred support channel and response hours so buyers know they can reach you." },
            ],
          }),
          block("trust-badges", 6, {
            title: "Trust cues before checkout",
            badges: [
              { label: "Clear support flow", description: "Use this to explain the fastest support channel and response expectation.", icon: "support" },
              { label: "Flexible payment setup", description: "Tell customers whether they can pay online, manually, or on delivery.", icon: "payment" },
              { label: "Delivery confidence", description: "Explain how you handle regions, timing, or fulfillment confirmation.", icon: "truck" },
            ],
          }),
          block("testimonials", 7, {
            title: "Quick proof for first-time buyers",
            subtitle: "Use short comments that reduce hesitation without slowing the page down.",
            reviews: [
              { name: "Tanzim", rating: 5, comment: "The checkout was simple and the delivery expectations were clear before I ordered." },
              { name: "Sadia", rating: 5, comment: "It felt like a real store, not a random catalog page. Support was easy to find too." },
            ],
          }),
        ],
      },
      {
        slug: "/about-store",
        title: "About Store",
        seoTitle: "About Our Store",
        seoDescription: "Learn about our products and service.",
        isHomepage: false,
        blocks: [
          block("rich-text", 0, {
            eyebrow: "About",
            title: "Introduce your store clearly",
            body: "A short generic intro is not enough. Use this page to explain what you sell, who it is for, and why ordering feels safe.\n\n- What makes your products or sourcing different\n- How delivery and support work\n- Why first-time customers can order with confidence",
            align: "left",
          }),
          block("featured-products", 1, {
            limit: 3,
            title: "Best place to start",
            tagline: "Recommended",
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: false,
      cod_enabled: true,
      prepaid_badge_text: "Fast Processing",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
  {
    id: "landing",
    name: "Landing Page",
    shortName: "Landing",
    description: "A direct-to-WhatsApp promotional landing page with a conversion-focused hero, key highlights, trust badges, and FAQs.",
    storeDescription: "Direct-to-WhatsApp landing page for instant customer orders and inquiries.",
    theme: {
      presetId: "midnight-blue",
      mode: "dark",
      aesthetic: "minimal",
      effects: { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    hero: {
      tagline: "Direct Order",
      title: "Connect & Order",
      highlight: "on WhatsApp",
      subtitle: "Skip traditional checkout steps and talk directly with the seller for instant customer service and custom ordering.",
      ctaText: "Order via WhatsApp",
      ctaLink: "#whatsapp",
      secondaryCtaText: "Read FAQs",
      secondaryCtaLink: "#faq",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "Promotional Landing Page",
        seoDescription: "Order directly on WhatsApp with fast support and custom response.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "Direct Order",
            title: "Connect & Order",
            highlight: "on WhatsApp",
            subtitle: "Skip traditional checkout steps and talk directly with the seller for instant customer service and custom ordering.",
            ctaText: "Order via WhatsApp",
            ctaLink: "#whatsapp",
            secondaryCtaText: "Read FAQs",
            secondaryCtaLink: "#faq",
          }),
          block("rich-text", 1, {
            eyebrow: "Why Order Directly",
            title: "Fast, personal customer service without checkout friction",
            body: "Connect directly with our team to place your order, customize options, or ask questions before you buy.\n\n- Instant WhatsApp order confirmation\n- Personal customer assistance for questions or custom options\n- Fast local delivery and payment guidance",
            align: "left",
          }),
          block("trust-badges", 2, {
            title: "Why customers prefer direct ordering",
            badges: [
              { label: "Direct Communication", description: "Talk directly with the merchant on WhatsApp for quick confirmation.", icon: "support" },
              { label: "Flexible Payments", description: "Pay via bKash, Nagad, or Cash on Delivery after order confirmation.", icon: "payment" },
              { label: "Fast Handoff", description: "Clear delivery timeline and real-time updates directly in your chat.", icon: "truck" },
            ],
          }),
          block("faq-accordion", 3, {
            title: "Frequently Asked Questions",
            subtitle: "Everything you need to know about direct ordering.",
            faqs: [
              { q: "How do I place an order?", a: "Click the WhatsApp button to start a conversation. We will confirm item availability, total price, and delivery details with you." },
              { q: "What payment methods are supported?", a: "We support bKash, Nagad, and Cash on Delivery. Payment details are provided directly in WhatsApp during chat." },
              { q: "How long does delivery take?", a: "Delivery timing is confirmed when you place your order via chat based on your location and items." },
            ],
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: true,
      cod_enabled: true,
      prepaid_badge_text: "WhatsApp Verified",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
  {
    id: "gadgets",
    name: "Gadgets & Electronics Store",
    shortName: "Gadgets",
    description: "A tech-focused storefront for devices, accessories, specs, and feature-led product showcases.",
    storeDescription: "Smart devices, practical accessories, spec-led merchandising, and warranty support.",
    theme: {
      presetId: "midnight-blue",
      mode: "dark",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    hero: {
      tagline: "Engineered for Everyday",
      title: "Gear Up with",
      highlight: "Better Tech",
      subtitle: "Discover high-performance gadgets, smart audio, charging gear, and essential accessories with verified warranty support.",
      ctaText: "Explore Tech",
      ctaLink: "/shop",
      secondaryCtaText: "View Spec Sheets",
      secondaryCtaLink: "/shop",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "Gadgets & Electronics Store",
        seoDescription: "Shop smart devices, accessories, and tech gear with warranty.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "Engineered for Everyday",
            title: "Gear Up with",
            highlight: "Better Tech",
            subtitle: "Discover high-performance gadgets, smart audio, charging gear, and essential accessories with verified warranty support.",
            ctaText: "Explore Tech",
            ctaLink: "/shop",
            secondaryCtaText: "View Spec Sheets",
            secondaryCtaLink: "/shop",
          }),
          block("promo-banner", 1, {
            title: "Next-Gen Gear & Bundles",
            subtitle: "Save on essential gadget bundles, fast chargers, and daily tech upgrades.",
            ctaText: "Shop Tech Bundles",
            ctaLink: "/shop",
            badgeText: "Featured Tech",
            bgStyle: "dark",
            textAlignment: "center",
          }),
          block("category-showcase", 2, {
            tagline: "Categories",
            title: "Browse by Tech Type",
          }),
          block("featured-products", 3, {
            limit: 6,
            title: "Bestselling Gear",
            tagline: "High Specs",
          }),
          block("rich-text", 4, {
            eyebrow: "Warranty & Quality",
            title: "Built for reliable performance and spec transparency",
            body: "Shop electronics with confidence.\n\n- Detailed specifications and compatibility guidance\n- Official warranty and replacement support\n- Fast, safe packaging and verified delivery",
            align: "left",
          }),
          block("faq-accordion", 5, {
            title: "Gadget & Warranty FAQs",
            subtitle: "Clear answers regarding specs, warranty claims, and shipping.",
            faqs: [
              { q: "Do these electronics come with a warranty?", a: "Yes! All gadgets include seller or brand warranty details clearly listed on the product page." },
              { q: "How are fragile devices packaged for shipping?", a: "Products are double-boxed with anti-static foam and shock protection to ensure safe transit." },
              { q: "What is your return policy for defective tech?", a: "If a device arrives defective, contact support within 7 days for immediate replacement or repair." },
            ],
          }),
          block("trust-badges", 6, {
            title: "Tech Purchase Cues",
            badges: [
              { label: "Warranty Covered", description: "Official warranty and serial verification.", icon: "shield" },
              { label: "Shockproof Packaging", description: "Multi-layer protective boxing for sensitive devices.", icon: "truck" },
              { label: "Tech Support", description: "Dedicated customer assistance for device setup and troubleshooting.", icon: "support" },
            ],
          }),
          block("testimonials", 7, {
            title: "Verified buyer reviews",
            subtitle: "See what customers say about product performance and delivery.",
            reviews: [
              { name: "Tanvir", rating: 5, comment: "The specs matched the description exactly, and packaging was solid." },
              { name: "Farhan", rating: 5, comment: "Fast shipping and helpful customer support when verifying compatibility." },
            ],
          }),
        ],
      },
      {
        slug: "/policy",
        title: "Policy",
        seoTitle: "Warranty and Return Policy",
        seoDescription: "Warranty guidelines, delivery care, and return policy.",
        isHomepage: false,
        blocks: [
          block("rich-text", 0, {
            eyebrow: "Warranty Policy",
            title: "Clear gadget warranty and support terms",
            body: "Our electronics coverage guarantees peace of mind for every customer.\n\n- Warranty coverage breakdown and claim steps\n- Defective item replacement window\n- Shipping protection for delicate hardware",
            align: "left",
          }),
          block("faq-accordion", 1, {
            title: "Tech policy questions",
            subtitle: "Understanding warranty and replacement terms.",
            faqs: [
              { q: "How do I claim warranty support?", a: "Keep your invoice and contact support with your order ID to initiate a claim." },
              { q: "What is covered under warranty?", a: "Manufacturing defects and hardware failures under normal usage are fully covered." },
            ],
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: true,
      cod_enabled: true,
      prepaid_badge_text: "Verified Tech Order",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
  {
    id: "crafts",
    name: "Crafts & Handmade Store",
    shortName: "Crafts",
    description: "A story-led storefront for handmade goods, artisan gifts, commissions, and small-batch collections.",
    storeDescription: "Handmade collections, limited batches, maker stories, giftable items, and custom order support.",
    theme: {
      presetId: "warm-earth",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    hero: {
      tagline: "Made with Care",
      title: "Bring Handmade",
      highlight: "Closer",
      subtitle: "Discover small-batch artisan creations, handcrafted gifts, and custom pieces crafted with passion and detail.",
      ctaText: "Browse Crafts",
      ctaLink: "/shop",
      secondaryCtaText: "Meet the Maker",
      secondaryCtaLink: "/about",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "Crafts & Handmade Goods",
        seoDescription: "Shop artisanal handcrafted goods, gifts, and custom pieces.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "Made with Care",
            title: "Bring Handmade",
            highlight: "Closer",
            subtitle: "Discover small-batch artisan creations, handcrafted gifts, and custom pieces crafted with passion and detail.",
            ctaText: "Browse Crafts",
            ctaLink: "/shop",
            secondaryCtaText: "Meet the Maker",
            secondaryCtaLink: "/about",
          }),
          block("promo-banner", 1, {
            title: "Small Batch Release",
            subtitle: "Each piece is individually crafted. Reserve limited-run items before they sell out.",
            ctaText: "View Limited Items",
            ctaLink: "/shop",
            badgeText: "Artisan Made",
            bgStyle: "luxury-gold",
            textAlignment: "center",
          }),
          block("category-showcase", 2, {
            tagline: "Collections",
            title: "Explore Handmade Categories",
          }),
          block("featured-products", 3, {
            limit: 6,
            title: "Artisan Favorites",
            tagline: "Handcrafted",
          }),
          block("rich-text", 4, {
            eyebrow: "Our Craft Philosophy",
            title: "Unique pieces made with sustainable materials and dedication",
            body: "Every product carries a story.\n\n- Sustainably sourced natural materials\n- Individually handcrafted by independent makers\n- Custom personalization options available on request",
            align: "left",
          }),
          block("faq-accordion", 5, {
            title: "Handmade & Custom Order FAQs",
            subtitle: "Answers about craft materials, custom sizing, and gift wrapping.",
            faqs: [
              { q: "Are all items 100% handmade?", a: "Yes, every product is handcrafted in small batches, making each piece subtly unique." },
              { q: "Can I request custom colors or personalized engraving?", a: "Absolutely! Contact us before or right after placing your order to discuss custom modifications." },
              { q: "Is gift packaging available?", a: "Yes, we offer eco-friendly gift wrapping and custom handwritten note cards upon request." },
            ],
          }),
          block("trust-badges", 6, {
            title: "Artisan Trust Cues",
            badges: [
              { label: "100% Handcrafted", description: "Authentic small-batch artisan production.", icon: "shield" },
              { label: "Careful Packaging", description: "Eco-friendly, protective gift boxes for delicate items.", icon: "truck" },
              { label: "Custom Orders", description: "Direct maker support for custom sizes and personal touches.", icon: "support" },
            ],
          }),
          block("testimonials", 7, {
            title: "Words from craft lovers",
            subtitle: "Real feedback from buyers who value artisan craftsmanship.",
            reviews: [
              { name: "Sabrina", rating: 5, comment: "The packaging was beautiful and the craft quality surpassed my expectations." },
              { name: "Ayman", rating: 5, comment: "Ordered a custom piece for a birthday gift—the seller was super attentive and helpful." },
            ],
          }),
        ],
      },
      {
        slug: "/policy",
        title: "Policy",
        seoTitle: "Crafts Delivery and Custom Order Policy",
        seoDescription: "Information on custom orders, craft care, and shipping.",
        isHomepage: false,
        blocks: [
          block("rich-text", 0, {
            eyebrow: "Artisan Policy",
            title: "Craft delivery and custom order guidelines",
            body: "Clear guidelines for custom commissions and artisanal products.\n\n- Small-batch creation timelines\n- Custom order cancellation and adjustment windows\n- Gift wrapping and protective delivery packaging",
            align: "left",
          }),
          block("faq-accordion", 1, {
            title: "Craft policy details",
            subtitle: "Understand lead times and custom order terms.",
            faqs: [
              { q: "What is the lead time for custom items?", a: "Custom items take 3-7 business days to craft depending on complexity before shipment." },
            ],
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: true,
      cod_enabled: true,
      prepaid_badge_text: "Handmade Deposit",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
];

export function getLaunchTemplate(templateId: LaunchTemplateId): LaunchTemplate {
  return launchTemplates.find((template) => template.id === templateId) ?? launchTemplates[0];
}

export function instantiateLaunchPages(templateId: LaunchTemplateId): StorePage[] {
  const template = getLaunchTemplate(templateId);

  return template.pages.map((page) => ({
    ...page,
    id: crypto.randomUUID(),
    blocks: page.blocks.map((pageBlock, index) => ({
      ...pageBlock,
      id: crypto.randomUUID(),
      sortOrder: index,
    })),
  }));
}
