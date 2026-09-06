import type { StorePage } from "@/lib/cms/schema";
import { editorContextMatches, type EditorContextToken } from "@/lib/cms/editor-context";

export function reconcileCmsEditorSelectedPageId(
  pages: Array<Pick<StorePage, "id" | "isHomepage">>,
  requestedPageId: string | null | undefined,
  currentPageId: string | null | undefined,
): string {
  if (requestedPageId && pages.some((page) => page.id === requestedPageId)) {
    return requestedPageId;
  }

  if (currentPageId && pages.some((page) => page.id === currentPageId)) {
    return currentPageId;
  }

  return pages.find((page) => page.isHomepage)?.id ?? pages[0]?.id ?? "";
}

export function isCmsEditorRequestCurrent({
  currentRequestId,
  requestId,
  currentContext,
  capturedContext,
  currentPageId,
  pageId,
}: {
  currentRequestId: number;
  requestId: number;
  currentContext: EditorContextToken;
  capturedContext: EditorContextToken;
  currentPageId?: string | null;
  pageId?: string;
}): boolean {
  if (currentRequestId !== requestId || !editorContextMatches(currentContext, capturedContext)) {
    return false;
  }

  return pageId === undefined || currentPageId === pageId;
}
