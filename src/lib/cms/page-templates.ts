import type { StorePage, StorePageBlock } from "@/lib/cms/schema";
import { createDefaultBlock } from "@/lib/cms/block-library";

export interface CmsPageTemplate {
  id: string;
  name: string;
  description: string;
  page: Omit<StorePage, "id">;
}

function createTemplateBlock<TType extends StorePageBlock["type"]>(
  type: TType,
  sortOrder: number,
  props: Extract<StorePageBlock, { type: TType }>["props"],
): Extract<StorePageBlock, { type: TType }> {
  return {
    ...createDefaultBlock(type, sortOrder),
    props,
  } as Extract<StorePageBlock, { type: TType }>;
}

function cloneBlock(block: StorePageBlock, sortOrder: number): StorePageBlock {
  return {
    ...block,
    id: crypto.randomUUID(),
    sortOrder,
  };
}

export const cmsPageTemplates: CmsPageTemplate[] = [
  {
    id: "landing",
    name: "Landing",
    description: "Hero, promo, categories, and featured products for campaign pages.",
    page: {
      slug: "/landing",
      title: "Landing Page",
      seoTitle: "Landing Page",
      seoDescription: "A campaign-focused landing page for product launches and promotions.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("hero", 0, {
          tagline: "Featured Launch",
          title: "Launch Your Next",
          highlight: "Offer",
          subtitle: "Use this landing template for product releases, campaigns, service promos, or seasonal offers.",
          ctaText: "Explore the offer",
          ctaLink: "/shop",
          secondaryCtaText: "See the story",
          secondaryCtaLink: "/about",
        }),
        createTemplateBlock("promo-banner", 1, {
          title: "A strong offer in the middle of the page",
          subtitle: "Pair this with your main campaign message and one decisive CTA.",
          ctaText: "Shop the offer",
          ctaLink: "/shop",
          badgeText: "Featured Campaign",
          bgStyle: "gradient",
          textAlignment: "center",
        }),
        createDefaultBlock("category-showcase", 2),
        createTemplateBlock("featured-products", 3, {
          limit: 6,
          title: "Featured Highlights",
          tagline: "Curated",
        }),
        createTemplateBlock("rich-text", 4, {
          eyebrow: "Why buyers convert here",
          title: "Give customers a reason to trust the offer",
          body: "Campaign pages work best when the promise feels specific and safe.\n\n- Clear value and product positioning\n- Trusted payments and direct support\n- Delivery or exchange expectations before checkout",
          align: "left",
        }),
        createTemplateBlock("faq-accordion", 5, {
          title: "Questions before checkout",
          subtitle: "Answer the buying questions people ask on campaign pages.",
          faqs: [
            { q: "What makes this offer worth buying now?", a: "Use this answer to explain your limited drop, bundle value, early access, or any concrete reason for urgency." },
            { q: "How long does delivery take?", a: "Set clear delivery timing so customers can decide with confidence." },
            { q: "Which payment options are available?", a: "Explain which payment methods, inquiry flows, or booking steps apply to this offer." },
          ],
        }),
      ],
    },
  },
  {
    id: "about",
    name: "About",
    description: "Story-driven page with brand intro, mission, and trust-building sections.",
    page: {
      slug: "/about-brand",
      title: "About",
      seoTitle: "About This Business",
      seoDescription: "Share your story, values, and what makes the business worth choosing.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("rich-text", 0, {
          eyebrow: "Our Story",
          title: "Tell customers what this business is about",
          body: "Use this page to explain your origin, the people behind the business, and why your offer matters.",
          align: "left",
        }),
        createTemplateBlock("rich-text", 1, {
          eyebrow: "Approach",
          title: "What customers can count on",
          body: "Explain your standards, process, sourcing, service model, or anything that helps customers trust the business.\n\n- Quality or delivery standards\n- How selection, customization, or fulfillment works\n- What support looks like after the sale",
          align: "left",
        }),
        createTemplateBlock("featured-products", 2, {
          limit: 3,
          title: "Start Here",
          tagline: "Recommended",
        }),
        createTemplateBlock("social-feed", 3, {
          title: "How the business shows up",
          subtitle: "Use real product, venue, service, or behind-the-scenes images to make the story believable.",
          images: [],
        }),
      ],
    },
  },
  {
    id: "policy",
    name: "Policy",
    description: "Refund, delivery, and service information in a simple content-first layout.",
    page: {
      slug: "/policy",
      title: "Policies",
      seoTitle: "Store Policy",
      seoDescription: "Refunds, shipping, exchange policy, and customer support notes.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("rich-text", 0, {
          eyebrow: "Store Policy",
          title: "Set clear expectations before purchase",
          body: "Summarize delivery times, return windows, payment terms, exchange rules, booking terms, or support availability.",
          align: "left",
        }),
        createTemplateBlock("rich-text", 1, {
          eyebrow: "Need help?",
          title: "Make support easy to find",
          body: "Add WhatsApp response hours, phone support, or order-issue escalation details here.\n\n- Best channel for quick help\n- Hours when responses are fastest\n- What to include when reporting an order issue",
          align: "left",
        }),
        createTemplateBlock("faq-accordion", 2, {
          title: "Policy FAQs",
          subtitle: "Use these answers to reduce confusion before the customer orders.",
          faqs: [
            { q: "What is your exchange or return window?", a: "Explain how many days customers have, what condition the item must be in, and how they should request support." },
            { q: "How are delivery charges calculated?", a: "Clarify delivery charges by region and whether free delivery applies above a threshold." },
            { q: "How are order issues resolved?", a: "Explain the steps customers should follow if they receive the wrong item, damaged packaging, or a delayed delivery." },
          ],
        }),
      ],
    },
  },
  {
    id: "new-arrivals",
    name: "New Arrivals",
    description: "Just-dropped collection page with urgency, product picks, and social proof.",
    page: {
      slug: "/new-arrivals",
      title: "New Arrivals",
      seoTitle: "New Arrivals",
      seoDescription: "Shop the newest products and latest drops.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("hero", 0, {
          tagline: "Recently Added",
          title: "New",
          highlight: "Arrivals",
          subtitle: "Fresh additions, limited stock, and the latest items or offers from the store.",
          ctaText: "Browse new arrivals",
          ctaLink: "/shop?tag=new",
        }),
        createTemplateBlock("countdown", 1, {
          title: "Launch week offer",
          subtitle: "Early buyers get first access before availability changes.",
          endDate: "2026-12-31T23:59:59+06:00",
          ctaText: "Browse the drop",
          ctaLink: "/shop?tag=new",
        }),
        createTemplateBlock("featured-products", 2, {
          limit: 8,
          title: "New Arrivals",
          tagline: "New",
        }),
        createDefaultBlock("social-feed", 3),
      ],
    },
  },
  {
    id: "sale-offers",
    name: "Sale / Offers",
    description: "Urgency-first sale page with offer banner, products, and conditions.",
    page: {
      slug: "/sale",
      title: "Sale",
      seoTitle: "Sale & Offers",
      seoDescription: "Shop current offers, sale products, and limited-time deals.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("countdown", 0, {
          title: "Sale ends soon",
          subtitle: "Popular items can change availability before the timer ends.",
          endDate: "2026-12-31T23:59:59+06:00",
          ctaText: "Shop sale",
          ctaLink: "/shop",
        }),
        createTemplateBlock("promo-banner", 1, {
          title: "Limited-time offers",
          subtitle: "Highlight your best discount, bundle, or clearance offer here.",
          ctaText: "Grab the deal",
          ctaLink: "/shop",
          badgeText: "Sale Event",
          bgStyle: "confetti",
          textAlignment: "center",
        }),
        createTemplateBlock("featured-products", 2, {
          limit: 8,
          title: "Sale Picks",
          tagline: "Offers",
        }),
        createTemplateBlock("rich-text", 3, {
          eyebrow: "Sale Conditions",
          title: "Make the offer terms clear",
          body: "Explain discount validity, stock limits, delivery timing, and whether exchanges apply to sale products.",
          align: "left",
        }),
      ],
    },
  },
  {
    id: "lookbook",
    name: "Lookbook",
    description: "Campaign page with gallery, video, products, and collection story.",
    page: {
      slug: "/lookbook",
      title: "Lookbook",
      seoTitle: "Lookbook",
      seoDescription: "Explore the latest campaign, styling ideas, and featured products.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("social-feed", 0, {
          title: "Campaign Gallery",
          subtitle: "Full-width lifestyle shots, product closeups, and styling ideas.",
          images: [
            "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80",
            "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900&q=80",
            "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&q=80",
          ],
        }),
        createDefaultBlock("video-reel", 1),
        createTemplateBlock("featured-products", 2, {
          limit: 6,
          title: "Shop the Campaign",
          tagline: "Lookbook",
        }),
        createTemplateBlock("rich-text", 3, {
          eyebrow: "Collection Story",
          title: "Tell the campaign idea behind the looks",
          body: "Use this space for styling direction, inspiration, model notes, or product details customers should notice.",
          align: "center",
        }),
      ],
    },
  },
  {
    id: "contact-us",
    name: "Contact Us",
    description: "Support-focused content block and FAQ for WhatsApp, hours, and order help.",
    page: {
      slug: "/contact-us",
      title: "Contact Us",
      seoTitle: "Contact Us",
      seoDescription: "Find support hours, WhatsApp contact details, and order help.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("rich-text", 0, {
          eyebrow: "Support",
          title: "Make help easy to reach",
          body: "Add your WhatsApp number, response hours, order support process, and the best way for customers to share delivery questions.",
          align: "left",
        }),
        createTemplateBlock("faq-accordion", 1, {
          title: "Support Topics",
          subtitle: "Answer the support questions customers usually ask before messaging.",
          faqs: [
            { q: "What should I include when asking about an order?", a: "Ask customers to include their order number, phone number, and delivery area." },
            { q: "When do you reply on WhatsApp?", a: "Add your normal support hours and expected response time." },
            { q: "Can I change delivery details after ordering?", a: "Explain the cutoff for changing phone, address, or delivery instructions." },
          ],
        }),
      ],
    },
  },
];

export function instantiateTemplate(templateId: string, pageCount: number): StorePage | null {
  const template = cmsPageTemplates.find((item) => item.id === templateId);
  if (!template) {
    return null;
  }

  const source = template.page;
  const safeSlug = source.slug === "/" ? `/page-${pageCount + 1}` : source.slug;

  return {
    ...source,
    id: crypto.randomUUID(),
    slug: safeSlug,
    blocks: source.blocks.map((block, index) => cloneBlock(block, index)),
  };
}

export function applyTemplateToPage(page: StorePage, templateId: string): StorePage | null {
  const template = cmsPageTemplates.find((item) => item.id === templateId);
  if (!template) {
    return null;
  }

  return {
    ...page,
    title: template.page.title,
    seoTitle: template.page.seoTitle,
    seoDescription: template.page.seoDescription,
    blocks: template.page.blocks.map((block, index) => cloneBlock(block, index)),
  };
}
