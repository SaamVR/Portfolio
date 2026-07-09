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
          title: "Tell customers what matters here",
          body: "Use this block for shipping notes, your origin story, campaign copy, or any custom landing-page content.",
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
          title: "Follow Us",
          subtitle: "@yourbrand",
          images: [],
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
          videoUrl: "",
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
          faqs: [{ q: "What is your return policy?", a: "We offer 7-day returns on unworn items." }],
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
