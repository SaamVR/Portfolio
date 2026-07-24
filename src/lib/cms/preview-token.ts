import { supabase } from "@/integrations/supabase/client";

export async function createPreviewToken(storeId: string): Promise<string | null> {
  if (!storeId) return null;

  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from("store_preview_tokens")
      .insert({
        store_id: storeId,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("Failed to create preview token:", error);
      return null;
    }

    return data.id as string;
  } catch (err) {
    console.error("Error creating preview token:", err);
    return null;
  }
}

export function buildStorePreviewUrl(storeSlug: string, previewToken?: string | null): string {
  const basePath = `/stores/${encodeURIComponent(storeSlug)}`;
  if (!previewToken) return basePath;
  return `${basePath}?preview=${encodeURIComponent(previewToken)}`;
}
