import { buildBlogExcerpt, extractBlogHeadings, normalizeBlogStringList, stripMarkdown } from "@/lib/cms/blog";

export type BlogQualityInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  category?: string | null;
  tags?: string | string[] | null;
  embeddedProductIds?: string[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  status?: "draft" | "published";
};

export type BlogQualityCheckGroup = "content" | "seo" | "discoverability" | "commerce";

export type BlogQualityCheck = {
  id: string;
  group: BlogQualityCheckGroup;
  label: string;
  description: string;
  passed: boolean;
  weight: number;
};

export type BlogQualityReport = {
  score: number;
  label: "Ready to publish" | "Nearly ready" | "Needs refinement" | "Needs work";
  checks: BlogQualityCheck[];
  passedCount: number;
  totalCount: number;
  wordCount: number;
  effectiveSeoTitle: string;
  effectiveSeoDescription: string;
  advisories: string[];
};

function wordCount(content: string) {
  const plain = stripMarkdown(content);
  return plain ? plain.split(/\s+/).filter(Boolean).length : 0;
}

function markdownLinkTargets(content: string) {
  return Array.from(content.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g))
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
}

function isValidCanonical(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function reportLabel(score: number): BlogQualityReport["label"] {
  if (score >= 90) return "Ready to publish";
  if (score >= 75) return "Nearly ready";
  if (score >= 60) return "Needs refinement";
  return "Needs work";
}

export function buildBlogQualityReport(input: BlogQualityInput): BlogQualityReport {
  const title = input.title.trim();
  const slug = input.slug.trim();
  const content = input.content.trim();
  const excerpt = String(input.excerpt ?? "").trim();
  const featuredImage = String(input.featuredImage ?? "").trim();
  const featuredImageAlt = String(input.featuredImageAlt ?? "").trim();
  const category = String(input.category ?? "").trim();
  const tags = normalizeBlogStringList(input.tags ?? []);
  const effectiveSeoTitle = String(input.seoTitle ?? "").trim() || title;
  const effectiveSeoDescription = String(input.seoDescription ?? "").trim()
    || excerpt
    || buildBlogExcerpt(content, excerpt);
  const canonicalUrl = String(input.canonicalUrl ?? "").trim();
  const links = markdownLinkTargets(content);
  const internalLinks = links.filter((target) => target.startsWith("/") && !target.startsWith("//"));
  const commerceLinks = internalLinks.filter((target) => /^(\/product\/|\/shop(?:\/|$|\?)|\/collections?(?:\/|$|\?))/i.test(target));
  const bodyWordCount = wordCount(content);
  const headings = extractBlogHeadings(content);
  const bodyHasH1 = content.replace(/```[\s\S]*?```/g, "").split(/\r?\n/).some((line) => /^#\s+/.test(line.trim()));
  const selectedProducts = Array.from(new Set((input.embeddedProductIds ?? []).filter(Boolean)));

  const checks: BlogQualityCheck[] = [
    {
      id: "title",
      group: "content",
      label: "Clear article title",
      description: "Use a specific title that tells shoppers what question the article answers.",
      passed: title.length >= 12,
      weight: 8,
    },
    {
      id: "slug",
      group: "seo",
      label: "Readable URL slug",
      description: "Keep the URL short, lowercase, hyphenated, and descriptive.",
      passed: slug.length >= 3 && slug.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),
      weight: 5,
    },
    {
      id: "length",
      group: "content",
      label: "Useful article depth",
      description: "Aim for at least 300 useful words for a substantial buying guide or educational post.",
      passed: bodyWordCount >= 300,
      weight: 12,
    },
    {
      id: "headings",
      group: "content",
      label: "Scannable section structure",
      description: "Use at least two H2/H3 sections so long-form content is easy to scan and navigable.",
      passed: headings.length >= 2,
      weight: 10,
    },
    {
      id: "body-h1",
      group: "seo",
      label: "Single page H1",
      description: "The article title is already the page H1, so the article body should start at H2.",
      passed: !bodyHasH1,
      weight: 8,
    },
    {
      id: "excerpt",
      group: "content",
      label: "Article summary",
      description: "Add a useful excerpt for cards, previews, and metadata fallback.",
      passed: effectiveSeoDescription.length >= 70,
      weight: 5,
    },
    {
      id: "featured-image",
      group: "seo",
      label: "Featured image",
      description: "A strong image improves article cards and social sharing previews.",
      passed: Boolean(featuredImage),
      weight: 7,
    },
    {
      id: "image-alt",
      group: "seo",
      label: "Image alt text",
      description: "Describe the featured image for accessibility and image search.",
      passed: Boolean(featuredImage && featuredImageAlt.length >= 8),
      weight: 7,
    },
    {
      id: "category",
      group: "discoverability",
      label: "Category",
      description: "Assign a clear content category so shoppers can browse related articles.",
      passed: Boolean(category),
      weight: 5,
    },
    {
      id: "tags",
      group: "discoverability",
      label: "Topic tags",
      description: "Use at least two focused tags to strengthen related-content discovery.",
      passed: tags.length >= 2,
      weight: 5,
    },
    {
      id: "seo-title",
      group: "seo",
      label: "Search title length",
      description: "Keep the effective SEO title roughly 25–65 characters so it remains descriptive without excessive truncation.",
      passed: effectiveSeoTitle.length >= 25 && effectiveSeoTitle.length <= 65,
      weight: 7,
    },
    {
      id: "seo-description",
      group: "seo",
      label: "Meta description length",
      description: "Aim for an effective description around 110–165 characters.",
      passed: effectiveSeoDescription.length >= 110 && effectiveSeoDescription.length <= 165,
      weight: 8,
    },
    {
      id: "internal-link",
      group: "discoverability",
      label: "Internal storefront link",
      description: "Link naturally to another useful article, collection, shop page, or product using a relative URL.",
      passed: internalLinks.length >= 1,
      weight: 5,
    },
    {
      id: "commerce-path",
      group: "commerce",
      label: "Intentional commerce path",
      description: "Select products for the article or add a direct internal link to a product/shop page. Smart recommendations remain available as fallback.",
      passed: selectedProducts.length > 0 || commerceLinks.length > 0,
      weight: 6,
    },
    {
      id: "canonical",
      group: "seo",
      label: "Canonical URL is valid",
      description: "Leave canonical blank for the automatic storefront URL, or provide a valid http/https URL.",
      passed: isValidCanonical(canonicalUrl),
      weight: 2,
    },
  ];

  const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);
  const advisories: string[] = [];
  if (input.status === "published" && input.noindex) {
    advisories.push("Search indexing is disabled for this published article because noindex is enabled.");
  }
  if (selectedProducts.length === 0) {
    advisories.push("No manual product cards are selected; the storefront can fall back to contextual smart recommendations.");
  }

  return {
    score,
    label: reportLabel(score),
    checks,
    passedCount: checks.filter((check) => check.passed).length,
    totalCount: checks.length,
    wordCount: bodyWordCount,
    effectiveSeoTitle,
    effectiveSeoDescription,
    advisories,
  };
}
