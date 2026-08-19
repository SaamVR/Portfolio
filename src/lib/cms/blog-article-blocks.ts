import {
  parseBlogProductDirective,
  serializeBlogProductDirective,
  type BlogProductSource,
} from "./blog";

export type BlogArticleBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; markdown: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; markdown: string }
  | { type: "products"; source: BlogProductSource; limit: number; category?: string }
  | { type: "markdown"; markdown: string };

export type BlogArticleInsertion =
  | { type: "markdown"; markdown: string }
  | { type: "products" };

const TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;

function isBlank(line: string) {
  return line.trim().length === 0;
}

function splitTableCells(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = splitTableCells(line);
  return cells.length >= 2 && cells.every((cell) => TABLE_SEPARATOR_CELL.test(cell));
}

function startsStructuredBlock(lines: string[], index: number) {
  const line = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  if (parseBlogProductDirective(line.trim())) return true;
  if (/^#{2,3}\s+/.test(line)) return true;
  if (/^```/.test(line)) return true;
  if (/^>\s?/.test(line)) return true;
  if (/^(?:[-*+]\s+|\d+\.\s+)/.test(line)) return true;
  if (line.includes("|") && next.includes("|") && isTableSeparator(next)) return true;
  if (/^#\s+/.test(line) || /^#{4,6}\s+/.test(line)) return true;
  return false;
}

export function parseBlogArticleBlocks(markdown: string): BlogArticleBlock[] {
  const source = String(markdown ?? "").replace(/\r\n?/g, "\n").trim();
  if (!source) return [];

  const lines = source.split("\n");
  const blocks: BlogArticleBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    if (isBlank(lines[index])) {
      index += 1;
      continue;
    }

    const line = lines[index];
    const trimmed = line.trim();
    const productDirective = parseBlogProductDirective(trimmed);

    if (productDirective) {
      blocks.push({ type: "products", ...productDirective });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 2 | 3, text: heading[2].trim() });
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const chunk = [line];
      index += 1;
      while (index < lines.length) {
        chunk.push(lines[index]);
        const isClosingFence = /^```\s*$/.test(lines[index]);
        index += 1;
        if (isClosingFence) break;
      }
      blocks.push({ type: "markdown", markdown: chunk.join("\n") });
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const chunk = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && !isBlank(lines[index]) && lines[index].includes("|")) {
        chunk.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "table", markdown: chunk.join("\n") });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];
      const itemPattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/;
      while (index < lines.length) {
        const match = lines[index].match(itemPattern);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (/^#\s+/.test(line) || /^#{4,6}\s+/.test(line)) {
      blocks.push({ type: "markdown", markdown: line });
      index += 1;
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && !isBlank(lines[index]) && !startsStructuredBlock(lines, index)) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", markdown: paragraphLines.join("\n") });
  }

  return blocks;
}

export function serializeBlogArticleBlocks(blocks: BlogArticleBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `${"#".repeat(block.level)} ${block.text.trim()}`.trim();
        case "paragraph":
          return block.markdown.trim();
        case "list":
          return block.items
            .map((item, index) => `${block.ordered ? `${index + 1}.` : "-"} ${item}`)
            .join("\n")
            .trim();
        case "quote":
          return block.text
            .split("\n")
            .map((line) => `> ${line}`.trimEnd())
            .join("\n")
            .trim();
        case "table":
          return block.markdown.trim();
        case "products":
          return serializeBlogProductDirective(block);
        case "markdown":
          return block.markdown.trim();
      }
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function insertBlogArticleContent(
  blocks: BlogArticleBlock[],
  targetIndex: number | null,
  insertion: BlogArticleInsertion,
): BlogArticleBlock[] {
  const validTarget = targetIndex !== null && targetIndex >= 0 && targetIndex < blocks.length
    ? targetIndex
    : null;

  if (insertion.type === "products") {
    if (blocks.some((block) => block.type === "products")) return blocks;
    const insertAt = validTarget === null ? blocks.length : validTarget + 1;
    return [
      ...blocks.slice(0, insertAt),
      { type: "products", source: "manual", limit: 4 },
      ...blocks.slice(insertAt),
    ];
  }

  const markdown = insertion.markdown.trim();
  if (!markdown) return blocks;

  if (validTarget === null) {
    return [...blocks, { type: "paragraph", markdown }];
  }

  const target = blocks[validTarget];
  if (target.type === "paragraph") {
    const next = [...blocks];
    next[validTarget] = {
      ...target,
      markdown: [target.markdown.trim(), markdown].filter(Boolean).join(" "),
    };
    return next;
  }

  if (target.type === "quote") {
    const next = [...blocks];
    next[validTarget] = {
      ...target,
      text: [target.text.trim(), markdown].filter(Boolean).join(" "),
    };
    return next;
  }

  if (target.type === "markdown") {
    const next = [...blocks];
    next[validTarget] = {
      ...target,
      markdown: [target.markdown.trim(), markdown].filter(Boolean).join("\n"),
    };
    return next;
  }

  const insertAt = validTarget + 1;
  return [...blocks.slice(0, insertAt), { type: "paragraph", markdown }, ...blocks.slice(insertAt)];
}

export function createBlogArticleBlock(type: BlogArticleBlock["type"]): BlogArticleBlock {
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "New section" };
    case "paragraph":
      return { type: "paragraph", markdown: "" };
    case "list":
      return { type: "list", ordered: false, items: [""] };
    case "quote":
      return { type: "quote", text: "" };
    case "table":
      return { type: "table", markdown: "| Option | Details |\n| --- | --- |\n| A | Add details |" };
    case "products":
      return { type: "products", source: "manual", limit: 4 };
    case "markdown":
      return { type: "markdown", markdown: "" };
  }
}
