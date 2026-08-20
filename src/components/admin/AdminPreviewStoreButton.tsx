"use client";

import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { createPreviewSession } from "@/lib/cms/preview-token";
import { toast } from "sonner";

interface AdminPreviewStoreButtonProps {
  className?: string;
  variant?: "header" | "button";
}

export function AdminPreviewStoreButton({ className = "", variant = "header" }: AdminPreviewStoreButtonProps) {
  const { activeStoreId } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    if (!activeStoreId) {
      toast.error("Please select a store to preview.");
      return;
    }

    setLoading(true);

    try {
      const session = await createPreviewSession(activeStoreId);
      if (!session) {
        toast.error("Failed to generate store preview. Please try again.");
        return;
      }

      window.open(session.previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("An error occurred while generating store preview.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handlePreview}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50 ${className}`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        <span>Preview Store</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePreview}
      disabled={loading}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/80 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 ${className}`}
      title="Preview the saved storefront with a private 24-hour link"
      aria-label="Preview Store"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
      <span className="hidden sm:inline">Preview Store</span>
    </button>
  );
}
