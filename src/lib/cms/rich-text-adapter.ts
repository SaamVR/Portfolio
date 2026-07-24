import type { RichTextDoc, RichTextNode } from "@/lib/cms/schema";

export function parseLegacyStringToDoc(input: unknown): RichTextDoc {
  if (!input) {
    return { type: "doc", content: [] };
  }

  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    if (obj.type === "doc" && Array.isArray(obj.content)) {
      return obj as unknown as RichTextDoc;
    }
  }

  if (typeof input !== "string") {
    return { type: "doc", content: [] };
  }

  const trimmed = input.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.type === "doc" && Array.isArray(parsed.content)) {
        return parsed as RichTextDoc;
      }
    } catch {
      // Fallback to plain string parsing
    }
  }

  const lines = input.split(/\r?\n/);
  const contentNodeList: RichTextNode[] = [];
  let currentBulletItems: string[] = [];

  const flushBulletList = () => {
    if (currentBulletItems.length > 0) {
      contentNodeList.push({
        type: "bulletList",
        content: currentBulletItems.map((text) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: text ? [{ type: "text", text }] : [],
            },
          ],
        })),
      });
      currentBulletItems = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    const bulletMatch = trimmedLine.match(/^[-*•]\s+(.*)$/);

    if (bulletMatch) {
      currentBulletItems.push(bulletMatch[1].trim());
    } else {
      flushBulletList();
      if (trimmedLine.length > 0) {
        contentNodeList.push({
          type: "paragraph",
          content: [{ type: "text", text: trimmedLine }],
        });
      }
    }
  }

  flushBulletList();

  return {
    type: "doc",
    content: contentNodeList,
  };
}
