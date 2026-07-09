import { z } from "zod";
import { defaultStore } from "@/lib/cms/default-store";

export const mediaLibraryAssetSchema = z.object({
  id: z.string(),
  url: z.string().min(1),
  resourceType: z.enum(["image", "video"]).default("image"),
  folder: z.string().default("cms"),
  alt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bytes: z.number().int().nonnegative().optional(),
  format: z.string().optional(),
  publicId: z.string().optional(),
  originalFilename: z.string().optional(),
  createdAt: z.string(),
  uploadedBy: z.string().optional(),
});

export const mediaLibrarySchema = z.array(mediaLibraryAssetSchema);

export type MediaLibraryAsset = z.infer<typeof mediaLibraryAssetSchema>;

export function inferMediaTypeFromUrl(url: string): "image" | "video" {
  if (url.includes("/video/") || /\.(mp4|webm|mov|m4v|avi)$/i.test(url)) {
    return "video";
  }

  return "image";
}

export function normalizeMediaLibrary(value: unknown): MediaLibraryAsset[] {
  const parsed = mediaLibrarySchema.safeParse(Array.isArray(value) ? value : []);
  if (!parsed.success) {
    return [];
  }

  return [...parsed.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function fetchMediaLibrary(storeId: string = defaultStore.id) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await (supabase as any)
    .from("site_settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("key", "media_library")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeMediaLibrary(data?.value);
}

export async function saveMediaLibrary(
  assets: MediaLibraryAsset[],
  storeId: string = defaultStore.id,
) {
  const { supabase } = await import("@/integrations/supabase/client");
  const normalizedAssets = normalizeMediaLibrary(assets);

  const { error } = await (supabase as any).from("site_settings").upsert(
    {
      store_id: storeId,
      key: "media_library",
      value: normalizedAssets,
    },
    { onConflict: "store_id,key" },
  );

  if (error) {
    throw error;
  }

  return normalizedAssets;
}
