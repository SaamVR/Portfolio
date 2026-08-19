import { buildBlogIndexUrl, buildBlogPostUrl, resolveBlogPostStatus, stripMarkdown, type BlogPostRecord } from "@/lib/cms/blog";
import { productUrl, storefrontPath } from "@/lib/slug";

export type BlogLinkProduct = {
  id: string;
  name: string;
  is_available?: boolean | null;
};

export type BlogLinkSuggestion = {
  id: string;
  kind: "article" | "product" | "store";
  label: string;
  url: string;
  reason: string;
  score: number;
};

type SuggestionInput = {
  storeSlug: string;
  currentPostId?: string | null;
  title: string;
  category?: string | null;
  tags?: string[] | string | null;
  content: string;
  embeddedProductIds?: string[];
  posts: BlogPostRecord[];
  products: BlogLinkProduct[];
  limit?: number;
};

const stopWords = new Set([
  "about", "after", "again", "also", "and", "are", "because", "best", "blog", "buy", "buying",
  "choose", "for", "from", "guide", "have", "how", "into", "more", "most", "product", "products",
  "should", "that", "the", "their", "them", "these", "this", "those", "use", "using", "what", "when",
  "where", "which", "with", "your",
]);

function normalizeList(value?: string[] | string | null) {
  if (Array.isArray(value)) return value;
  return String(value ?? "").split(",");
}

function tokens(value: string) {
  return Array.from(new Set(
    value
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/[\s-]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !stopWords.has(token)),
  ));
}

function overlapScore(source: Set<string>, value: string, weight = 1) {
  return tokens(value).reduce((score, token) => score + (source.has(token) ? weight : 0), 0);
}

export function buildBlogInternalLinkSuggestions(input: SuggestionInput): BlogLinkSuggestion[] {
  const limit = Math.min(12, Math.max(3, Math.round(input.limit ?? 8)));
  const articleTags = normalizeList(input.tags).map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean);
  const context = [input.title, input.category ?? "", ...articleTags, stripMarkdown(input.content).slice(0, 3000)].join(" ");
  const contextTokens = new Set(tokens(context));
  const category = String(input.category ?? "").trim().toLocaleLowerCase();
  const selectedProducts = new Set(input.embeddedProductIds ?? []);

  const articleSuggestions = input.posts
    .filter((post) => post.id !== input.currentPostId)
    .filter((post) => resolveBlogPostStatus(post) === "published")
    .map((post): BlogLinkSuggestion => {
      const postCategory = String(post.category ?? "").trim().toLocaleLowerCase();
      const sharedTags = (post.tags ?? []).filter((tag) => articleTags.includes(String(tag).trim().toLocaleLowerCase())).length;
      const titleOverlap = overlapScore(contextTokens, post.title, 3);
      const excerptOverlap = overlapScore(contextTokens, post.excerpt ?? "", 1);
      const score = (category && postCategory === category ? 10 : 0) + sharedTags * 5 + titleOverlap + excerptOverlap + 1;
      const reason = category && postCategory === category
        ? `Same ${post.category} category`
        : sharedTags > 0
          ? `${sharedTags} shared topic tag${sharedTags === 1 ? "" : "s"}`
          : titleOverlap > 0
            ? "Related article topic"
            : "Published article";
      return {
        id: `article:${post.id}`,
        kind: "article",
        label: post.title,
        url: buildBlogPostUrl(input.storeSlug, post.slug),
        reason,
        score,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  const productSuggestions = input.products
    .filter((product) => product.is_available !== false)
    .map((product): BlogLinkSuggestion => {
      const selected = selectedProducts.has(product.id);
      const match = overlapScore(contextTokens, product.name, 4);
      return {
        id: `product:${product.id}`,
        kind: "product",
        label: product.name,
        url: productUrl(product.id, product.name, input.storeSlug),
        reason: selected ? "Already selected for this article" : match > 0 ? "Matches the article topic" : "Available product",
        score: (selected ? 20 : 0) + match + 1,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  const destinationSuggestions: BlogLinkSuggestion[] = [
    {
      id: "store:shop",
      kind: "store",
      label: "Shop all products",
      url: storefrontPath("/shop", input.storeSlug),
      reason: "General storefront destination",
      score: 1,
    },
    {
      id: "store:blog",
      kind: "store",
      label: "Browse all articles",
      url: buildBlogIndexUrl(input.storeSlug),
      reason: "Blog index",
      score: 0,
    },
  ];

  return [...articleSuggestions, ...productSuggestions, ...destinationSuggestions]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
