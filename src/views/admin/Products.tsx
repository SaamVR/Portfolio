import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  FolderTree,
  X,
  SlidersHorizontal,
} from "lucide-react";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import CloudinaryMultiUpload from "@/components/admin/CloudinaryMultiUpload";
import { useMerchantConfirm } from "@/components/admin/MerchantConfirmDialog";
import AdminCategories from "./Categories";
import {
  parseCsvText,
  parseXlsxBuffer,
  validateImportRow,
  buildStoreBatchInsertPayload,
  buildProductsExportCsv,
  SAMPLE_TEMPLATE_CSV,
  type ParsedImportRow,
} from "@/lib/cms/product-import";
import {
  appendMetricValue,
  getTemplateDefaultProductMetrics,
  normalizeMetricDefinitions,
  normalizeMetricValues,
  resolveProductMetricDefinitions,
  type ProductMetricDefinition,
} from "@/lib/cms/product-metrics";
import {
  fetchStoreProductTypes,
  formatTaxonomyError,
  PRODUCT_TAXONOMY_UPDATED_EVENT,
  type ProductTypeTaxonomyRow,
} from "@/lib/cms/product-taxonomy";
import {
  firstProductCatalogErrorField,
  validateProductCatalogDraft,
  type ProductCatalogErrors,
  type ProductCatalogField,
} from "@/lib/catalog/catalog-dialog-validation";
import { refreshStorefrontProductCache } from "@/lib/storefront-cache-client";
import type { Json } from "@/integrations/supabase/types";
import {
  inferCommercialOptionKind,
  normalizeCommercialOptions,
  serializeCommercialOptions,
  type ProductCommercialOption,
  type ProductFulfillmentType,
} from "@/lib/commerce/product-commercial-options";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  fetchAdminProductDetail,
  fetchAllAdminProductsForExport,
  invalidateAdminProductCollections,
  useAdminProductPages,
  useAdminProductStats,
  type AdminProductListItem,
  type AdminProductRecord,
} from "@/hooks/useAdminProducts";

type Product = AdminProductRecord;

type ShopPageSettings = {
  catalog_note_visible?: boolean;
  catalog_note_title?: string;
  catalog_note_description?: string;
};

type ProductFormFeedback = ProductCatalogErrors & { form?: string };

const emptyProduct = {
  name: "",
  price: 0,
  original_price: null as number | null,
  image_url: "",
  images: [] as string[],
  description: "",
  sizes: [] as string[],
  colors: [] as string[],
  category: "Essentials",
  type: "T-Shirt",
  featured: false,
  badge: null as string | null,
  stock: 1,
  metric_values: {} as Record<string, string[]>,
  commercial_options: [] as ProductCommercialOption[],
  fulfillment_type: "physical" as ProductFulfillmentType,
};

const BADGES = ["none", "New", "Sale"];

function MetricValueChipInput({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (nextValues: string[]) => void;
}) {
  const [draftValue, setDraftValue] = useState("");

  useEffect(() => {
    setDraftValue("");
  }, [label, values.length]);

  const commitDraft = useCallback(() => {
    const nextValues = draftValue
      .split(",")
      .reduce((current, item) => appendMetricValue(current, item), values);
    if (nextValues !== values) {
      onChange(nextValues);
    }
    setDraftValue("");
  }, [draftValue, onChange, values]);

  const removeValue = (valueToRemove: string) => {
    onChange(values.filter((value) => value !== valueToRemove));
  };

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="rounded-lg border border-input bg-background px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground"
            >
              <span className="max-w-[140px] truncate sm:max-w-[180px]">{value}</span>
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Remove ${value}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={draftValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue.includes(",")) {
                const nextValues = nextValue
                  .split(",")
                  .reduce((current, item) => appendMetricValue(current, item), values);
                if (nextValues !== values) {
                  onChange(nextValues);
                }
                setDraftValue("");
                return;
              }
              setDraftValue(nextValue);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commitDraft();
                return;
              }
              if (event.key === "Backspace" && !draftValue && values.length > 0) {
                event.preventDefault();
                onChange(values.slice(0, -1));
              }
            }}
            onBlur={commitDraft}
            placeholder={values.length === 0 ? placeholder : "Add another value"}
            className="h-9 min-w-[140px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Press Enter or comma to add each value.</p>
    </div>
  );
}

const AdminProducts = () => {
  const { role, activeStoreId } = useAuth();
  const isAdmin = role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "catalog";

  const queryClient = useQueryClient();
  const activeStoreIdRef = useRef(activeStoreId);
  const productNameRef = useRef<HTMLInputElement>(null);
  const productPriceRef = useRef<HTMLInputElement>(null);
  const productStockRef = useRef<HTMLInputElement>(null);
  const saveOperationRef = useRef(0);
  const createProductIdRef = useRef<string | null>(null);
  const { confirm, confirmationDialog } = useMerchantConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [formErrors, setFormErrors] = useState<ProductFormFeedback>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const productPages = useAdminProductPages(activeStoreId, debouncedSearch);
  const products = productPages.data?.pages.flatMap((page) => page.items) ?? [];
  const productStats = useAdminProductStats(activeStoreId);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dbTypes, setDbTypes] = useState<string[]>([]);
  const [typeRows, setTypeRows] = useState<ProductTypeTaxonomyRow[]>([]);
  const [metricsCatalog, setMetricsCatalog] = useState<ProductMetricDefinition[]>([]);
  const [storefrontTemplateId, setStorefrontTemplateId] = useState<string>("general-catalog");
  const [shopPageSettings, setShopPageSettings] = useState<ShopPageSettings>({});
  const [shopPageSettingsSnapshot, setShopPageSettingsSnapshot] = useState<Record<string, unknown>>({});
  const [savingCatalogNoteSettings, setSavingCatalogNoteSettings] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  useEffect(() => {
    activeStoreIdRef.current = activeStoreId;
  }, [activeStoreId]);

  useEffect(() => {
    if (!dialogOpen || typeof document === "undefined") return;
    const imageInput = document.querySelector<HTMLInputElement>('[data-testid="products-form-image-url"]');
    if (!imageInput) return;
    if (formErrors.image_url) {
      imageInput.setAttribute("aria-invalid", "true");
      imageInput.setAttribute("aria-describedby", "products-form-image-error");
    } else {
      imageInput.removeAttribute("aria-invalid");
      imageInput.removeAttribute("aria-describedby");
    }
  }, [dialogOpen, formErrors.image_url]);

  const clearProductError = (field: ProductCatalogField) => {
    setFormErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const focusProductError = (field: ProductCatalogField | null) => {
    if (!field) return;
    if (field === "name") productNameRef.current?.focus();
    if (field === "price") productPriceRef.current?.focus();
    if (field === "stock") productStockRef.current?.focus();
    if (field === "image_url" && typeof document !== "undefined") {
      document.querySelector<HTMLInputElement>('[data-testid="products-form-image-url"]')?.focus();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImporting(true);
    try {
      let rawRecords: Record<string, string>[] = [];
      if (file.name.endsWith(".xlsx")) {
        rawRecords = await parseXlsxBuffer(await file.arrayBuffer());
      } else {
        rawRecords = parseCsvText(await file.text());
      }
      const validated = rawRecords.map((raw, index) => validateImportRow(raw, index + 1));
      setImportRows(validated);
      if (validated.length === 0) toast.error("No data rows found in file");
    } catch (error) {
      console.error("Failed to parse import file:", error);
      toast.error("Failed to read file. Please ensure it is a valid .csv or .xlsx file.");
      setImportRows([]);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCatalog = async () => {
    if (!activeStoreId) {
      toast.error("Select a store before exporting products.");
      return;
    }
    if ((productStats.data?.catalogSize ?? 0) === 0) {
      toast.error("There are no products to export yet.");
      return;
    }

    const storeId = activeStoreId;
    setExporting(true);
    try {
      const exportProducts = await fetchAllAdminProductsForExport(storeId);
      if (activeStoreIdRef.current !== storeId) return;
      const csv = buildProductsExportCsv(exportProducts);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `products-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Catalog export downloaded.");
    } catch (error) {
      console.error("Failed to export catalog:", error);
      toast.error("Failed to export catalog.");
    } finally {
      setExporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!activeStoreId) {
      toast.error("No active store selected for import");
      return;
    }
    const validRows = importRows.filter((row) => row.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setImporting(true);
    try {
      const payload = buildStoreBatchInsertPayload(validRows, activeStoreId as string);
      const { error } = await supabase.from("products").insert(payload);
      if (error) throw error;
      toast.success(`Successfully imported ${payload.length} products`);
      setImportDialogOpen(false);
      setImportRows([]);
      setImportFileName("");
      await refreshStorefrontProductCache(supabase, activeStoreId as string);
      await invalidateAdminProductCollections(queryClient, activeStoreId);
    } catch (error) {
      console.error("Failed to bulk import products:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import products");
    } finally {
      setImporting(false);
    }
  };

  const refreshCatalogData = useCallback(async (options?: { silent?: boolean }) => {
    if (!activeStoreId) {
      setDbCategories([]);
      setDbTypes([]);
      setTypeRows([]);
      setMetricsCatalog([]);
      setStorefrontTemplateId("general-catalog");
      setShopPageSettings({});
      setShopPageSettingsSnapshot({});
      return;
    }

    try {
      const [categoriesRes, typesData, settingsRes] = await Promise.all([
        supabase.from("product_categories").select("name").eq("store_id", activeStoreId as string).order("sort_order"),
        fetchStoreProductTypes(activeStoreId as string),
        supabase.from("site_settings").select("key, value").eq("store_id", activeStoreId as string).in("key", ["product_metrics_catalog", "storefront_profile", "shop_page"]),
      ]);
      if (categoriesRes.error || settingsRes.error) throw categoriesRes.error || settingsRes.error;

      setDbCategories((categoriesRes.data ?? []).map((row: any) => row.name));
      setDbTypes(typesData.map((row) => row.name));
      setTypeRows(typesData as ProductTypeTaxonomyRow[]);
      const settingsRows = settingsRes.data ?? [];
      const metricsValue = settingsRows.find((row) => row.key === "product_metrics_catalog")?.value;
      const storefrontProfile = settingsRows.find((row) => row.key === "storefront_profile")?.value as Record<string, unknown> | undefined;
      const shopPage = settingsRows.find((row) => row.key === "shop_page")?.value as Record<string, unknown> | undefined;
      setMetricsCatalog(normalizeMetricDefinitions(
        typeof metricsValue === "object" && metricsValue
          ? (metricsValue as Record<string, unknown>).customMetrics
          : [],
      ));
      setStorefrontTemplateId(typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : "general-catalog");
      setShopPageSettings({
        catalog_note_visible: shopPage?.catalog_note_visible !== false,
        catalog_note_title: typeof shopPage?.catalog_note_title === "string" ? shopPage.catalog_note_title : "",
        catalog_note_description: typeof shopPage?.catalog_note_description === "string" ? shopPage.catalog_note_description : "",
      });
      setShopPageSettingsSnapshot(shopPage ?? {});
    } catch (error) {
      console.error("Failed to load product taxonomy:", error);
      if (!options?.silent) toast.error(`Failed to load product data: ${formatTaxonomyError(error)}`);
    }
  }, [activeStoreId]);

  useEffect(() => {
    void refreshCatalogData();
  }, [refreshCatalogData]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshVisibleCatalog = () => {
      void refreshCatalogData({ silent: true });
      if (activeStoreId) void invalidateAdminProductCollections(queryClient, activeStoreId);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshVisibleCatalog();
    };

    window.addEventListener(PRODUCT_TAXONOMY_UPDATED_EVENT, refreshVisibleCatalog);
    window.addEventListener("focus", refreshVisibleCatalog);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener(PRODUCT_TAXONOMY_UPDATED_EVENT, refreshVisibleCatalog);
      window.removeEventListener("focus", refreshVisibleCatalog);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeStoreId, queryClient, refreshCatalogData]);

  useEffect(() => {
    saveOperationRef.current += 1;
    createProductIdRef.current = null;
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyProduct);
    setFormErrors({});
    setSaving(false);
    setSearch("");
    setLoadingProductId(null);
    setTypeRows([]);
    setMetricsCatalog([]);
    setStorefrontTemplateId("general-catalog");
    setShopPageSettings({});
    setShopPageSettingsSnapshot({});
  }, [activeStoreId]);

  const updateCatalogNoteSetting = useCallback((field: keyof ShopPageSettings, value: string | boolean) => {
    setShopPageSettings((current) => ({ ...current, [field]: value }));
  }, []);

  const saveCatalogNoteSettings = useCallback(async () => {
    if (!activeStoreId) {
      toast.error("Select a store before updating shop settings.");
      return;
    }

    setSavingCatalogNoteSettings(true);
    try {
      const payload = {
        ...shopPageSettingsSnapshot,
        catalog_note_visible: shopPageSettings.catalog_note_visible !== false,
        catalog_note_title: shopPageSettings.catalog_note_title?.trim() || null,
        catalog_note_description: shopPageSettings.catalog_note_description?.trim() || null,
      };
      const { error } = await supabase
        .from("site_settings")
        .upsert({ store_id: activeStoreId, key: "shop_page", value: payload as unknown as Json }, { onConflict: "store_id,key" });
      if (error) throw error;
      setShopPageSettingsSnapshot(payload);
      toast.success("Catalog note settings saved.");
    } catch (error) {
      console.error("Failed to save catalog note settings:", error);
      toast.error("Failed to save catalog note settings.");
    } finally {
      setSavingCatalogNoteSettings(false);
    }
  }, [activeStoreId, shopPageSettings, shopPageSettingsSnapshot]);

  const openNew = () => {
    createProductIdRef.current = crypto.randomUUID();
    setEditing(null);
    setForm(emptyProduct);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = async (product: AdminProductListItem) => {
    if (!activeStoreId) return;
    const storeId = activeStoreId;
    setLoadingProductId(product.id);
    try {
      const productDetail = await fetchAdminProductDetail(storeId, product.id);
      if (activeStoreIdRef.current !== storeId) return;
      createProductIdRef.current = null;
      setEditing(productDetail);
      setFormErrors({});
      setForm({
        name: productDetail.name,
        price: productDetail.price,
        original_price: productDetail.original_price,
        image_url: productDetail.image_url,
        images: productDetail.images || [],
        description: productDetail.description,
        sizes: productDetail.sizes,
        colors: productDetail.colors,
        category: productDetail.category,
        type: productDetail.type,
        featured: productDetail.featured,
        badge: productDetail.badge,
        stock: productDetail.stock,
        metric_values: normalizeMetricValues(productDetail.metric_values),
        commercial_options: normalizeCommercialOptions(productDetail.commercial_options),
        fulfillment_type: productDetail.fulfillment_type === "digital" ? "digital" : "physical",
      });
      setDialogOpen(true);
    } catch (error) {
      console.error("Failed to load product detail:", error);
      toast.error("Failed to load product details.");
    } finally {
      setLoadingProductId(null);
    }
  };

  const selectedTypeRow = typeRows.find((row) => row.name === form.type) ?? null;
  const resolvedMetricDefinitions = resolveProductMetricDefinitions(
    getTemplateDefaultProductMetrics(storefrontTemplateId),
    selectedTypeRow?.metric_schema,
  );
  const selectedTypeHasExplicitSchema = Array.isArray(selectedTypeRow?.metric_schema);

  const isDefaultCommercialMetric = (metricKey: string) => {
    const kind = inferCommercialOptionKind(undefined, metricKey);
    return metricKey === "size" || metricKey === "color" || kind !== "variant";
  };

  const reconcileCommercialMetricGroup = (
    currentOptions: ProductCommercialOption[],
    metricKey: string,
    values: string[],
    enabled: boolean,
  ) => {
    const otherGroups = currentOptions.filter((option) => option.groupKey !== metricKey);
    if (!enabled) return otherGroups;
    const existingByLabel = new Map(
      currentOptions
        .filter((option) => option.groupKey === metricKey)
        .map((option) => [option.label.trim().toLowerCase(), option]),
    );
    const kind = inferCommercialOptionKind(undefined, metricKey);
    return [
      ...otherGroups,
      ...values.map((label) => {
        const existing = existingByLabel.get(label.trim().toLowerCase());
        return existing
          ? { ...existing, label, groupKey: metricKey, kind, active: true }
          : { id: crypto.randomUUID(), groupKey: metricKey, label, priceDelta: 0, kind, active: true };
      }),
    ];
  };

  const setCommercialMetricEnabled = (metricKey: string, values: string[], enabled: boolean) => {
    setForm((current) => ({
      ...current,
      commercial_options: reconcileCommercialMetricGroup(current.commercial_options, metricKey, values, enabled),
    }));
  };

  const setCommercialOptionDelta = (optionId: string, nextDelta: number) => {
    const safeDelta = Number.isFinite(nextDelta) ? Math.max(-2_000_000_000, Math.min(2_000_000_000, Math.round(nextDelta))) : 0;
    setForm((current) => ({
      ...current,
      commercial_options: current.commercial_options.map((option) =>
        option.id === optionId ? { ...option, priceDelta: safeDelta } : option,
      ),
    }));
  };

  const updateMetricValue = (metricKey: string, nextValues: string[]) => {
    setForm((current) => {
      const commercialEnabled = isDefaultCommercialMetric(metricKey)
        || current.commercial_options.some((option) => option.groupKey === metricKey);
      return {
        ...current,
        sizes: metricKey === "size" ? nextValues : current.sizes,
        colors: metricKey === "color" ? nextValues : current.colors,
        metric_values: { ...current.metric_values, [metricKey]: nextValues },
        commercial_options: reconcileCommercialMetricGroup(
          current.commercial_options,
          metricKey,
          nextValues,
          commercialEnabled,
        ),
      };
    });
  };

  const handleSave = async () => {
    if (!activeStoreId) {
      setFormErrors((current) => ({ ...current, form: "Select a store before saving products." }));
      toast.error("Select a store before saving products.");
      return;
    }

    const validationErrors = validateProductCatalogDraft(form, { isEditing: Boolean(editing) });
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      focusProductError(firstProductCatalogErrorField(validationErrors));
      toast.error("Fix the highlighted product fields before saving.");
      return;
    }

    const storeId = activeStoreId;
    const editingAtSubmit = editing;
    const operationId = ++saveOperationRef.current;
    const createProductId = createProductIdRef.current ?? crypto.randomUUID();
    if (!editingAtSubmit) createProductIdRef.current = createProductId;
    setFormErrors({});
    setSaving(true);

    const payload = {
      ...form,
      name: form.name.trim(),
      image_url: form.image_url.trim(),
      images: (form.images ?? []).filter((url) => url.trim() !== ""),
      badge: form.badge || null,
      original_price: form.original_price || null,
      metric_values: form.metric_values,
      sizes: form.metric_values.size ?? form.sizes,
      colors: form.metric_values.color ?? form.colors,
      commercial_options: serializeCommercialOptions(form.commercial_options),
      fulfillment_type: form.fulfillment_type,
      store_id: storeId,
    };

    try {
      const productId = editingAtSubmit?.id ?? createProductId;
      let successMessage = "Product added and ready to sell";
      if (editingAtSubmit) {
        const { error } = await (supabase.from("products") as any)
          .update(payload)
          .eq("id", editingAtSubmit.id)
          .eq("store_id", storeId);
        if (error) throw error;
        successMessage = payload.stock === 0 ? "Product updated and marked sold out" : "Product updated";
      } else {
        const { error } = await (supabase.from("products") as any).upsert(
          { ...payload, id: createProductId },
          { onConflict: "id" },
        );
        if (error) throw error;
      }

      await refreshStorefrontProductCache(supabase, storeId, { products: [{ id: productId, name: payload.name }] });
      await invalidateAdminProductCollections(queryClient, storeId);
      if (activeStoreIdRef.current !== storeId || saveOperationRef.current !== operationId) return;
      toast.success(successMessage);
      setDialogOpen(false);
      setFormErrors({});
      createProductIdRef.current = null;
    } catch (error) {
      console.error("Failed to save product:", error);
      if (activeStoreIdRef.current !== storeId || saveOperationRef.current !== operationId) return;
      const message = editingAtSubmit
        ? "Product could not be updated. Your changes are still here; review them and try again."
        : "Product could not be saved or reconciled. Your draft is still here; review it and try again.";
      setFormErrors((current) => ({ ...current, form: message }));
      toast.error(message);
    } finally {
      if (activeStoreIdRef.current === storeId && saveOperationRef.current === operationId) setSaving(false);
    }
  };

  const handleDelete = async (product: AdminProductListItem) => {
    if (!activeStoreId) {
      toast.error("Select a store before deleting products.");
      return;
    }

    const context = { storeId: activeStoreId, entityId: product.id, entityName: product.name };
    const confirmed = await confirm({
      title: `Delete ${context.entityName}?`,
      description: "This permanently removes the product from this store's catalog.",
      entityLabel: "Product",
      entityValue: context.entityName,
      impacts: ["The product will no longer be available to shoppers.", "This action cannot be undone from the catalog."],
      warning: "Only continue if this is the exact product you intend to remove.",
      confirmLabel: "Delete product",
      tone: "destructive",
    });
    if (!confirmed) return;
    if (activeStoreIdRef.current !== context.storeId) {
      toast.error("The active store changed before deletion. Nothing was deleted.");
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", context.entityId).eq("store_id", context.storeId);
    if (error) {
      toast.error("Failed to delete product");
      return;
    }

    try {
      await refreshStorefrontProductCache(supabase, context.storeId, {
        products: [{ id: context.entityId, name: context.entityName }],
      });
      await invalidateAdminProductCollections(queryClient, context.storeId);
    } catch (refreshError) {
      console.error("Failed to reconcile catalog after product delete:", refreshError);
      toast.error("Product was deleted, but the catalog refresh did not complete. Reload the catalog before making another change.");
      return;
    }
    if (activeStoreIdRef.current !== context.storeId) return;
    toast.success("Product deleted");
  };

  const catalogSize = productStats.data?.catalogSize ?? 0;
  const readyToSell = productStats.data?.readyToSell ?? 0;
  const featured = productStats.data?.featured ?? 0;
  const outOfStock = productStats.data?.outOfStock ?? 0;
  const customMetricCount = metricsCatalog.length;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Catalog workspace</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">Products</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Add what you sell, keep stock accurate, and organize how shoppers browse your catalog.
            </p>
          </div>
          {activeTab === "catalog" ? (
            <Button data-testid="products-add-button" onClick={openNew} className="min-h-12 w-full gap-2 px-5 text-sm font-semibold shadow-sm md:w-auto">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          ) : null}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/35 p-1 sm:w-fit">
          <TabsTrigger value="catalog" className="min-h-11 gap-2 rounded-lg px-3 sm:min-w-40">
            <Package className="h-4 w-4" />
            <span>Products</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="min-h-11 gap-2 rounded-lg px-3 sm:min-w-40">
            <FolderTree className="h-4 w-4" />
            <span>Categories & Types</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-5">
          <Card className="border-border bg-card/70">
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4 sm:divide-x sm:gap-0 sm:p-0">
              <div className="sm:px-5 sm:py-4">
                <p className="text-xs text-muted-foreground">All products</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{catalogSize}</p>
              </div>
              <div className="sm:px-5 sm:py-4">
                <p className="text-xs text-muted-foreground">Ready to sell</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{readyToSell}</p>
              </div>
              <div className="sm:px-5 sm:py-4">
                <p className="text-xs text-muted-foreground">Featured</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{featured}</p>
              </div>
              <div className="sm:px-5 sm:py-4">
                <p className="text-xs text-muted-foreground">Out of stock</p>
                <p className={`mt-1 text-xl font-semibold ${outOfStock > 0 ? "text-destructive" : "text-foreground"}`}>{outOfStock}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="products-search" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Find a product</Label>
                  <Input
                    id="products-search"
                    data-testid="products-search"
                    placeholder="Search by product name..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="mt-2 min-h-11 w-full lg:max-w-xl"
                  />
                </div>
                <details className="group rounded-xl border border-border bg-secondary/15 lg:min-w-64">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-foreground">
                    <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Bulk tools</span>
                    <span className="text-xs text-muted-foreground group-open:hidden">Import / export</span>
                    <span className="hidden text-xs text-muted-foreground group-open:inline">Close</span>
                  </summary>
                  <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-1">
                    <Button variant="outline" data-testid="products-bulk-import-button" onClick={() => setImportDialogOpen(true)} className="min-h-11 justify-start gap-2">
                      <Upload className="h-4 w-4" /> Bulk Import
                    </Button>
                    <Button variant="outline" data-testid="products-export-button" onClick={() => void handleExportCatalog()} disabled={exporting} className="min-h-11 justify-start gap-2">
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
                    </Button>
                  </div>
                </details>
              </div>

              {debouncedSearch ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/25 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Showing matches for <strong className="font-semibold text-foreground">{debouncedSearch}</strong></span>
                  <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="min-h-9">Clear search</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {productPages.isLoading && products.length === 0 ? (
            <div className="flex justify-center py-20" aria-label="Loading products">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-4 py-16 text-center sm:py-20">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                {debouncedSearch ? "No products match this search" : "Add your first product"}
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {debouncedSearch
                  ? "Try another product name or clear the search to return to your full catalog."
                  : "A product with a name, price, image, and stock of at least 1 can be ready for shoppers immediately."}
              </p>
              <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
                {debouncedSearch ? (
                  <Button variant="outline" onClick={() => setSearch("")} className="min-h-11">Clear search</Button>
                ) : (
                  <Button onClick={openNew} className="min-h-11 gap-2 px-6"><Plus className="h-4 w-4" /> Add Your First Product</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden border-border">
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary sm:aspect-square">
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    {!product.is_available ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Badge variant="destructive">Out of Stock</Badge>
                      </div>
                    ) : null}
                    {product.badge ? (
                      <Badge className="absolute left-2 top-2" variant={product.badge === "Sale" ? "destructive" : "default"}>{product.badge}</Badge>
                    ) : null}
                  </div>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-heading text-base font-semibold text-foreground">{product.name}</h3>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{product.type} · {product.category}</p>
                      </div>
                      <p className="shrink-0 font-heading text-sm font-bold text-primary">BDT {product.price}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/20 px-3 py-2">
                      <span className="text-xs text-muted-foreground">Inventory</span>
                      <span className="text-sm font-semibold text-foreground">{product.stock} in stock</span>
                    </div>
                    <div className="flex items-center gap-2 border-t border-border pt-3">
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1 gap-2"
                        onClick={() => void openEdit(product)}
                        disabled={loadingProductId === product.id}
                        aria-label={`Edit ${product.name}`}
                      >
                        {loadingProductId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                        Edit product
                      </Button>
                      {isAdmin ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(product)}
                          aria-label={`Delete ${product.name}`}
                          title={`Delete ${product.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {productPages.hasNextPage ? (
            <div className="flex justify-center pt-1">
              <Button variant="outline" onClick={() => void productPages.fetchNextPage()} disabled={productPages.isFetchingNextPage} className="min-h-11 gap-2 px-6">
                {productPages.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more products
              </Button>
            </div>
          ) : null}

          <details className="group rounded-2xl border border-border bg-card/60">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Shop catalog note</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Optional message shown below the main shop results.</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-primary group-open:hidden">Edit note</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground group-open:inline">Close</span>
            </summary>
            <div className="space-y-4 border-t border-border p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/20 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Show catalog note section</p>
                  <p className="text-xs text-muted-foreground">Turn it off when shoppers do not need extra context.</p>
                </div>
                <Switch checked={shopPageSettings.catalog_note_visible !== false} onCheckedChange={(checked) => updateCatalogNoteSetting("catalog_note_visible", checked)} />
              </div>
              <div className="grid gap-2">
                <Label>Section title</Label>
                <Input value={shopPageSettings.catalog_note_title ?? ""} placeholder="A quick note before shoppers keep browsing" onChange={(event) => updateCatalogNoteSetting("catalog_note_title", event.target.value)} className="min-h-11" />
              </div>
              <div className="grid gap-2">
                <Label>Section description</Label>
                <Textarea value={shopPageSettings.catalog_note_description ?? ""} placeholder="Explain what this catalog includes, how pricing works, or what visitors should know before they continue shopping." rows={3} onChange={(event) => updateCatalogNoteSetting("catalog_note_description", event.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void saveCatalogNoteSettings()} disabled={savingCatalogNoteSettings} className="min-h-11 w-full gap-2 sm:w-auto">
                  {savingCatalogNoteSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Shop Note
                </Button>
              </div>
            </div>
          </details>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <AdminCategories />
        </TabsContent>
      </Tabs>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (saving && !open) return;
          setDialogOpen(open);
          if (!open) setFormErrors({});
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" aria-busy={saving}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {editing ? "Update the details shoppers rely on." : "Start with the essentials. You can refine merchandising details later."}
            </p>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <section className="space-y-4 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">1. Selling essentials</p>
                <p className="mt-1 text-xs text-muted-foreground">Name, price, image, and stock determine whether this product is ready to sell.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="products-form-name">Name *</Label>
                <Input ref={productNameRef} id="products-form-name" data-testid="products-form-name" value={form.name} aria-invalid={Boolean(formErrors.name)} aria-describedby={formErrors.name ? "products-form-name-error" : undefined} onChange={(event) => { setForm({ ...form, name: event.target.value }); clearProductError("name"); }} className="min-h-11" />
                {formErrors.name ? <p id="products-form-name-error" role="alert" className="text-sm text-destructive">{formErrors.name}</p> : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="products-form-price">Price (BDT) *</Label>
                  <Input ref={productPriceRef} id="products-form-price" data-testid="products-form-price" type="number" value={form.price} aria-invalid={Boolean(formErrors.price)} aria-describedby={formErrors.price ? "products-form-price-error" : undefined} onChange={(event) => { setForm({ ...form, price: Number(event.target.value) }); clearProductError("price"); }} className="min-h-11" />
                  {formErrors.price ? <p id="products-form-price-error" role="alert" className="text-sm text-destructive">{formErrors.price}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Label>Original Price</Label>
                  <Input type="number" value={form.original_price ?? ""} onChange={(event) => setForm({ ...form, original_price: event.target.value ? Number(event.target.value) : null })} className="min-h-11" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Main Image *</Label>
                <CloudinaryUpload value={form.image_url} onChange={(url) => { setForm({ ...form, image_url: url }); clearProductError("image_url"); }} folder="products" label="Upload main image" inputTestId="products-form-image-url" />
                {formErrors.image_url ? <p id="products-form-image-error" role="alert" className="text-sm text-destructive">{formErrors.image_url}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="products-form-stock">Stock *</Label>
                <Input ref={productStockRef} id="products-form-stock" data-testid="products-form-stock" type="number" min={0} step={1} value={form.stock} aria-invalid={Boolean(formErrors.stock)} aria-describedby={formErrors.stock ? "products-form-stock-error" : undefined} onChange={(event) => { setForm({ ...form, stock: Number(event.target.value) }); clearProductError("stock"); }} className="min-h-11" />
                {formErrors.stock ? <p id="products-form-stock-error" role="alert" className="text-sm text-destructive">{formErrors.stock}</p> : null}
                <p className="text-xs text-muted-foreground">{editing ? "Set stock to 0 to mark this product sold out and unavailable to customers." : "New products need at least 1 in stock so they are available to customers after saving."}</p>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">2. Product details</p>
                <p className="mt-1 text-xs text-muted-foreground">Organize the product and add the information shoppers need to choose it.</p>
              </div>
              <CloudinaryMultiUpload images={form.images ?? []} onChange={(images) => setForm({ ...form, images })} folder="products" />
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea data-testid="products-form-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                    <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{dbTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select>
                  {selectedTypeRow ? (
                    <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">{selectedTypeHasExplicitSchema ? "Type-specific options" : "Template fallback options"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {resolvedMetricDefinitions.length > 0 ? resolvedMetricDefinitions.map((metric) => (
                          <span key={metric.key} className="inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{metric.label}</span>
                        )) : <span className="text-xs text-muted-foreground">No option selectors configured for this type.</span>}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-2 content-start">
                  <Label>Fulfillment</Label>
                  <Select value={form.fulfillment_type} onValueChange={(value) => setForm({ ...form, fulfillment_type: value === "digital" ? "digital" : "physical" })}>
                    <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical delivery</SelectItem>
                      <SelectItem value="digital">Digital delivery / access</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Digital products are always delivery-fee free at authoritative checkout.</p>
                </div>
                <div className="grid gap-2 content-start">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                    <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{dbCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Badge</Label>
                  <Select value={form.badge ?? "none"} onValueChange={(value) => setForm({ ...form, badge: value === "none" ? null : value })}>
                    <SelectTrigger className="min-h-11"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>{BADGES.map((badge) => <SelectItem key={badge} value={badge}>{badge === "none" ? "None" : badge}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-border px-3">
                  <Switch checked={form.featured} onCheckedChange={(value) => setForm({ ...form, featured: value })} />
                  <Label>Featured product</Label>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">3. Options</p>
                <p className="mt-1 text-xs text-muted-foreground">These fields follow the selected product type. {customMetricCount > 0 ? `${customMetricCount} custom metric definition${customMetricCount === 1 ? " is" : "s are"} available for this store.` : "Template defaults appear when the type has no custom option schema."}</p>
              </div>
              {resolvedMetricDefinitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No metrics configured for this type yet.</p>
              ) : resolvedMetricDefinitions.map((metric) => {
                const values = form.metric_values[metric.key] ?? (metric.key === "size" ? form.sizes : metric.key === "color" ? form.colors : []);
                const forcedCommercial = isDefaultCommercialMetric(metric.key);
                const commercialEnabled = forcedCommercial || form.commercial_options.some((option) => option.groupKey === metric.key);
                const commercialOptions = form.commercial_options.filter((option) => option.groupKey === metric.key);
                return (
                  <div key={metric.key} className="grid gap-3 rounded-md border border-border/70 p-3">
                    <MetricValueChipInput
                      label={metric.label}
                      values={values}
                      onChange={(nextValues) => updateMetricValue(metric.key, nextValues)}
                      placeholder={metric.key === "size" ? "Add values like Small, 256GB, 15-inch" : metric.key === "color" ? "Add values like Black, Silver, Navy" : "Add metric values"}
                    />
                    {values.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label className="text-xs">Commercial option identity</Label>
                            <p className="mt-1 text-[11px] text-muted-foreground">When enabled, checkout resolves this value by stable ID and derives its price server-side.</p>
                          </div>
                          <Switch
                            checked={commercialEnabled}
                            disabled={forcedCommercial}
                            onCheckedChange={(checked) => setCommercialMetricEnabled(metric.key, values, checked)}
                          />
                        </div>
                        {commercialEnabled ? (
                          <div className="grid gap-2">
                            {values.map((value) => {
                              const option = commercialOptions.find((candidate) => candidate.label.trim().toLowerCase() === value.trim().toLowerCase());
                              return (
                                <div key={`${metric.key}:${value}`} className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3">
                                  <span className="truncate text-xs font-medium text-foreground">{value}</span>
                                  <div>
                                    <Label className="sr-only">Price adjustment for {value}</Label>
                                    <Input
                                      type="number"
                                      step="1"
                                      value={option?.priceDelta ?? 0}
                                      onChange={(event) => {
                                        if (!option) return;
                                        setCommercialOptionDelta(option.id, Number(event.target.value || 0));
                                      }}
                                      aria-label={`Price adjustment for ${value}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            <p className="text-[11px] text-muted-foreground">Adjustments are in BDT and may be zero, positive, or negative. Final unit price cannot go below 0.</p>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </section>

            {formErrors.form ? <p id="products-form-error" role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{formErrors.form}</p> : null}
          </div>

          <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 gap-2 border-t border-border bg-background px-6 py-4 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="min-h-11">Cancel</Button>
            <Button data-testid="products-save-button" onClick={() => void handleSave()} disabled={saving} aria-describedby={formErrors.form ? "products-form-error" : undefined} className="min-h-11">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : editing ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /> Bulk Product Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Upload File (.csv or .xlsx)</p>
                <p className="text-xs text-muted-foreground">Select a structured spreadsheet file to preview and import.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="min-h-11 gap-2"><Download className="h-4 w-4" /> Download Template</Button>
                <Label htmlFor="bulk-file-upload" className="cursor-pointer">
                  <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"><Upload className="h-4 w-4" /> Select File</span>
                  <Input id="bulk-file-upload" data-testid="bulk-file-input" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFileChange} />
                </Label>
              </div>
            </div>

            {importFileName ? <p className="text-xs text-muted-foreground">File: <span className="font-semibold text-foreground">{importFileName}</span></p> : null}
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">Use the template if you are starting fresh. Export CSV first if you want to edit the current live catalog and re-import in the same shape.</div>

            {importRows.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                  <span>Total Rows: <strong className="text-foreground">{importRows.length}</strong></span>
                  <span className="font-semibold text-emerald-600">Valid: {importRows.filter((row) => row.isValid).length}</span>
                  <span className="font-semibold text-destructive">Invalid: {importRows.filter((row) => !row.isValid).length}</span>
                </div>
                <div className="max-h-[350px] overflow-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 border-b border-border bg-muted font-medium text-muted-foreground">
                      <tr><th className="w-10 p-2.5">#</th><th className="w-24 p-2.5">Status</th><th className="p-2.5">Name</th><th className="p-2.5">Price</th><th className="p-2.5">Category</th><th className="p-2.5">Stock</th><th className="p-2.5">Validation Errors</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {importRows.map((row) => (
                        <tr key={row.rowIndex} className={row.isValid ? "hover:bg-muted/20" : "bg-destructive/5 hover:bg-destructive/10"}>
                          <td className="p-2.5 text-muted-foreground">{row.rowIndex}</td>
                          <td className="p-2.5">{row.isValid ? <Badge className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600 hover:bg-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> Valid</Badge> : <Badge variant="destructive" className="gap-1 text-[10px]"><XCircle className="h-3 w-3" /> Invalid</Badge>}</td>
                          <td className="max-w-[150px] truncate p-2.5 font-medium text-foreground">{row.name || <span className="italic text-muted-foreground">Empty</span>}</td>
                          <td className="p-2.5 text-foreground">{row.price > 0 ? `BDT ${row.price}` : <span className="font-mono text-destructive">0</span>}</td>
                          <td className="p-2.5 text-muted-foreground">{row.category}</td>
                          <td className="p-2.5 text-muted-foreground">{row.stock}</td>
                          <td className="p-2.5">{row.errors.length > 0 ? <div className="flex flex-wrap gap-1">{row.errors.map((error, index) => <Badge key={index} variant="outline" className="border-destructive/40 bg-destructive/5 text-[10px] text-destructive">{error}</Badge>)}</div> : <span className="text-[11px] text-emerald-600">Ready</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} className="min-h-11">Cancel</Button>
            <Button data-testid="products-execute-import-button" onClick={handleExecuteImport} disabled={importing || importRows.filter((row) => row.isValid).length === 0} className="min-h-11 gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Import {importRows.filter((row) => row.isValid).length} Valid Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmationDialog}
    </div>
  );
};

export default AdminProducts;
