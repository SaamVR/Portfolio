"use client";

import { useState } from "react";
import { Eye, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { createPreviewToken, buildStorePreviewUrl } from "@/lib/cms/preview-token";
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
      // 1. Fetch active store slug
      const { data: store, error } = await (supabase as any)
        .from("stores")
        .select("slug")
        .eq("id", activeStoreId)
        .single();

      if (error || !store?.slug) {
        toast.error("Could not find active store slug.");
        return;
      }

      // 2. Generate 24h TTL preview token
      const token = await createPreviewToken(activeStoreId);

      if (!token) {
        toast.error("Failed to generate store preview token.");
        return;
      }

      // 3. Build preview URL and open in new tab
      const url = buildStorePreviewUrl(store.slug, token);
      window.open(url, "_blank", "noopener,noreferrer");
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
      title="Preview Store (Bypasses is_published with 24h preview token)"
      aria-label="Preview Store"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
      <span className="hidden sm:inline">Preview Store</span>
    </button>
  );
}
