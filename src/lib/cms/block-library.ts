import type { StorePage, StorePageBlock } from "@/lib/cms/schema";

export const reservedCmsSlugs = new Set([
  "/",
  "/about",
  "/account",
  "/admin",
  "/auth",
  "/bkash",
  "/cart",
  "/checkout",
  "/contact",
  "/faq",
  "/order-success",
  "/product",
  "/returns",
  "/shop",
  "/track-order",
  "/wishlist",
]);

export const cmsBlockTypeOptions: Array<{
  value: StorePageBlock["type"];
  label: string;
  description: string;
}> = [
  { value: "hero", label: "Hero", description: "Main storefront hero banner" },
  { value: "countdown", label: "Countdown", description: "Time-limited sale strip" },
  { value: "promo-banner", label: "Promo Banner", description: "Mid-page promotional section" },
  { value: "category-showcase", label: "Category Showcase", description: "Category grid with icons or images" },
  { value: "featured-products", label: "Featured Products", description: "Featured product grid" },
  { value: "recently-viewed", label: "Recently Viewed", description: "Customer history carousel" },
  { value: "rich-text", label: "Rich Text", description: "Simple heading and body content" },
  { value: "social-feed", label: "Social Feed / Gallery", description: "Masonry style image grid" },
  { value: "video-reel", label: "Video Reel", description: "Vertical or full-width video highlight" },
  { value: "faq-accordion", label: "FAQ Accordion", description: "Collapsible questions and answers" },
  { value: "trust-badges", label: "Trust Badges", description: "Delivery, payment, return, and support promises" },
  { value: "testimonials", label: "Testimonials", description: "Customer review carousel for social proof" },
];

export function createDefaultBlock(type: StorePageBlock["type"], sortOrder: number): StorePageBlock {
  const id = crypto.randomUUID();

  switch (type) {
    case "featured-products":
      return {
        id,
        type,
        sortOrder,
        isVisible: true,
        props: {
          limit: 6,
        },
      };
    case "rich-text":
      return {
        id,
        type,
        sortOrder,
        isVisible: true,
        props: {
          eyebrow: "Story",
          title: "Give customers a stronger reason to trust your store",
          body: "Use this block for shipping notes, your origin story, campaign copy, or any custom landing-page content.\n\n- What makes your offer worth buying\n- How delivery or support works\n- Why first-time customers can feel confident",
          align: "center",
        },
      };
    case "social-feed":
      return {
        id,
        type,
        sortOrder,
        isVisible: true,
        props: {
          title: "Seen in real life",
          subtitle: "Use real product photos, customer posts, or campaign images here.",
          images: [
            "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
            "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80",
            "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
          ],
        },
      };
    case "video-reel":
      return {
        id,
        type,
        sortOrder,
        isVisible: true,
        props: {
          title: "See it in action",
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          ctaText: "Shop the look",
          ctaLink: "/shop",
        },
      };
    case "faq-accordion":
      return {
        id,
        type,
        sortOrder,
        isVisible: true,
        props: {
          title: "Frequently Asked Questions",
          faqs: [
            { q: "What is your return policy?", a: "We offer 7-day returns on unworn items." },
            { q: "How long does delivery take?", a: "Delivery times depend on your location, shipping method, and the merchant's fulfillment schedule." },
            { q: "Which payment methods are available?", a: "Available payment methods depend on how the merchant has configured checkout for this store." },
          ],
        },
      };
    case "trust-badges":
      return {
        id,
        type,
        sortOrder,
        isVisible: true,
        props: {
          title: "Shop with confidence",
          badges: [
            { icon: "truck", label: "Flexible Fulfillment", description: "Local delivery, shipping, pickup, or other merchant-defined fulfillment options." },
            { icon: "payment", label: "Secure Checkout", description: "Payment methods are configured by the merchant for this store." },
            { icon: "returns", label: "Clear Support", description: "Customers can review the store's return, exchange, and support terms before ordering." },
          ],
        },
      };
    case "testimonials":
      return {
        id,
        type,
        sortOrder,
        isVisible: true,
        props: {
          title: "Customers are talking",
          subtitle: "Real review snippets help first-time buyers feel safer before checkout.",
          reviews: [
            { name: "Jordan P.", rating: 5, comment: "The product quality matched the photos and the ordering experience felt smooth." },
            { name: "Avery L.", rating: 5, comment: "Support answered quickly and helped me pick the right option before checkout." },
            { name: "Taylor M.", rating: 4, comment: "Shipping updates were clear and the store handled my follow-up questions well." },
          ],
        },
      };
    default:
      return {
        id,
        type,
        sortOrder,
        isVisible: true,
        props: {},
      };
  }
}

export function createDefaultCmsPage(pageCount: number): StorePage {
  return {
    id: crypto.randomUUID(),
    slug: `/page-${pageCount + 1}`,
    title: `Page ${pageCount + 1}`,
    seoTitle: "",
    seoDescription: "",
    isHomepage: false,
    blocks: [createDefaultBlock("rich-text", 0)],
  };
}
