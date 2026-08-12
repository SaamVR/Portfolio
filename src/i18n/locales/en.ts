export const enTranslation = {
  nav: {
    features: "Features",
    howItWorks: "How It Works",
    templates: "Templates",
    pricing: "Pricing",
    login: "Login",
    startTrial: "Start building",
  },
  hero: {
    badge: "Meet The New Standard",
    headlineWords: ["defy expectations.", "convert visitors.", "tell your story."],
    titlePrefix: "Design stores that ",
    subtitle: "A full-stack commerce engine with atomic design tokens, Supabase-backed RLS security, and native bKash/Nagad checkout — wrapped in a zero-code visual builder that renders at the edge in under 300ms.",
    primaryCta: "Start Free Trial",
    secondaryCta: "See it in action",
    trustBadges: [
      "No credit card required",
      "Supabase RLS + Prisma ORM",
      "bKash, Nagad & Stripe ready",
      "Pathao & Steadfast couriers"
    ]
  },
  trustBar: "Integrated with Bangladesh & Global Commerce Systems",

  howItWorks: {
    badge: "Seed → Customize → Ship",
    titleMain: "From zero to ",
    titleHighlight: "accepting payments",
    titleSuffix: " in under an hour",
    subtitle: "No developer, no deployment pipeline, no payment gateway paperwork. Pick a seed, drag your brand into place, and go live with bKash checkout and Pathao courier auto-booking.",
    step1: {
      title: "Clone a Production-Ready Seed",
      desc: "Choose from industry-optimized template seeds — Fashion, Beauty, Electronics, or Grocery — each pre-loaded with sample products, SEO metadata, navigation, hero banners, and category taxonomies."
    },
    step2: {
      title: "Visually Customize Every Token",
      desc: "Adjust design tokens (primary colors, font stacks, border radii), re-order page blocks, and preview responsive layouts across desktop, tablet, and mobile breakpoints — all without touching code."
    },
    step3: {
      title: "Go Live with Local Infra",
      desc: "Bind your custom domain with auto-provisioned SSL, activate bKash & Nagad payment webhooks, enable Pathao/Steadfast courier auto-booking, and start accepting orders — all from a single admin dashboard."
    },
    ctaBtn: "Explore Detailed Workflow & Live Architecture"
  },
  templates: {
    badge: "Industry-Tuned Storefronts",
    titleMain: "Pre-engineered for ",
    titleHighlight: "your vertical",
    subtitle: "Each template ships with industry-specific product schemas, checkout flows, SEO structures, and conversion-optimized block layouts — ready to customize via the token engine.",
    useTemplate: "Use the {name} template",
    templateFeatures: {
      fashion: ["Size-chart variant picker with visual swatches", "Lookbook hero carousel with 60fps parallax", "Wishlist persistence via Supabase row-level security"],
      beauty: ["Ingredient highlight blocks with expandable details", "Before/after slider component for product proof", "Subscription-ready recurring checkout flow"],
      electronics: ["Spec-comparison table block with sortable columns", "Warranty badge and return policy trust signals", "Stock-level live indicator with Supabase realtime"],
      food: ["Weight-based shipping calculator for perishables", "Freshness date badge with auto-expiry warnings", "Bulk order discount tiers with dynamic pricing"]
    }
  },
  testimonials: {
    badge: "Merchant Proof",
    titleMain: "Trusted by merchants who ",
    titleHighlight: "ship fast",
    subtitle: "Real merchants. Real metrics. From first seed clone to processing thousands of bKash transactions monthly.",
    list: [
      {
        quote: "EZComo allowed us to launch our fashion store in 2 days. The mobile checkout with bKash improved our order conversion by 45%.",
        author: "Tariq Ahmed",
        role: "Founder, Urban Threads",
        template: "Fashion Catalog",
        rating: 5,
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
      },
      {
        quote: "The live preview editor is game-changing. Changing colors and typography across our entire storefront takes seconds without breaking code.",
        author: "Nusrat Jahan",
        role: "Marketing Director, Glow Beauty",
        template: "Beauty Glow",
        rating: 5,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
      },
      {
        quote: "Pathao courier pick-up integration right from our EZComo order dashboard saved our operations team 15+ hours per week.",
        author: "Rahim Chowdhury",
        role: "Operations Lead, TechMart BD",
        template: "Electronics Hub",
        rating: 5,
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
      },
      {
        quote: "Moving from Shopify to EZComo was the best decision. Zero transaction fees and out-of-the-box local payment methods.",
        author: "Sarah Islam",
        role: "Owner, Minimalist Co",
        template: "Lifestyle Minimal",
        rating: 5,
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
      }
    ]
  },
  metrics: {
    templates: "Seed Templates & Block Primitives",
    edge: "Edge-Rendered TTFB",
    fee: "Platform Transaction Fee",
    code: "Lines of Code to Ship"
  },
  comparison: {
    badge: "Architecture Comparison",
    titleMain: "EZComo vs. ",
    titleHighlight: "legacy e-commerce stacks",
    colFeature: "Feature",
    colEzcomo: "EZComo",
    colDiy: "DIY Platforms",
    rows: [
      { name: "Time to First Sale", ezcomo: "Under 1 Hour", diy: "2-6 Weeks" },
      { name: "Page Builder", ezcomo: "Atomic Block Engine", diy: "Theme Code / Liquid" },
      { name: "Design Token System", ezcomo: "Cascading Variables", diy: "Manual CSS Overrides" },
      { name: "bKash / Nagad Checkout", ezcomo: "Native Webhook Integration", diy: "3rd-Party Plugin Fees" },
      { name: "Courier Auto-Booking", ezcomo: "Pathao + Steadfast API", diy: "Manual Copy-Paste" },
      { name: "Database Architecture", ezcomo: "Supabase RLS + Prisma", diy: "Shared MySQL / No RLS" },
      { name: "TTFB Performance", ezcomo: "< 300ms Edge SSR", diy: "1-3s Server Rendered" },
      { name: "Transaction Fees", ezcomo: "0% Platform Fee", diy: "2-5% Per Transaction" },
    ]
  },
  cta: {
    titleMain: "Your store deserves ",
    titleHighlight: "better architecture.",
    subtitle: "Atomic design tokens. Supabase security. Native bKash checkout. Pathao auto-booking. Zero transaction fees. One dashboard.",
    btn: "Create Your Store"
  },
  footer: {
    desc: "Full-stack commerce CMS built on Next.js, Supabase, and Prisma. Atomic design tokens, zero-code visual builder, native Bangladesh payment & courier integrations, and edge-rendered storefronts.",
    product: "Product",
    integrations: "Integrations",
    platform: "Platform"
  }
};

export type TranslationSchema = typeof enTranslation;
