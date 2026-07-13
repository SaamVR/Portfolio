"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildThemePromotionPayload } from "@/components/admin/cms-library/mutations";
import { readPagePayload, readStringArray, type LibraryData, type ThemeRow } from "@/components/admin/cms-library/shared";

const LIBRARY_QUERY_KEY = ["cms-library-manager"] as const;

export function useCmsLibraryManagerData(userId?: string | null) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: LIBRARY_QUERY_KEY,
    queryFn: async (): Promise<LibraryData> => {
      const [{ data: blueprints }, { data: themes }, { data: pages }, { data: blocks }] = await Promise.all([
        supabase
          .from("store_blueprints")
          .select("id, name, short_name, description, business_family, catalog_mode, group_name, store_description, legacy_template_id, recommended_page_set, recommended_block_set, required_capabilities, default_theme, hero_payload, onboarding_schema, default_site_settings, is_active")
          .order("group_name")
          .order("name"),
        supabase
          .from("theme_packages")
          .select("id, slug, name, description, source_type, version, compatibility_version, preset_id, mode, preview_metadata, tokens, component_recipes, custom_css, owner_store_id")
          .order("name"),
        supabase
          .from("page_blueprints")
          .select("id, name, description, business_family, catalog_modes, page_payload, is_active")
          .order("name"),
        supabase
          .from("block_registry_entries")
          .select("block_type, label, description, layer, compatible_business_families, required_capabilities, is_active")
          .order("label"),
      ]);

      return {
        blueprints: blueprints ?? [],
        themes: themes ?? [],
        pages: pages ?? [],
        blocks: blocks ?? [],
      };
    },
  });

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!data || !query) return data;

    const matches = (...values: unknown[]) =>
      values.some((value) => String(value ?? "").toLowerCase().includes(query));

    return {
      blueprints: data.blueprints.filter((item) => matches(item.name, item.short_name, item.description, item.group_name, item.catalog_mode, item.id)),
      themes: data.themes.filter((item) => matches(item.name, item.slug, item.description, item.source_type, item.preset_id)),
      pages: data.pages.filter((item) => matches(item.name, item.description, item.business_family, item.id)),
      blocks: data.blocks.filter((item) => matches(item.label, item.description, item.block_type, item.layer)),
    };
  }, [data, search]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
  };

  const ensureCanDeactivate = async (
    table: "store_blueprints" | "page_blueprints" | "block_registry_entries" | "theme_packages",
    idValue: string,
    patch: Record<string, unknown>,
  ) => {
    if (patch.is_active !== false || !data) {
      return;
    }

    if (table === "store_blueprints") {
      const { count, error } = await (supabase as any)
        .from("store_business_profiles")
        .select("*", { count: "exact", head: true })
        .eq("blueprint_id", idValue);

      if (error) {
        throw new Error(error.message || "Failed to verify blueprint dependencies.");
      }

      if ((count ?? 0) > 0) {
        throw new Error("This blueprint is still assigned to one or more stores. Reassign those stores before deactivating it.");
      }
    }

    if (table === "page_blueprints") {
      const dependentBlueprints = data.blueprints.filter((item) =>
        readStringArray(JSON.stringify(item.recommended_page_set ?? [])).includes(idValue),
      );

      if (dependentBlueprints.length > 0) {
        throw new Error(`This page blueprint is still recommended by store blueprints: ${dependentBlueprints.slice(0, 3).map((item) => item.name).join(", ")}.`);
      }
    }

    if (table === "block_registry_entries") {
      const dependentBlueprints = data.blueprints.filter((item) =>
        readStringArray(JSON.stringify(item.recommended_block_set ?? [])).includes(idValue),
      );
      if (dependentBlueprints.length > 0) {
        throw new Error(`This block type is still recommended by store blueprints: ${dependentBlueprints.slice(0, 3).map((item) => item.name).join(", ")}.`);
      }

      const dependentPages = data.pages.filter((item) =>
        readPagePayload(JSON.stringify(item.page_payload ?? {})).blocks.some((block) => String(block.type ?? "") === idValue),
      );
      if (dependentPages.length > 0) {
        throw new Error(`This block type is still used by page blueprints: ${dependentPages.slice(0, 3).map((item) => item.name).join(", ")}.`);
      }

      const { count, error } = await (supabase as any)
        .from("store_page_blocks")
        .select("*", { count: "exact", head: true })
        .eq("block_type", idValue);

      if (error) {
        throw new Error(error.message || "Failed to verify live block dependencies.");
      }

      if ((count ?? 0) > 0) {
        throw new Error("This block type is still installed in live store pages. Remove or migrate those blocks before deactivating it.");
      }
    }
  };

  const updateRow = async (
    table: "store_blueprints" | "page_blueprints" | "block_registry_entries" | "theme_packages",
    idColumn: string,
    idValue: string,
    patch: Record<string, unknown>,
  ) => {
    setSavingId(`${table}:${idValue}`);
    try {
      await ensureCanDeactivate(table, idValue, patch);

      const { error } = await (supabase as any).from(table).update(patch).eq(idColumn, idValue);
      if (error) {
        toast.error(error.message || "Failed to update library item.");
      } else {
        toast.success("Library item updated.");
        await refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update library item.");
    }
    setSavingId(null);
  };

  const insertRow = async (
    table: "store_blueprints" | "theme_packages" | "page_blueprints" | "block_registry_entries",
    payload: Record<string, unknown>,
    identity: string,
  ) => {
    setSavingId(`${table}:${identity}`);
    const { error } = await (supabase as any).from(table).insert(payload);
    if (error) {
      toast.error(error.message || "Failed to create library item.");
      setSavingId(null);
      return false;
    }

    toast.success("Library item created.");
    await refresh();
    setSavingId(null);
    return true;
  };

  const promoteTheme = async (item: ThemeRow) => {
    setSavingId(`theme_packages:${item.id}`);
    try {
      const payload = buildThemePromotionPayload(item, userId);
      const { error } = await (supabase as any)
        .from("theme_packages")
        .insert(payload);

      if (error) {
        toast.error(error.message || "Failed to promote theme.");
      } else {
        toast.success("Theme promoted to admin shared.");
        await refresh();
      }
    } catch (error) {
      toast.message(error instanceof Error ? error.message : "Theme is already shared.");
    }
    setSavingId(null);
  };

  return {
    savingId,
    search,
    setSearch,
    data,
    filteredData,
    isLoading,
    refresh,
    updateRow,
    insertRow,
    promoteTheme,
  };
}
