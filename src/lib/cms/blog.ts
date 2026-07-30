import { format } from "date-fns";
import { slugify, storefrontPath } from "@/lib/slug";

export type BlogPostStatus = "draft" | "scheduled" | "published";

export type BlogPostRecord = {
  id: string;
  store_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
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
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
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

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushParagraph();
      closeList();
      if (inCodeBlock) {
        html.push("</pre>");
      } else {
        html.push("<pre>");
      }
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

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
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

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[*_>#-]/g, " ")
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

export function resolveBlogPostStatus(post: Pick<BlogPostRecord, "status" | "published_at">): BlogPostStatus {
  if (post.status === "draft") return "draft";
  if (post.published_at && new Date(post.published_at).getTime() > Date.now()) return "scheduled";
  return "published";
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
