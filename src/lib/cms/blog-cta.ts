export type BlogCtaKind = "shop" | "category" | "contact" | "whatsapp";

export type BlogCtaDirective = {
  kind: BlogCtaKind;
  label: string;
  heading?: string;
  text?: string;
  category?: string;
};

export type BlogCtaSegment =
  | { type: "content"; content: string }
  | { type: "cta"; directive: BlogCtaDirective };

const BLOG_CTA_DIRECTIVE_SOURCE = String.raw`\[\[cta(?:\s+[^\]\r\n]+)?\]\]`;
const BLOG_CTA_KINDS = new Set<BlogCtaKind>(["shop", "category", "contact", "whatsapp"]);

function blogCtaDirectiveRegex(flags = "gi") {
  return new RegExp(BLOG_CTA_DIRECTIVE_SOURCE, flags);
}

function decodeDirectiveValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function defaultBlogCtaLabel(kind: BlogCtaKind) {
  switch (kind) {
    case "category": return "Shop category";
    case "contact": return "Contact us";
    case "whatsapp": return "Chat on WhatsApp";
    case "shop":
    default:
      return "Shop now";
  }
}

export function parseBlogCtaDirective(value: string): BlogCtaDirective | null {
  const match = value.trim().match(/^\[\[cta(?:\s+([^\]\r\n]+))?\]\]$/i);
  if (!match) return null;

  const attributes = new Map<string, string>();
  for (const attribute of String(match[1] ?? "").matchAll(/([a-z_]+)=([^\s]+)/gi)) {
    attributes.set(attribute[1].toLowerCase(), decodeDirectiveValue(attribute[2]));
  }

  const requestedKind = cleanText(attributes.get("kind"), 30).toLowerCase() as BlogCtaKind;
  const kind = BLOG_CTA_KINDS.has(requestedKind) ? requestedKind : "shop";
  const label = cleanText(attributes.get("label"), 80) || defaultBlogCtaLabel(kind);
  const heading = cleanText(attributes.get("heading"), 140);
  const text = cleanText(attributes.get("text"), 320);
  const category = cleanText(attributes.get("category"), 120);

  return {
    kind,
    label,
    ...(heading ? { heading } : {}),
    ...(text ? { text } : {}),
    ...(category ? { category } : {}),
  };
}

export function serializeBlogCtaDirective(directive: Partial<BlogCtaDirective> = {}) {
  const requestedKind = cleanText(directive.kind, 30).toLowerCase() as BlogCtaKind;
  const kind = BLOG_CTA_KINDS.has(requestedKind) ? requestedKind : "shop";
  const label = cleanText(directive.label, 80) || defaultBlogCtaLabel(kind);
  const heading = cleanText(directive.heading, 140);
  const text = cleanText(directive.text, 320);
  const category = cleanText(directive.category, 120);

  const attributes = [
    `kind=${kind}`,
    `label=${encodeURIComponent(label)}`,
  ];
  if (heading) attributes.push(`heading=${encodeURIComponent(heading)}`);
  if (text) attributes.push(`text=${encodeURIComponent(text)}`);
  if (kind === "category" && category) attributes.push(`category=${encodeURIComponent(category)}`);
  return `[[cta ${attributes.join(" ")}]]`;
}

export function hasBlogCtaDirectives(content: string) {
  return blogCtaDirectiveRegex("i").test(content);
}

export function stripBlogCtaDirectives(content: string) {
  return content.replace(blogCtaDirectiveRegex("gi"), " ");
}

export function splitBlogContentAtCtaDirectives(content: string): BlogCtaSegment[] {
  const regex = blogCtaDirectiveRegex("gi");
  const segments: BlogCtaSegment[] = [];
  let cursor = 0;

  for (const match of content.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ type: "content", content: content.slice(cursor, index) });
    const directive = parseBlogCtaDirective(match[0]);
    if (directive) segments.push({ type: "cta", directive });
    else segments.push({ type: "content", content: match[0] });
    cursor = index + match[0].length;
  }

  if (cursor < content.length) segments.push({ type: "content", content: content.slice(cursor) });
  if (segments.length === 0) return [{ type: "content", content }];
  return segments;
}
