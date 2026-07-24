import { z } from "zod";
import { storeThemeSchema, storePageSchema, StoreTheme, StorePage, Store } from "./schema";
import { SupabaseClient } from "@supabase/supabase-js";

export const themeExportBundleSchema = z.object({
  schemaVersion: z.number().default(1),
  type: z.enum(["theme-only", "theme-and-layout", "full-store"]),
  theme: storeThemeSchema,
  pages: z.array(storePageSchema).optional(),
});

export type ThemeExportBundle = z.infer<typeof themeExportBundleSchema>;

/**
 * Generates an export bundle.
 */
export function generateExportBundle(
  store: Store,
  exportType: "theme-only" | "theme-and-layout" | "full-store"
): ThemeExportBundle {
  const bundle: ThemeExportBundle = {
    schemaVersion: 1,
    type: exportType,
    theme: store.theme,
  };

  if (exportType === "theme-and-layout" || exportType === "full-store") {
    // If we only want layout, we could strip content (like title/subtitle text)
    // But for simplicity, we currently just include the blocks.
    bundle.pages = store.pages;
  }

  return bundle;
}

/**
 * Downloads a generated bundle as a JSON file.
 */
export function downloadExportBundle(bundle: ThemeExportBundle, filename: string = "theme-export.json") {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundle, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", filename);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

/**
 * Parses and validates an imported JSON string.
 */
export function parseImportBundle(jsonString: string): { success: true; bundle: ThemeExportBundle } | { success: false; error: string } {
  try {
    const raw = JSON.parse(jsonString);
    const result = themeExportBundleSchema.safeParse(raw);
    
    if (result.success) {
      return { success: true, bundle: result.data };
    } else {
      return { success: false, error: "Invalid bundle format: " + result.error.message };
    }
  } catch (e: any) {
    return { success: false, error: "Failed to parse JSON file: " + e.message };
  }
}

/**
 * Fetches a template from the marketplace and parses it into a ThemeExportBundle.
 */
export async function fetchMarketplaceTemplate(
  client: SupabaseClient,
  templateId: string
): Promise<{ success: true; bundle: ThemeExportBundle } | { success: false; error: string }> {
  try {
    const { data, error } = await client
      .from("cms_marketplace_templates")
      .select("bundle_json")
      .eq("id", templateId)
      .maybeSingle();
      
    if (error) throw error;
    if (!data) return { success: false, error: "Template not found" };
    
    let raw = data.bundle_json;
    if (typeof raw === "string") {
      raw = JSON.parse(raw);
    }
    
    const result = themeExportBundleSchema.safeParse(raw);
    
    if (result.success) {
      return { success: true, bundle: result.data };
    } else {
      return { success: false, error: "Invalid bundle format in marketplace: " + result.error.message };
    }
  } catch (e: any) {
    return { success: false, error: "Failed to fetch template: " + e.message };
  }
}
