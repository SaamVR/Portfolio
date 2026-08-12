import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";
import { absoluteStoreUrl, absoluteUrl } from "@/lib/siteUrl";
import { extractIdFromSlug, isUuid } from "@/lib/slug";

export interface ProductMetadataRecord {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  images: string[] | null;
  is_available: boolean | null;
}

const DEFAULT_OG_IMAGE = "/og-image.png";

function buildProductMetadataTags(storeId: string, productId: string) {
  return [
    `store:${storeId}`,
    `store:${storeId}:products`,
    `product:${productId}`,
  ];
}

function compact(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isGenericSeoTitle(value: string) {
  const normalized = compact(value).toLowerCase();
  return normalized === "online store" || normalized === "home";
}

function truncate(value: string, maxLength = 160) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function isShareableImage(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
}

function metadataImage(value: string | null | undefined): string {
  const image: string = isShareableImage(value) ? value : DEFAULT_OG_IMAGE;
  return image.startsWith("http") ? image : absoluteUrl(image);
}

function getBlockImage(block: StorePageBlock): string | null {
  if (block.type === "hero" && block.props.mediaType !== "video") {
    return block.props.mediaUrl ?? null;
  }

  if (block.type === "social-feed") {
    return block.props.images[0] ?? null;
  }

  return null;
}

function getPageShareImage(page: StorePage): string {
  const visibleBlocks = [...page.blocks]
    .filter((block) => block.isVisible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const block of visibleBlocks) {
    const image = getBlockImage(block);
    if (isShareableImage(image)) return image;
  }

  return DEFAULT_OG_IMAGE;
}

function buildRobots(store: Store): Metadata["robots"] {
  return store.isPublished
    ? {
        index: true,
        follow: true,
      }
    : {
        index: false,
        follow: false,
      };
}

export function buildStorePageMetadata(store: Store, page: StorePage, path: string): Metadata {
  const rawSeoTitle = compact(page.seoTitle);
  const title = rawSeoTitle && !isGenericSeoTitle(rawSeoTitle)
    ? rawSeoTitle
    : page.isHomepage
      ? store.name
      : `${page.title} | ${store.name}`;
  const description = truncate(compact(page.seoDescription) || compact(store.description));
  const canonical = absoluteStoreUrl(store, path);
  const image = metadataImage(getPageShareImage(page));

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: buildRobots(store),
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: store.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildStoreShopMetadata(store: Store): Metadata {
  const title = `Shop | ${store.name}`;
  const description = truncate(`Browse products from ${store.name}. ${compact(store.description)}`);
  const canonical = absoluteStoreUrl(store, "/shop");
  const image = metadataImage(DEFAULT_OG_IMAGE);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: buildRobots(store),
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: store.name,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildStoreProductMetadata(store: Store, product: ProductMetadataRecord, slugId: string): Metadata {
  const title = `${product.name} | ${store.name}`;
  const description = truncate(compact(product.description) || `Buy ${product.name} from ${store.name}.`);
  const canonical = absoluteStoreUrl(store, `/product/${encodeURIComponent(slugId)}`);
  const image = metadataImage(product.images?.[0] || product.image_url);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: buildRobots(store),
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: store.name,
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

async function getProductMetadataBySlugIdUncached(storeId: string, slugId: string): Promise<ProductMetadataRecord | null> {
  const productId = extractIdFromSlug(slugId);
  if (!isUuid(productId)) return null;

  const supabase = getCmsSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_url, images, is_available")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ProductMetadataRecord;
}

export async function getProductMetadataBySlugId(storeId: string, slugId: string): Promise<ProductMetadataRecord | null> {
  const productId = extractIdFromSlug(slugId);
  const getProductMetadataBySlugIdCached = unstable_cache(
    async () => getProductMetadataBySlugIdUncached(storeId, slugId),
    ["storefront-product-metadata", storeId, slugId],
    {
      revalidate: 60,
      tags: isUuid(productId)
        ? buildProductMetadataTags(storeId, productId)
        : [`store:${storeId}`, `store:${storeId}:products`],
    },
  );

  return getProductMetadataBySlugIdCached();
}
