"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { BlogPostRecord } from "@/lib/cms/blog";
import {
  blogDraftSignature,
  blogDraftStorageKey,
  createBlogDraftRecoveryEnvelope,
  hasMeaningfulBlogDraft,
  isBlogDraftRecoveryNewer,
  parseBlogDraftRecoveryEnvelope,
  type BlogRecoverableDraft,
} from "@/lib/cms/blog-draft-recovery";

type ActiveDraftTarget = {
  key: string;
  storeId: string;
  serverUpdatedAt: string | null;
  baselineSignature: string;
  draft: BlogRecoverableDraft;
};

function readRecovery(key: string) {
  try {
    return parseBlogDraftRecoveryEnvelope(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function removeRecovery(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Browser storage may be disabled; draft recovery is best-effort only.
  }
}

function writeRecovery(target: ActiveDraftTarget) {
  try {
    if (
      blogDraftSignature(target.draft) === target.baselineSignature
      || !hasMeaningfulBlogDraft(target.draft)
    ) {
      window.localStorage.removeItem(target.key);
      return;
    }
    const envelope = createBlogDraftRecoveryEnvelope({
      storeId: target.storeId,
      draft: target.draft,
      serverUpdatedAt: target.serverUpdatedAt,
    });
    window.localStorage.setItem(target.key, JSON.stringify(envelope));
  } catch {
    // Do not block editing when storage quota/private-mode policies reject writes.
  }
}

export function useBlogDraftRecovery({
  activeStoreId,
  editingPost,
  posts,
  setEditingPost,
}: {
  activeStoreId: string | null | undefined;
  editingPost: BlogRecoverableDraft;
  posts: BlogPostRecord[];
  setEditingPost: Dispatch<SetStateAction<BlogRecoverableDraft>>;
}) {
  const targetRef = useRef<ActiveDraftTarget | null>(null);
  const currentKey = activeStoreId ? blogDraftStorageKey(activeStoreId, editingPost.id) : null;

  if (targetRef.current?.key === currentKey) {
    targetRef.current.draft = editingPost;
  }

  const resolveServerUpdatedAt = useCallback((postId?: string) => {
    if (!postId) return null;
    return posts.find((post) => post.id === postId)?.updated_at ?? null;
  }, [posts]);

  const flushCurrentDraft = useCallback(() => {
    if (typeof window === "undefined" || !targetRef.current) return;
    writeRecovery(targetRef.current);
  }, []);

  const clearCurrentDraft = useCallback(() => {
    if (typeof window === "undefined" || !targetRef.current) return;
    removeRecovery(targetRef.current.key);
    targetRef.current.baselineSignature = blogDraftSignature(targetRef.current.draft);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !activeStoreId || !currentKey) return;
    if (targetRef.current?.key === currentKey) return;

    // Flush the exact previous target snapshot before switching keys.
    if (targetRef.current) writeRecovery(targetRef.current);

    const serverUpdatedAt = resolveServerUpdatedAt(editingPost.id);
    const baselineSignature = blogDraftSignature(editingPost);
    targetRef.current = {
      key: currentKey,
      storeId: activeStoreId,
      serverUpdatedAt,
      baselineSignature,
      draft: editingPost,
    };

    const recovery = readRecovery(currentKey);
    const recoveryIsNewer = recovery
      ? isBlogDraftRecoveryNewer(recovery, serverUpdatedAt)
      : false;
    if (
      !recovery
      || recovery.storeId !== activeStoreId
      || !hasMeaningfulBlogDraft(recovery.draft)
      || !recoveryIsNewer
      || blogDraftSignature(recovery.draft) === baselineSignature
    ) {
      if (recovery && !recoveryIsNewer) removeRecovery(currentKey);
      return;
    }

    const savedAt = new Date(recovery.savedAt);
    const savedLabel = Number.isNaN(savedAt.getTime()) ? "an earlier session" : savedAt.toLocaleString();
    const restore = window.confirm(
      `Unsaved Blog draft found from ${savedLabel}.\n\nRestore this browser-local draft?\n\nChoose Cancel to discard the local recovery and keep the server version.`,
    );

    if (restore) {
      targetRef.current.draft = recovery.draft;
      setEditingPost(recovery.draft);
      toast.success("Recovered the unsaved browser draft.");
    } else {
      removeRecovery(currentKey);
      toast.success("Discarded the browser recovery draft.");
    }
  }, [activeStoreId, currentKey, editingPost, resolveServerUpdatedAt, setEditingPost]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeStoreId || !currentKey) return;
    const target = targetRef.current;
    if (!target || target.key !== currentKey) return;

    target.draft = editingPost;
    const signature = blogDraftSignature(editingPost);
    if (signature === target.baselineSignature || !hasMeaningfulBlogDraft(editingPost)) {
      removeRecovery(currentKey);
      return;
    }

    const timer = window.setTimeout(() => {
      if (targetRef.current?.key === currentKey) writeRecovery(targetRef.current);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeStoreId, currentKey, editingPost]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBeforeUnload = () => flushCurrentDraft();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      flushCurrentDraft();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [flushCurrentDraft]);

  return {
    clearCurrentDraft,
    flushCurrentDraft,
  };
}
