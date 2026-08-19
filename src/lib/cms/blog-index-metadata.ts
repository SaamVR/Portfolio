import type { Metadata } from "next";
import type { BlogSettings } from "@/lib/cms/blog-settings";
import { absoluteStoreUrl } from "@/lib/siteUrl";

export type BlogIndexFilters = {
  q?: string;
  category?: string;
  tag?: string;
};

export type BlogIndexActiveFilter =
  | { type: "category"; value: string }
  | { type: "tag"; value: string }
  | { type: "search"; value: string }
  | null;

type BlogMetadataStore = {
  name: string;
  slug: string;
  customDomain?: string | null;
  primaryDomain?: string | null;
};

function clean(value?: string) {
  return String(value ?? "").trim();
}

export function resolveBlogIndexFilter(filters: BlogIndexFilters): BlogIndexActiveFilter {
  const category = clean(filters.category);
  if (category) return { type: "category", value: category };
  const tag = clean(filters.tag);
  if (tag) return { type: "tag", value: tag };
  const q = clean(filters.q);
  if (q) return { type: "search", value: q };
  return null;
}

export function buildBlogIndexMetadata({
  store,
  settings,
  filters,
}: {
  store: BlogMetadataStore;
  settings: BlogSettings;
  filters: BlogIndexFilters;
}): Metadata {
  const activeFilter = resolveBlogIndexFilter(filters);
  const rootCanonical = absoluteStoreUrl(store, "/blog");
  const rss = absoluteStoreUrl(store, "/blog/rss.xml");
  const baseTitle = settings.seoTitle || `${store.name} Blog`;
  const baseDescription = settings.seoDescription
    || settings.indexDescription
    || `Stories, guides, and updates from ${store.name}.`;

  let canonical = rootCanonical;
  let title = baseTitle;
  let description = baseDescription;

  if (activeFilter?.type === "category") {
    const params = new URLSearchParams({ category: activeFilter.value });
    canonical = `${rootCanonical}?${params.toString()}`;
    title = `${activeFilter.value} | ${baseTitle}`;
    description = `Browse ${activeFilter.value} articles from ${store.name}. ${baseDescription}`;
  } else if (activeFilter?.type === "tag") {
    const params = new URLSearchParams({ tag: activeFilter.value });
    canonical = `${rootCanonical}?${params.toString()}`;
    title = `#${activeFilter.value} | ${baseTitle}`;
    description = `Explore articles tagged ${activeFilter.value} from ${store.name}. ${baseDescription}`;
  } else if (activeFilter?.type === "search") {
    title = `Search: ${activeFilter.value} | ${baseTitle}`;
    description = `Search results for ${activeFilter.value} in the ${store.name} blog.`;
  }

  const robots = !settings.enabled
    ? { index: false, follow: false }
    : activeFilter?.type === "search"
      ? { index: false, follow: true }
      : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
      types: { "application/rss+xml": rss },
    },
    robots,
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: store.name,
      images: settings.ogImage ? [{ url: settings.ogImage, alt: `${store.name} blog` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings.ogImage ? [settings.ogImage] : undefined,
    },
  };
}
