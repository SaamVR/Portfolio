import { format } from "date-fns";
import { slugify, storefrontPath } from "@/lib/slug";

export type BlogPostStatus = "draft" | "scheduled" | "published";
export type BlogProductEmbedPosition = "before-content" | "after-intro" | "after-content";
export type BlogProductSource = "manual" | "related" | "featured" | "newest" | "sale" | "bestsellers" | "category";
export type BlogProductLayout = "grid" | "spotlight" | "comparison" | "lookbook";

export type BlogProductDirective = {
  source: BlogProductSource;
  limit: number;
  layout: BlogProductLayout;
  category?: string;
};

export const BLOG_PRODUCTS_DIRECTIVE = "[[products]]";
const BLOG_PRODUCTS_DIRECTIVE_SOURCE = String.raw`\[\[products(?:\s+[^\]\r\n]+)?\]\]`;
const BLOG_PRODUCT_SOURCES = new Set<BlogProductSource>([
  "manual",
  "related",
  "featured",
  "newest",
  "sale",
  "bestsellers",
  "category",
]);
const BLOG_PRODUCT_LAYOUTS = new Set<BlogProductLayout>([
  "grid",
  "spotlight",
  "comparison",
  "lookbook",
]);

function blogProductsDirectiveRegex(flags = "gi") {
  return new RegExp(BLOG_PRODUCTS_DIRECTIVE_SOURCE, flags);
}

export type BlogPostRecord = {
  id: string;
  store_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  featured_image_alt?: string | null;
  status: string;
  category?: string | null;
  tags?: string[] | null;
  author_name?: string | null;
  is_featured?: boolean | null;
  embedded_product_ids?: string[] | null;
  product_embed_title?: string | null;
  product_embed_position?: BlogProductEmbedPosition | string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords?: string[] | null;
  canonical_url?: string | null;
  og_image?: string | null;
  noindex?: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogProductRecord = {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  image_url?: string | null;
  description?: string | null;
  is_available?: boolean | null;
  category?: string | null;
  type?: string | null;
  featured?: boolean | null;
  badge?: string | null;
  created_at?: string | null;
};

export type BlogHeading = {
  level: 2 | 3;
  text: string;
  id: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value: string) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\[([^\]]+)\]\((\/(?!\/)[^\s)]*)\)/g, '<a href="$2">$1</a>');
}

function parseMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;

  const withoutOuterPipes = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = withoutOuterPipes.split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function isMarkdownTableSeparator(cells: string[] | null) {
  return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function clampBlogProductLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(8, Math.max(1, Math.round(parsed)));
}

function decodeDirectiveValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseBlogProductDirective(value: string): BlogProductDirective | null {
  const match = value.trim().match(/^\[\[products(?:\s+([^\]\r\n]+))?\]\]$/i);
  if (!match) return null;

  const attributes = new Map<string, string>();
  for (const attribute of String(match[1] ?? "").matchAll(/([a-z_]+)=([^\s]+)/gi)) {
    attributes.set(attribute[1].toLowerCase(), decodeDirectiveValue(attribute[2]));
  }

  const requestedSource = String(attributes.get("source") ?? "manual").toLowerCase() as BlogProductSource;
  const source = BLOG_PRODUCT_SOURCES.has(requestedSource) ? requestedSource : "manual";
  const requestedLayout = String(attributes.get("layout") ?? "grid").toLowerCase() as BlogProductLayout;
  const layout = BLOG_PRODUCT_LAYOUTS.has(requestedLayout) ? requestedLayout : "grid";
  const category = attributes.get("category")?.trim();
  return {
    source,
    limit: clampBlogProductLimit(attributes.get("limit")),
    layout,
    ...(category ? { category } : {}),
  };
}

export function serializeBlogProductDirective(directive: Partial<BlogProductDirective> = {}) {
  const source = directive.source && BLOG_PRODUCT_SOURCES.has(directive.source) ? directive.source : "manual";
  const limit = clampBlogProductLimit(directive.limit);
  const layout = directive.layout && BLOG_PRODUCT_LAYOUTS.has(directive.layout) ? directive.layout : "grid";
  const category = directive.category?.trim();
  if (source === "manual" && limit === 4 && layout === "grid" && !category) return BLOG_PRODUCTS_DIRECTIVE;

  const attributes = [`source=${source}`];
  if (source === "category" && category) attributes.push(`category=${encodeURIComponent(category)}`);
  if (limit !== 4) attributes.push(`limit=${limit}`);
  if (layout !== "grid") attributes.push(`layout=${layout}`);
  return `[[products ${attributes.join(" ")}]]`;
}

export function extractBlogProductDirectives(content: string): BlogProductDirective[] {
  return Array.from(content.matchAll(blogProductsDirectiveRegex("gi")))
    .map((match) => parseBlogProductDirective(match[0]))
    .filter((directive): directive is BlogProductDirective => Boolean(directive));
}

export function getPrimaryBlogProductDirective(content: string): BlogProductDirective | null {
  return extractBlogProductDirectives(content)[0] ?? null;
}

export function blogHeadingId(value: string) {
  return `section-${slugify(value) || "section"}`;
}

export function extractBlogHeadings(markdown: string): BlogHeading[] {
  const headings: BlogHeading[] = [];
  const seenIds = new Set<string>();

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const match = rawLine.trim().match(/^(#{2,3})\s+(.*)$/);
    if (!match) continue;

    const text = stripMarkdown(match[2]).trim();
    if (!text) continue;

    const id = blogHeadingId(match[2]);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    headings.push({
      level: match[1].length as 2 | 3,
      text,
      id,
    });
  }

  return headings;
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let listType: "ul" | "ol" | null = null;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(" ").trim())}</p>`);
    paragraphLines = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(listType === "ul" ? "</ul>" : "</ol>");
    listType = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushParagraph();
      closeList();
      html.push(inCodeBlock ? "</pre>" : "<pre>");
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      html.push(escapeHtml(rawLine));
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    if (parseBlogProductDirective(line.trim())) {
      flushParagraph();
      closeList();
      html.push("<blockquote><p>🛍️ Product cards render here.</p></blockquote>");
      continue;
    }

    const headerCells = parseMarkdownTableRow(line);
    const separatorCells = index + 1 < lines.length ? parseMarkdownTableRow(lines[index + 1]) : null;
    if (
      headerCells
      && separatorCells
      && headerCells.length === separatorCells.length
      && isMarkdownTableSeparator(separatorCells)
    ) {
      flushParagraph();
      closeList();

      const rows: string[][] = [];
      let rowIndex = index + 2;
      while (rowIndex < lines.length && lines[rowIndex].trim()) {
        const row = parseMarkdownTableRow(lines[rowIndex]);
        if (!row || row.length !== headerCells.length) break;
        rows.push(row);
        rowIndex += 1;
      }

      html.push('<div class="overflow-x-auto">');
      html.push("<table>");
      html.push(`<thead><tr>${headerCells.map((cell) => `<th scope="col">${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead>`);
      if (rows.length > 0) {
        html.push("<tbody>");
        for (const row of rows) {
          html.push(`<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`);
        }
        html.push("</tbody>");
      }
      html.push("</table>");
      html.push("</div>");
      index = rowIndex - 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      const id = blogHeadingId(headingMatch[2]);
      html.push(`<h${level} id="${escapeHtml(id)}">${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") closeList();
      if (!listType) {
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") closeList();
      if (!listType) {
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      closeList();
      html.push(`<blockquote><p>${renderInlineMarkdown(quoteMatch[1])}</p></blockquote>`);
      continue;
    }

    paragraphLines.push(line.trim());
  }

  flushParagraph();
  closeList();
  if (inCodeBlock) html.push("</pre>");

  return html.join("\n");
}

export function hasInlineBlogProducts(content: string) {
  return blogProductsDirectiveRegex("i").test(content);
}

export function splitBlogContentAtProductDirectives(content: string) {
  return content.split(blogProductsDirectiveRegex("gi"));
}

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(blogProductsDirectiveRegex("gi"), " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[*_>#|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeBlogSlug(input: string, fallbackTitle?: string) {
  return slugify(input || fallbackTitle || "post") || "post";
}

export function buildBlogExcerpt(content: string, explicitExcerpt?: string | null) {
  const source = explicitExcerpt?.trim() || stripMarkdown(content);
  if (!source) return "";
  return source.length > 180 ? `${source.slice(0, 177).trimEnd()}...` : source;
}

export function normalizeBlogStringList(value: string | string[] | null | undefined) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  return Array.from(new Set(source.map((item) => item.trim()).filter(Boolean))).slice(0, 20);
}

export function calculateBlogReadingTime(content: string) {
  const words = stripMarkdown(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function resolveBlogPostStatus(post: Pick<BlogPostRecord, "status" | "published_at">): BlogPostStatus {
  if (post.status === "draft") return "draft";
  if (post.published_at && new Date(post.published_at).getTime() > Date.now()) return "scheduled";
  return "published";
}

export function resolveBlogProductEmbedPosition(value?: string | null): BlogProductEmbedPosition {
  return value === "before-content" || value === "after-intro" || value === "after-content"
    ? value
    : "after-content";
}

export function buildBlogPostUrl(storeSlug: string, slug: string) {
  return storefrontPath(`/blog/${encodeURIComponent(slug)}`, storeSlug);
}

export function buildBlogIndexUrl(storeSlug: string) {
  return storefrontPath("/blog", storeSlug);
}

export function formatBlogDate(value?: string | null) {
  if (!value) return "Draft";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Draft";
  return format(date, "MMM d, yyyy");
}
