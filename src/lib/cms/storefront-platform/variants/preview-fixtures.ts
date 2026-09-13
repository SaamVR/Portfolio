import type { StorePageBlock } from "@/lib/cms/schema";

export type SectionStylePreviewItem = {
  title: string;
  meta?: string;
  imageUrl?: string;
};

export type SectionStylePreviewFixture = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  primaryMediaUrl?: string;
  secondaryMediaUrl?: string;
  items?: readonly SectionStylePreviewItem[];
};

const fixtures: Partial<Record<StorePageBlock["type"], SectionStylePreviewFixture>> = {
  hero: {
    id: "hero-standard",
    eyebrow: "New collection",
    title: "Made to carry your story",
    subtitle: "Thoughtful pieces, clear hierarchy, and one confident next step.",
    ctaLabel: "Shop collection",
    primaryMediaUrl: "/demo-assets/urban-threads-bd/hero/main.jpg",
    secondaryMediaUrl: "/demo-assets/urban-threads-bd/hero/mobile.jpg",
  },
  "category-showcase": {
    id: "category-showcase-standard",
    eyebrow: "Browse by mood",
    title: "Shop by category",
    items: [
      { title: "T-Shirts", imageUrl: "/demo-assets/urban-threads-bd/categories/t-shirts.jpg" },
      { title: "Shirts", imageUrl: "/demo-assets/urban-threads-bd/categories/shirts.jpg" },
      { title: "Polos", imageUrl: "/demo-assets/urban-threads-bd/categories/polos.jpg" },
      { title: "Pants", imageUrl: "/demo-assets/urban-threads-bd/categories/pants.jpg" },
    ],
  },
  "featured-products": {
    id: "featured-products-standard",
    eyebrow: "Curated picks",
    title: "Featured products",
    items: [
      { title: "Essential Black Tee", meta: "৳1,090", imageUrl: "/demo-assets/urban-threads-bd/products/essential-black-tee/main.jpg" },
      { title: "Classic White Tee", meta: "৳1,090", imageUrl: "/demo-assets/urban-threads-bd/products/classic-white-tee/main.jpg" },
      { title: "Burgundy Drop Tee", meta: "৳1,290", imageUrl: "/demo-assets/urban-threads-bd/products/burgundy-drop-tee/main.jpg" },
      { title: "Classic Pique Polo", meta: "৳1,490", imageUrl: "/demo-assets/urban-threads-bd/products/classic-pique-polo/main.jpg" },
    ],
  },
  "recommended-products": {
    id: "recommended-products-standard",
    eyebrow: "Picked for you",
    title: "You may also like",
    items: [
      { title: "Linen Casual Shirt", meta: "৳1,790", imageUrl: "/demo-assets/urban-threads-bd/products/linen-casual-shirt/main.jpg" },
      { title: "Essential Joggers", meta: "৳1,490", imageUrl: "/demo-assets/urban-threads-bd/products/essential-joggers/main.jpg" },
      { title: "Classic White Tee", meta: "৳1,090", imageUrl: "/demo-assets/urban-threads-bd/products/classic-white-tee/main.jpg" },
    ],
  },
  "promo-banner": {
    id: "promo-banner-standard",
    eyebrow: "Limited story",
    title: "Small gifts, big meaning",
    subtitle: "A compact campaign message with a clear action.",
    ctaLabel: "Explore gifts",
    primaryMediaUrl: "/demo-assets/banglar-karukaj/hero/promo-banner.jpg",
  },
  "rich-text": {
    id: "rich-text-standard",
    eyebrow: "Our story",
    title: "Objects that tell stories",
    subtitle: "A quieter editorial section for origin, process, or brand narrative.",
    primaryMediaUrl: "/demo-assets/banglar-karukaj/hero/story.jpg",
  },
  "trust-badges": {
    id: "trust-badges-standard",
    eyebrow: "Why shop here",
    title: "More than a purchase",
    items: [
      { title: "Made with care", meta: "Thoughtful production" },
      { title: "Easy delivery", meta: "Clear fulfillment" },
      { title: "Real support", meta: "Human help" },
      { title: "Secure checkout", meta: "Protected payment" },
    ],
  },
  "social-feed": {
    id: "social-feed-standard",
    eyebrow: "In the wild",
    title: "Community moments",
    items: [
      { title: "Studio", imageUrl: "/demo-assets/banglar-karukaj/sections/01-hero.jpg" },
      { title: "Craft", imageUrl: "/demo-assets/banglar-karukaj/sections/03-category-showcase.jpg" },
      { title: "Story", imageUrl: "/demo-assets/banglar-karukaj/sections/05-artisan-story.jpg" },
    ],
  },
};

const fallbackFixture: SectionStylePreviewFixture = {
  id: "generic-standard",
  eyebrow: "Section preview",
  title: "A clear storefront section",
  subtitle: "Canonical demo content makes style comparisons consistent.",
  ctaLabel: "Learn more",
};

export function getSectionStylePreviewFixture(blockType: StorePageBlock["type"]): SectionStylePreviewFixture {
  return fixtures[blockType] ?? { ...fallbackFixture, id: `${blockType}-standard` };
}
