import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_TAXONOMY_UPDATED_EVENT = "commerce:product-taxonomy-updated";

export type ProductTypeTaxonomyRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
  metric_schema?: unknown;
};

type ProductTypePayload = {
  name: string;
  sort_order: number;
  metric_schema?: unknown;
};

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const getErrorText = (error: unknown) => {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const maybeError = error as PostgrestLikeError;
    return [maybeError.message, maybeError.details, maybeError.hint].filter(Boolean).join(" - ") || JSON.stringify(error);
  }
  return String(error);
};

export const formatTaxonomyError = (error: unknown) => getErrorText(error);

export const isMissingMetricSchemaColumn = (error: unknown) => {
  const errorText = getErrorText(error).toLowerCase();
  return errorText.includes("metric_schema") && (
    errorText.includes("does not exist") ||
    errorText.includes("could not find the") ||
    errorText.includes("schema cache")
  );
};

export const fetchStoreProductTypes = async (storeId: string) => {
  const preferredQuery = await (supabase.from("product_types") as any)
    .select("id, name, sort_order, created_at, metric_schema")
    .eq("store_id", storeId)
    .order("sort_order");

  if (!preferredQuery.error) {
    return (preferredQuery.data ?? []) as ProductTypeTaxonomyRow[];
  }

  if (!isMissingMetricSchemaColumn(preferredQuery.error)) {
    throw preferredQuery.error;
  }

  const fallbackQuery = await (supabase.from("product_types") as any)
    .select("id, name, sort_order, created_at")
    .eq("store_id", storeId)
    .order("sort_order");

  if (fallbackQuery.error) {
    throw fallbackQuery.error;
  }

  return ((fallbackQuery.data ?? []) as ProductTypeTaxonomyRow[]).map((row) => ({
    ...row,
    metric_schema: undefined,
  }));
};

export const saveStoreProductType = async ({
  storeId,
  editingTypeId,
  createTypeId,
  payload,
}: {
  storeId: string;
  editingTypeId?: string | null;
  createTypeId?: string | null;
  payload: ProductTypePayload;
}) => {
  const runMutation = async (nextPayload: ProductTypePayload) => {
    if (editingTypeId) {
      return await (supabase.from("product_types") as any)
        .update(nextPayload)
        .eq("id", editingTypeId)
        .eq("store_id", storeId);
    }

    const createPayload = {
      ...nextPayload,
      ...(createTypeId ? { id: createTypeId } : {}),
      store_id: storeId,
    };

    if (createTypeId) {
      return await (supabase.from("product_types") as any).upsert(createPayload, { onConflict: "id" });
    }

    return await (supabase.from("product_types") as any).insert(createPayload);
  };

  const preferredResult = await runMutation(payload);
  if (!preferredResult.error) {
    return { error: null, metricSchemaPersisted: true };
  }

  if (!isMissingMetricSchemaColumn(preferredResult.error)) {
    return { error: preferredResult.error, metricSchemaPersisted: false };
  }

  const { metric_schema: _metricSchema, ...fallbackPayload } = payload;
  const fallbackResult = await runMutation(fallbackPayload);
  return {
    error: fallbackResult.error ?? null,
    metricSchemaPersisted: false,
  };
};

export const notifyProductTaxonomyUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRODUCT_TAXONOMY_UPDATED_EVENT));
};
