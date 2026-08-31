"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { MerchantConfirmOptions } from "@/components/admin/MerchantConfirmDialog";
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

type RecoveryDecisionContext = {
  key: string;
  storeId: string;
  serverUpdatedAt: string | null;
  baselineSignature: string;
  recoverySignature: string;
  savedAt: string;
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
  confirmRecoveryDecision,
}: {
  activeStoreId: string | null | undefined;
  editingPost: BlogRecoverableDraft;
  posts: BlogPostRecord[];
  setEditingPost: Dispatch<SetStateAction<BlogRecoverableDraft>>;
  confirmRecoveryDecision: (options: MerchantConfirmOptions) => Promise<boolean>;
}) {
  const targetRef = useRef<ActiveDraftTarget | null>(null);
  const recoveryDecisionRef = useRef<RecoveryDecisionContext | null>(null);
  const preserveRecoveryKeyRef = useRef<string | null>(null);
  const currentKey = activeStoreId ? blogDraftStorageKey(activeStoreId, editingPost.id) : null;
  const activeStoreIdRef = useRef(activeStoreId);
  const currentKeyRef = useRef(currentKey);
  activeStoreIdRef.current = activeStoreId;
  currentKeyRef.current = currentKey;

  if (targetRef.current?.key === currentKey) {
    targetRef.current.draft = editingPost;
  }

  const resolveServerUpdatedAt = useCallback((postId?: string) => {
    if (!postId) return null;
    return posts.find((post) => post.id === postId)?.updated_at ?? null;
  }, [posts]);

  const shouldPreserveStoredRecovery = useCallback((target: ActiveDraftTarget) => {
    if (recoveryDecisionRef.current?.key === target.key) return true;
    return preserveRecoveryKeyRef.current === target.key
      && blogDraftSignature(target.draft) === target.baselineSignature;
  }, []);

  const flushCurrentDraft = useCallback(() => {
    if (typeof window === "undefined" || !targetRef.current) return;
    if (shouldPreserveStoredRecovery(targetRef.current)) return;
    writeRecovery(targetRef.current);
  }, [shouldPreserveStoredRecovery]);

  const clearCurrentDraft = useCallback(() => {
    if (typeof window === "undefined" || !targetRef.current) return;
    removeRecovery(targetRef.current.key);
    if (preserveRecoveryKeyRef.current === targetRef.current.key) {
      preserveRecoveryKeyRef.current = null;
    }
    if (recoveryDecisionRef.current?.key === targetRef.current.key) {
      recoveryDecisionRef.current = null;
    }
    targetRef.current.baselineSignature = blogDraftSignature(targetRef.current.draft);
  }, []);

  const isDecisionCurrent = useCallback((decision: RecoveryDecisionContext) => {
    const target = targetRef.current;
    if (
      !target
      || activeStoreIdRef.current !== decision.storeId
      || currentKeyRef.current !== decision.key
      || target.key !== decision.key
      || target.storeId !== decision.storeId
      || target.serverUpdatedAt !== decision.serverUpdatedAt
      || target.baselineSignature !== decision.baselineSignature
    ) {
      return false;
    }

    const storedRecovery = readRecovery(decision.key);
    return Boolean(
      storedRecovery
      && storedRecovery.storeId === decision.storeId
      && storedRecovery.savedAt === decision.savedAt
      && blogDraftSignature(storedRecovery.draft) === decision.recoverySignature
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !activeStoreId || !currentKey) return;
    if (targetRef.current?.key === currentKey) return;

    const previousTarget = targetRef.current;
    if (previousTarget && !shouldPreserveStoredRecovery(previousTarget)) {
      writeRecovery(previousTarget);
    }

    if (recoveryDecisionRef.current && recoveryDecisionRef.current.key !== currentKey) {
      recoveryDecisionRef.current = null;
    }
    if (preserveRecoveryKeyRef.current && preserveRecoveryKeyRef.current !== currentKey) {
      preserveRecoveryKeyRef.current = null;
    }

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

    const decision: RecoveryDecisionContext = {
      key: currentKey,
      storeId: activeStoreId,
      serverUpdatedAt,
      baselineSignature,
      recoverySignature: blogDraftSignature(recovery.draft),
      savedAt: recovery.savedAt,
      draft: recovery.draft,
    };
    recoveryDecisionRef.current = decision;

    const savedAt = new Date(recovery.savedAt);
    const savedLabel = Number.isNaN(savedAt.getTime()) ? "an earlier session" : savedAt.toLocaleString();
    const draftTitle = recovery.draft.title?.trim() || "Untitled blog draft";

    void (async () => {
      const restore = await confirmRecoveryDecision({
        title: "Recover unsaved browser draft?",
        description: `A newer browser-local Blog draft from ${savedLabel} is available for this article.`,
        entityLabel: "Recovery draft",
        entityValue: draftTitle,
        impacts: [
          "Restore browser draft replaces the editor with the newer browser-local recovery.",
          "Discard browser recovery permanently removes that local recovery and keeps the server version in the editor.",
        ],
        recoveryText: "Dismiss for now keeps the browser recovery intact so you can decide later.",
        confirmLabel: "Restore browser draft",
        cancelLabel: "Dismiss for now",
        secondaryActionLabel: "Discard browser recovery",
        secondaryActionVariant: "destructive",
        tone: "warning",
        onSecondaryAction: () => {
          if (!isDecisionCurrent(decision)) {
            toast.warning("The Blog draft target changed, so the recovery was not discarded.");
            return;
          }
          removeRecovery(decision.key);
          recoveryDecisionRef.current = null;
          if (preserveRecoveryKeyRef.current === decision.key) {
            preserveRecoveryKeyRef.current = null;
          }
          toast.success("Discarded the browser recovery draft.");
        },
      });

      if (
        recoveryDecisionRef.current?.key !== decision.key
        || recoveryDecisionRef.current?.savedAt !== decision.savedAt
      ) {
        return;
      }

      recoveryDecisionRef.current = null;
      if (!restore) {
        preserveRecoveryKeyRef.current = decision.key;
        return;
      }

      if (!isDecisionCurrent(decision)) {
        toast.warning("The Blog draft target changed, so the recovery was not restored.");
        return;
      }

      preserveRecoveryKeyRef.current = null;
      if (targetRef.current?.key === decision.key) {
        targetRef.current.draft = decision.draft;
      }
      setEditingPost(decision.draft);
      toast.success("Recovered the unsaved browser draft.");
    })();
  }, [
    activeStoreId,
    confirmRecoveryDecision,
    currentKey,
    editingPost,
    isDecisionCurrent,
    resolveServerUpdatedAt,
    setEditingPost,
    shouldPreserveStoredRecovery,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeStoreId || !currentKey) return;
    const target = targetRef.current;
    if (!target || target.key !== currentKey) return;
    if (recoveryDecisionRef.current?.key === currentKey) return;

    target.draft = editingPost;
    const signature = blogDraftSignature(editingPost);
    if (signature === target.baselineSignature || !hasMeaningfulBlogDraft(editingPost)) {
      if (preserveRecoveryKeyRef.current === currentKey) return;
      removeRecovery(currentKey);
      return;
    }

    if (preserveRecoveryKeyRef.current === currentKey) {
      preserveRecoveryKeyRef.current = null;
    }
    const timer = window.setTimeout(() => {
      if (targetRef.current?.key === currentKey && recoveryDecisionRef.current?.key !== currentKey) {
        writeRecovery(targetRef.current);
      }
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
