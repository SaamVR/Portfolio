import { threadbdSeedData } from "../../../docs/seeds/threadbd_all_template_seed_data_local_assets";

type FixtureCategory = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  position?: number;
  is_active?: boolean;
  image_url?: string;
};

type FixtureVariantValue = {
  label: string;
  price_delta?: number;
};

type FixtureVariant = {
  name: string;
  values?: FixtureVariantValue[];
};

type FixtureProduct = {
  id: string;
  slug: string;
  name: string;
  category_slug?: string;
  product_type?: string;
  short_description?: string;
  full_description?: string;
  pricing?: {
    regular_price?: number;
    sale_price?: number;
    currency?: string;
  };
  inventory?: {
    track_inventory?: boolean;
    stock_quantity?: number | null;
  };
  images?: Array<{ url: string; alt?: string; position?: number }>;
  variants?: FixtureVariant[];
  specs?: Record<string, unknown>;
  featured?: boolean;
  badge?: string | null;
  inquiry_only?: boolean;
  preorder?: boolean;
  show_in_shop?: boolean;
  status?: string;
  delivery_mode?: string | null;
  download_path?: string | null;
};

type FixtureService = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  duration_minutes?: number;
  price?: number;
  currency?: string;
  category?: string;
  featured?: boolean;
  status?: string;
  image_url?: string;
  specs?: Record<string, unknown>;
};

type FixtureReview = {
  customer_name?: string;
  customer_title?: string;
  rating?: number;
  text?: string;
  avatar_url?: string;
  verified?: boolean;
};

type FixtureFaq = {
  question?: string;
  answer?: string;
};

type FixturePageBlock = {
  type?: string;
  position?: number;
  data?: Record<string, unknown>;
};

type FixturePage = {
  slug?: string;
  is_homepage?: boolean;
  blocks?: FixturePageBlock[];
};

type FixtureAssets = {
  logo_url?: string;
  hero_image_url?: string;
  hero_mobile_image_url?: string;
  promo_image_url?: string;
  story_image_url?: string;
  cta_background_url?: string;
  fallback_product_image_url?: string;
  fallback_category_image_url?: string;
  fallback_avatar_url?: string;
};

type FixtureStore = {
  id: string;
  slug: string;
  name: string;
  template_id: string;
  announcement?: {
    enabled?: boolean;
    text?: string;
    link_label?: string;
    link_url?: string;
  };
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
  };
  tagline?: string;
  assets?: FixtureAssets;
  categories?: FixtureCategory[];
  products?: FixtureProduct[];
  services?: FixtureService[];
  reviews?: FixtureReview[];
  faqs?: FixtureFaq[];
  pages?: FixturePage[];
};

type TemplateDemoSeedId =
  | "landing"
  | "beauty"
  | "fashion"
  | "electronics"
  | "food"
  | "crafts"
  | "single-product"
  | "inquiry-catalog"
  | "service"
  | "booking"
  | "general-catalog"
  | "subscriptions"
  | "digital-downloads"
  | "hotel"
  | "real-estate";

export type TemplateSeedCatalogMetadata = {
  source: "threadbd-template-seed";
  templateId: TemplateDemoSeedId;
  seedStoreSlug: string;
  assets: FixtureAssets;
  categories: Record<string, {
    id: string;
    slug: string;
    name: string;
    description: string;
    imageUrl: string | null;
  }>;
  products: Record<string, {
    id: string;
    slug: string;
    productType: string;
    categorySlug: string | null;
    shortDescription: string;
    imageUrl: string | null;
    imageUrls: string[];
    deliveryMode: string | null;
    downloadPath: string | null;
    specs: Record<string, unknown>;
    variants: FixtureVariant[];
  }>;
};

const templateAliasMap: Record<string, TemplateDemoSeedId> = {
  landing_page: "landing",
  beauty_personal_care: "beauty",
  fashion_catalog: "fashion",
  gadgets_electronics: "electronics",
  food_menu: "food",
  crafts_bengali_heritage: "crafts",
  single_product_launch: "single-product",
  inquiry_led_catalog: "inquiry-catalog",
  service_based: "service",
  booking_based: "booking",
  general_catalog: "general-catalog",
  subscriptions: "subscriptions",
  "digital-downloads": "digital-downloads",
  hotel: "hotel",
  "real-estate": "real-estate",
  real_estate: "real-estate",
  hospitality: "hotel",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toValidUuid(input: string | null | undefined): string {
  if (!input) {
    return "00000000-0000-4000-8000-000000000000";
  }
  if (UUID_REGEX.test(input)) {
    return input.toLowerCase();
  }

  let hash1 = 0x811c9dc5;
  let hash2 = 0x01000193;

  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ charCode, 0x01000193);
    hash2 = Math.imul(hash2 ^ charCode, 0x811c9dc5);
  }

  const h1 = (hash1 >>> 0).toString(16).padStart(8, "0");
  const h2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  const h3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, "0");
  const h4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, "0");

  const combined = `${h1}${h2}${h3}${h4}`.slice(0, 32);

  const p1 = combined.slice(0, 8);
  const p2 = combined.slice(8, 12);
  const p3 = `4${combined.slice(13, 16)}`;
  const p4 = `8${combined.slice(17, 20)}`;
  const p5 = combined.slice(20, 32);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

function normalizeTemplateId(templateId: string | null | undefined): TemplateDemoSeedId | null {
  if (!templateId) {
    return null;
  }

  return templateAliasMap[templateId] ?? (templateId as TemplateDemoSeedId);
}

export function getFixtureStores() {
  const stores = (threadbdSeedData as unknown as { stores?: readonly FixtureStore[] }).stores;
  return Array.isArray(stores) ? [...stores] : [];
}

function getTemplateSeedStore(templateId: string | null | undefined): FixtureStore | null {
  const normalizedTemplateId = normalizeTemplateId(templateId);
  if (!normalizedTemplateId) {
    return null;
  }

  return getFixtureStores().find((store) => normalizeTemplateId(store.template_id) === normalizedTemplateId) ?? null;
}

function humanizeProductType(product: FixtureProduct, categoryName: string | null) {
  const productType = product.product_type?.trim().toLowerCase();
  if (productType === "subscription") return "Subscription";
  if (productType === "digital") return "Digital Download";
  if (productType === "service") return "Service";
  if (categoryName) return categoryName;
  return "Product";
}

function getVariantValues(product: FixtureProduct, preferredNames: string[]) {
  const normalizedPreferredNames = preferredNames.map((name) => name.toLowerCase());
  const matchingVariant = (product.variants ?? []).find((variant) => normalizedPreferredNames.includes(variant.name.toLowerCase()));
  const fallbackVariant = (product.variants ?? [])[0];
  const source = matchingVariant ?? fallbackVariant;

  return Array.from(new Set((source?.values ?? []).map((value) => value.label?.trim()).filter((value): value is string => Boolean(value))));
}

function getProductColorHints(product: FixtureProduct) {
  const formats = (product.specs?.formats ?? product.specs?.file_formats ?? product.specs?.supported_formats) as unknown;
  if (Array.isArray(formats)) {
    return formats.map((value) => String(value).trim()).filter(Boolean);
  }

  const deliveryHints = [
    typeof product.delivery_mode === "string" ? product.delivery_mode : null,
    typeof product.specs?.supported_devices === "string" ? String(product.specs.supported_devices) : null,
    typeof product.specs?.region === "string" ? String(product.specs.region) : null,
  ].filter((value): value is string => Boolean(value));

  return deliveryHints.slice(0, 4);
}

function getString(value: unknown, fallback: string | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function buildTemplateCatalogSeedRows(storeId: string, templateId: string) {
  const seedStore = getTemplateSeedStore(templateId);
  if (!seedStore) {
    return {
      categoryRows: [],
      productTypeRows: [],
      productRows: [],
      siteSettings: {},
      metadata: null,
    };
  }

  const assets = seedStore.assets ?? {};
  const normalizedSeedTemplateId = normalizeTemplateId(seedStore.template_id) ?? "general-catalog";
  const categoryBySlug = new Map((seedStore.categories ?? []).map((category) => [category.slug, category]));
  const categoryRows = (seedStore.categories ?? []).map((category, index) => ({
    id: toValidUuid(category.id),
    store_id: storeId,
    name: category.name,
    sort_order: category.position ?? index,
    parent_id: null,
  }));

  const typeNames = Array.from(new Set((seedStore.products ?? []).map((product) => humanizeProductType(product, categoryBySlug.get(product.category_slug ?? "")?.name ?? null))));
  const productTypeRows = typeNames.map((name, index) => ({
    store_id: storeId,
    name,
    sort_order: index,
  }));

  const metadata: TemplateSeedCatalogMetadata = {
    source: "threadbd-template-seed",
    templateId: normalizeTemplateId(seedStore.template_id) ?? "general-catalog",
    seedStoreSlug: seedStore.slug,
    assets,
    categories: {},
    products: {},
  };

  for (const category of seedStore.categories ?? []) {
    const validCategoryId = toValidUuid(category.id);
    metadata.categories[category.slug] = {
      id: validCategoryId,
      slug: category.slug,
      name: category.name,
      description: category.description ?? "",
      imageUrl: category.image_url ?? assets.fallback_category_image_url ?? null,
    };
  }

  const productRows = (seedStore.products ?? []).map((product) => {
    const validProductId = toValidUuid(product.id);
    const category = categoryBySlug.get(product.category_slug ?? "");
    const imageUrls = (product.images ?? [])
      .slice()
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
      .map((image) => image.url)
      .filter(Boolean);
    if (imageUrls.length === 0 && assets.fallback_product_image_url) {
      imageUrls.push(assets.fallback_product_image_url);
    }
    const regularPrice = Number(product.pricing?.regular_price ?? 0) || 0;
    const salePrice = Number(product.pricing?.sale_price ?? 0) || 0;
    const livePrice = salePrice > 0 ? salePrice : regularPrice;
    const normalizedTemplateId = normalizeTemplateId(seedStore.template_id);
    const preferredOptionNames = normalizedTemplateId === "subscriptions"
      ? ["plan", "duration"]
      : normalizedTemplateId === "digital-downloads"
        ? ["license"]
        : [];
    const sizes = getVariantValues(product, preferredOptionNames);
    const colors = getProductColorHints(product);

    metadata.products[validProductId] = {
      id: validProductId,
      slug: product.slug,
      productType: product.product_type ?? "physical",
      categorySlug: product.category_slug ?? null,
      shortDescription: product.short_description ?? "",
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
      deliveryMode: product.delivery_mode ?? null,
      downloadPath: product.download_path ?? null,
      specs: product.specs ?? {},
      variants: product.variants ?? [],
    };

    return {
      id: validProductId,
      store_id: storeId,
      name: product.name,
      description: product.full_description ?? product.short_description ?? "",
      price: livePrice,
      original_price: regularPrice > livePrice ? regularPrice : null,
      image_url: imageUrls[0] ?? assets.fallback_product_image_url ?? "",
      images: imageUrls,
      category: category?.name ?? "General",
      type: humanizeProductType(product, category?.name ?? null),
      sizes,
      colors,
      featured: product.featured === true,
      badge: product.badge ?? null,
      stock: typeof product.inventory?.stock_quantity === "number"
        ? product.inventory.stock_quantity
        : product.inventory?.track_inventory === false
          ? 999
          : 20,
      is_available: product.show_in_shop !== false && product.status !== "archived",
    };
  });

  const homepage = (seedStore.pages ?? []).find((page) => page.is_homepage) ?? null;
  const homepageBlocks = Array.isArray(homepage?.blocks) ? homepage.blocks : [];
  const heroBlock = homepageBlocks.find((block) => ["hero", "single_product_hero"].includes(block.type ?? ""));
  const featuredBlock = homepageBlocks.find((block) => block.type === "featured_products");
  const categoryBlock = homepageBlocks.find((block) => (block.type ?? "").includes("category"));
  const trustBlock = homepageBlocks.find((block) => ["trust_bar", "trust_strip", "benefits_bar", "benefit_strip"].includes(block.type ?? ""));

  const siteSettings = {
    announcement_bar: {
      enabled: seedStore.announcement?.enabled ?? true,
      text: seedStore.announcement?.text ?? "",
      link_label: seedStore.announcement?.link_label ?? "",
      link_url: seedStore.announcement?.link_url ?? "",
    },
    contact_page: {
      phone: seedStore.contact?.phone ?? "",
      whatsapp: seedStore.contact?.whatsapp ?? "",
      email: seedStore.contact?.email ?? "",
      address: seedStore.contact?.address ?? "",
      description: seedStore.tagline ?? "",
    },
    template_assets_seed: assets,
    logo_url: assets.logo_url ?? "",
    fallback_product_image_url: assets.fallback_product_image_url ?? "",
    fallback_category_image_url: assets.fallback_category_image_url ?? "",
    faq_entries: (seedStore.faqs ?? [])
      .filter((entry) => entry.question && entry.answer)
      .map((entry) => ({ q: entry.question, a: entry.answer })),
    categories_custom_data: (seedStore.categories ?? []).map((category) => ({
      id: toValidUuid(category.id),
      slug: category.slug,
      name: category.name,
      description: category.description ?? "",
      image_url: category.image_url ?? assets.fallback_category_image_url ?? "",
      sort_order: category.position ?? 0,
      is_active: category.is_active !== false,
    })),
    services_seed: (seedStore.services ?? []).map((service) => ({
      ...service,
      id: toValidUuid(service.id),
      image_url: service.image_url ?? assets.fallback_product_image_url ?? "",
    })),
    hero_section: heroBlock?.data ?? {
      image_url: assets.hero_image_url ?? "",
      mobile_image_url: assets.hero_mobile_image_url ?? "",
    },
    home_featured: featuredBlock?.data ?? {
      fallback_image_url: assets.fallback_product_image_url ?? "",
    },
    home_categories: categoryBlock?.data ?? {
      fallback_image_url: assets.fallback_category_image_url ?? "",
    },
    trust_badges_seed: trustBlock?.data ?? {},
    catalog_seed_metadata: metadata,
    seed_testimonials: (seedStore.reviews ?? []).map((review) => ({
      name: review.customer_name ?? "Verified customer",
      title: review.customer_title ?? "Customer",
      rating: review.rating ?? 5,
      comment: review.text ?? "",
      avatar_url: review.avatar_url ?? assets.fallback_avatar_url ?? "",
      verified: review.verified !== false,
    })),
  };

  return {
    categoryRows,
    productTypeRows,
    productRows,
    siteSettings,
    metadata,
  };
}

export function applyTemplateDemoContentToPages<
  TPage extends {
    slug: string;
    isHomepage?: boolean;
    blocks: Array<{
      type: string;
      props: Record<string, unknown>;
    }>;
  },
>(pages: TPage[], templateId: string): TPage[] {
  const seedStore = getTemplateSeedStore(templateId);
  const assets = seedStore?.assets ?? {};
  const homepage = (seedStore?.pages ?? []).find((page) => page.is_homepage);
  const homepageBlocks = Array.isArray(homepage?.blocks) ? homepage.blocks : [];
  const heroSeed = homepageBlocks.find((block) => ["hero", "single_product_hero"].includes(block.type ?? ""))?.data ?? null;
  const categorySeed = homepageBlocks.find((block) => (block.type ?? "").includes("category"))?.data ?? null;
  const featuredSeed = homepageBlocks.find((block) => block.type === "featured_products")?.data ?? null;
  const faqSeed = homepageBlocks.find((block) => ["faq", "faq_accordion"].includes(block.type ?? ""))?.data ?? null;
  const promoSeed = homepageBlocks.find((block) => ["promo_banner", "offer_banner", "deal_banner", "countdown", "cta"].includes(block.type ?? ""))?.data ?? null;

  return pages.map((page) => {
    if (!page.isHomepage && page.slug !== "/") {
      return page;
    }

    return {
      ...page,
      blocks: page.blocks.map((block) => {
        if (block.type === "hero" && heroSeed) {
          const primaryCta = heroSeed.primary_cta as Record<string, unknown> | undefined;
          const secondaryCta = heroSeed.secondary_cta as Record<string, unknown> | undefined;

          return {
            ...block,
            props: {
              ...block.props,
              tagline: getString(heroSeed.eyebrow, block.props.tagline as string | undefined),
              title: getString(heroSeed.heading, block.props.title as string | undefined),
              subtitle: getString(heroSeed.subheading, block.props.subtitle as string | undefined),
              ctaText: getString(primaryCta?.label, block.props.ctaText as string | undefined),
              ctaLink: getString(primaryCta?.url, block.props.ctaLink as string | undefined),
              secondaryCtaText: getString(secondaryCta?.label, block.props.secondaryCtaText as string | undefined),
              secondaryCtaLink: getString(secondaryCta?.url, block.props.secondaryCtaLink as string | undefined),
              imageUrl: getString(heroSeed.image_url, assets.hero_image_url ?? (block.props.imageUrl as string | undefined)),
              mobileImageUrl: getString(heroSeed.mobile_image_url, assets.hero_mobile_image_url ?? (block.props.mobileImageUrl as string | undefined)),
              imageAlt: getString(heroSeed.image_alt, `${seedStore?.name ?? "Store"} hero`),
            },
          };
        }

        if (block.type === "category-showcase" && categorySeed) {
          return {
            ...block,
            props: {
              ...block.props,
              title: getString(categorySeed.title, block.props.title as string | undefined),
              tagline: getString(categorySeed.subtitle ?? categorySeed.eyebrow, block.props.tagline as string | undefined),
              fallbackImageUrl: getString(categorySeed.fallback_image_url, assets.fallback_category_image_url ?? (block.props.fallbackImageUrl as string | undefined)),
            },
          };
        }

        if (block.type === "featured-products" && featuredSeed) {
          return {
            ...block,
            props: {
              ...block.props,
              title: getString(featuredSeed.title, block.props.title as string | undefined),
              tagline: getString(featuredSeed.subtitle ?? featuredSeed.eyebrow, block.props.tagline as string | undefined),
              fallbackImageUrl: getString(featuredSeed.fallback_image_url, assets.fallback_product_image_url ?? (block.props.fallbackImageUrl as string | undefined)),
            },
          };
        }

        if (block.type === "faq-accordion" && faqSeed) {
          return {
            ...block,
            props: {
              ...block.props,
              title: getString(faqSeed.title, block.props.title as string | undefined),
            },
          };
        }

        if (block.type === "promo-banner" && promoSeed) {
          return {
            ...block,
            props: {
              ...block.props,
              title: getString(promoSeed.title ?? promoSeed.heading, block.props.title as string | undefined),
              imageUrl: getString(promoSeed.image_url, assets.promo_image_url ?? (block.props.imageUrl as string | undefined)),
              backgroundImageUrl: getString(promoSeed.background_image_url, assets.promo_image_url ?? (block.props.backgroundImageUrl as string | undefined)),
            },
          };
        }

        return block;
      }),
    };
  });
}
