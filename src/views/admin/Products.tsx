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
import { Plus, Pencil, Trash2, Loader2, Package, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, FolderTree, X } from "lucide-react";
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
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
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
            className="h-8 min-w-[140px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImporting(true);

    try {
      let rawRecords: Record<string, string>[] = [];
      if (file.name.endsWith(".xlsx")) {
        const buffer = await file.arrayBuffer();
        rawRecords = await parseXlsxBuffer(buffer);
      } else {
        const text = await file.text();
        rawRecords = parseCsvText(text);
      }

      const validated = rawRecords.map((raw, idx) => validateImportRow(raw, idx + 1));
      setImportRows(validated);
      if (validated.length === 0) {
        toast.error("No data rows found in file");
      }
    } catch (err) {
      console.error("Failed to parse import file:", err);
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

    const validRows = importRows.filter((r) => r.isValid);
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
    } catch (err) {
      console.error("Failed to bulk import products:", err);
      toast.error(err instanceof Error ? err.message : "Failed to import products");
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

      if (categoriesRes.error || settingsRes.error) {
        throw categoriesRes.error || settingsRes.error;
      }

      setDbCategories((categoriesRes.data ?? []).map((r: any) => r.name));
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
      if (!options?.silent) {
        toast.error(`Failed to load product data: ${formatTaxonomyError(error)}`);
      }
    }
  }, [activeStoreId]);

  useEffect(() => {
    void refreshCatalogData();
  }, [refreshCatalogData]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshVisibleCatalog = () => {
      void refreshCatalogData({ silent: true });
      if (activeStoreId) {
        void invalidateAdminProductCollections(queryClient, activeStoreId);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshVisibleCatalog();
      }
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
    setShopPageSettings((current) => ({
      ...current,
      [field]: value,
    }));
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
        .upsert({
          store_id: activeStoreId,
          key: "shop_page",
          value: payload as unknown as Json,
        }, { onConflict: "store_id,key" });

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
      const p = await fetchAdminProductDetail(storeId, product.id);
      if (activeStoreIdRef.current !== storeId) return;
      createProductIdRef.current = null;
      setEditing(p);
      setFormErrors({});
      setForm({
        name: p.name,
        price: p.price,
        original_price: p.original_price,
        image_url: p.image_url,
        images: p.images || [],
        description: p.description,
        sizes: p.sizes,
        colors: p.colors,
        category: p.category,
        type: p.type,
        featured: p.featured,
        badge: p.badge,
        stock: p.stock,
        metric_values: normalizeMetricValues(p.metric_values),
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

  const updateMetricValue = (metricKey: string, nextValues: string[]) => {
    setForm((current) => ({
      ...current,
      sizes: metricKey === "size" ? nextValues : current.sizes,
      colors: metricKey === "color" ? nextValues : current.colors,
      metric_values: {
        ...current.metric_values,
        [metricKey]: nextValues,
      },
    }));
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
      store_id: storeId,
    };

    try {
      let productId = editingAtSubmit?.id ?? createProductId;
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

      await refreshStorefrontProductCache(supabase, storeId, {
        products: [{ id: productId, name: payload.name }],
      });
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
      if (activeStoreIdRef.current === storeId && saveOperationRef.current === operationId) {
        setSaving(false);
      }
    }
  };

  const handleDelete = async (product: AdminProductListItem) => {
    if (!activeStoreId) {
      toast.error("Select a store before deleting products.");
      return;
    }

    const context = {
      storeId: activeStoreId,
      entityId: product.id,
      entityName: product.name,
    };
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

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", context.entityId)
      .eq("store_id", context.storeId);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Products & Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage your store products, taxonomy categories, bulk import, and CSV exports.</p>
        </div>
        {activeTab === "catalog" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" data-testid="products-export-button" onClick={() => void handleExportCatalog()} disabled={exporting} className="gap-2 text-xs">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
            </Button>
            <Button variant="outline" data-testid="products-bulk-import-button" onClick={() => setImportDialogOpen(true)} className="gap-2 text-xs">
              <Upload className="h-4 w-4" /> Bulk Import
            </Button>
            <Button data-testid="products-add-button" onClick={openNew} className="gap-2 text-xs">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })} className="space-y-6">
        <TabsList className="bg-secondary/40 p-1 border border-border">
          <TabsTrigger value="catalog" className="gap-2">
            <Package className="h-4 w-4" />
            All Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Categories & Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Catalog size</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-foreground">{productStats.data?.catalogSize ?? 0}</CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ready to sell</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-foreground">{productStats.data?.readyToSell ?? 0}</CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Featured / out of stock</CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-medium text-foreground">
                <span className="text-2xl">{productStats.data?.featured ?? 0}</span> featured · <span className="text-2xl">{productStats.data?.outOfStock ?? 0}</span> out
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Catalog note on Shop page</CardTitle>
              <p className="text-sm text-muted-foreground">
                This optional section appears below the main shop results. Use it only when you want to explain the catalog, buying flow, or what shoppers should know.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/20 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Show catalog note section</p>
                  <p className="text-xs text-muted-foreground">Turn this off if the extra catalog context feels unnecessary.</p>
                </div>
                <Switch
                  checked={shopPageSettings.catalog_note_visible !== false}
                  onCheckedChange={(checked) => updateCatalogNoteSetting("catalog_note_visible", checked)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Section title</Label>
                <Input
                  value={shopPageSettings.catalog_note_title ?? ""}
                  placeholder="A quick note before shoppers keep browsing"
                  onChange={(event) => updateCatalogNoteSetting("catalog_note_title", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Section description</Label>
                <Textarea
                  value={shopPageSettings.catalog_note_description ?? ""}
                  placeholder="Explain what this catalog includes, how pricing works, or what visitors should know before they continue shopping."
                  rows={3}
                  onChange={(event) => updateCatalogNoteSetting("catalog_note_description", event.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void saveCatalogNoteSettings()} disabled={savingCatalogNoteSettings} className="gap-2">
                  {savingCatalogNoteSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Shop Note
                </Button>
              </div>
            </CardContent>
          </Card>

          <Input
            data-testid="products-search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {productPages.isLoading && products.length === 0 ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4 rounded-xl border border-dashed border-border bg-card/50 mt-8">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Package className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-bold text-foreground mb-2">{debouncedSearch ? "No products match your search" : "Your store catalog is empty"}</h3>
              <p className="text-muted-foreground max-w-sm mb-8 text-sm">
                {debouncedSearch
                  ? "Try a different product name."
                  : "Add your first product to start selling. Upload images, set prices, and manage inventory right from here."}
              </p>
              {!debouncedSearch ? (
                <Button onClick={openNew} className="gap-2 px-8 shadow-lg shadow-primary/20 transition-all hover:scale-105 rounded-full">
                  <Plus className="h-4 w-4" /> Add Your First Product
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <Card key={p.id} className="border-border overflow-hidden">
                  <div className="relative aspect-square overflow-hidden bg-secondary">
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    {!p.is_available && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Badge variant="destructive">Out of Stock</Badge>
                      </div>
                    )}
                    {p.badge && (
                      <Badge className="absolute left-2 top-2" variant={p.badge === "Sale" ? "destructive" : "default"}>
                        {p.badge}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading text-sm font-semibold text-foreground">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.type} - {p.category}</p>
                      </div>
                      <p className="font-heading text-sm font-bold text-primary">BDT {p.price}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void openEdit(p)} disabled={loadingProductId === p.id}>
                          {loadingProductId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => void handleDelete(p)}
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {productPages.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => void productPages.fetchNextPage()}
                disabled={productPages.isFetchingNextPage}
                className="gap-2"
              >
                {productPages.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more products
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <AdminCategories />
        </TabsContent>
      </Tabs>

      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (saving && !open) return;
          setDialogOpen(open);
          if (!open) setFormErrors({});
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" aria-busy={saving}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="products-form-name">Name *</Label>
              <Input
                ref={productNameRef}
                id="products-form-name"
                data-testid="products-form-name"
                value={form.name}
                aria-invalid={Boolean(formErrors.name)}
                aria-describedby={formErrors.name ? "products-form-name-error" : undefined}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  clearProductError("name");
                }}
              />
              {formErrors.name ? <p id="products-form-name-error" role="alert" className="text-sm text-destructive">{formErrors.name}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="products-form-price">Price (BDT) *</Label>
                <Input
                  ref={productPriceRef}
                  id="products-form-price"
                  data-testid="products-form-price"
                  type="number"
                  value={form.price}
                  aria-invalid={Boolean(formErrors.price)}
                  aria-describedby={formErrors.price ? "products-form-price-error" : undefined}
                  onChange={(e) => {
                    setForm({ ...form, price: Number(e.target.value) });
                    clearProductError("price");
                  }}
                />
                {formErrors.price ? <p id="products-form-price-error" role="alert" className="text-sm text-destructive">{formErrors.price}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label>Original Price</Label>
                <Input type="number" value={form.original_price ?? ""} onChange={(e) => setForm({ ...form, original_price: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Main Image *</Label>
              <CloudinaryUpload
                value={form.image_url}
                onChange={(url) => {
                  setForm({ ...form, image_url: url });
                  clearProductError("image_url");
                }}
                folder="products"
                label="Upload main image"
                inputTestId="products-form-image-url"
              />
              {formErrors.image_url ? <p id="products-form-image-error" role="alert" className="text-sm text-destructive">{formErrors.image_url}</p> : null}
            </div>
            <CloudinaryMultiUpload
              images={form.images ?? []}
              onChange={(images) => setForm({ ...form, images })}
              folder="products"
            />
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea data-testid="products-form-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dbTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedTypeRow ? (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                      {selectedTypeHasExplicitSchema ? "Type-specific options" : "Template fallback options"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {resolvedMetricDefinitions.length > 0 ? resolvedMetricDefinitions.map((metric) => (
                        <span key={metric.key} className="inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {metric.label}
                        </span>
                      )) : (
                        <span className="text-xs text-muted-foreground">No option selectors configured for this type.</span>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dbCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="products-form-stock">Stock *</Label>
                <Input
                  ref={productStockRef}
                  id="products-form-stock"
                  data-testid="products-form-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock}
                  aria-invalid={Boolean(formErrors.stock)}
                  aria-describedby={formErrors.stock ? "products-form-stock-error" : undefined}
                  onChange={(e) => {
                    setForm({ ...form, stock: Number(e.target.value) });
                    clearProductError("stock");
                  }}
                />
                {formErrors.stock ? <p id="products-form-stock-error" role="alert" className="text-sm text-destructive">{formErrors.stock}</p> : null}
                <p className="text-xs text-muted-foreground">
                  {editing
                    ? "Set stock to 0 to mark this product sold out and unavailable to customers."
                    : "New products need at least 1 in stock so they are available to customers after saving."}
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Badge</Label>
                <Select value={form.badge ?? "none"} onValueChange={(v) => setForm({ ...form, badge: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {BADGES.map((b) => <SelectItem key={b} value={b}>{b === "none" ? "None" : b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border border-border p-4">
              <div>
                <Label>Type-based metrics</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  These fields follow the selected type. Template defaults only appear when the selected type does not define its own metric choices yet.
                </p>
              </div>
              {resolvedMetricDefinitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No metrics configured for this type yet.</p>
              ) : (
                resolvedMetricDefinitions.map((metric) => (
                  <MetricValueChipInput
                    key={metric.key}
                    label={metric.label}
                    values={form.metric_values[metric.key] ?? (metric.key === "size" ? form.sizes : metric.key === "color" ? form.colors : [])}
                    onChange={(nextValues) => updateMetricValue(metric.key, nextValues)}
                    placeholder={
                      metric.key === "size"
                        ? "Add values like Small, 256GB, 15-inch"
                        : metric.key === "color"
                          ? "Add values like Black, Silver, Navy"
                          : "Add metric values"
                    }
                  />
                ))
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              <Label>Featured product</Label>
            </div>
            {formErrors.form ? (
              <p id="products-form-error" role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {formErrors.form}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button data-testid="products-save-button" onClick={() => void handleSave()} disabled={saving} aria-describedby={formErrors.form ? "products-form-error" : undefined}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : `${editing ? "Update" : "Add"} Product`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" /> Bulk Product Import
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4 bg-card/50">
              <div>
                <p className="text-sm font-medium text-foreground">Upload File (.csv or .xlsx)</p>
                <p className="text-xs text-muted-foreground">Select a structured spreadsheet file to preview and import.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" /> Download Template
                </Button>
                <Label htmlFor="bulk-file-upload" className="cursor-pointer">
                  <span className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 gap-2">
                    <Upload className="h-3.5 w-3.5" /> Select File
                  </span>
                  <Input
                    id="bulk-file-upload"
                    data-testid="bulk-file-input"
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </Label>
              </div>
            </div>

            {importFileName ? (
              <p className="text-xs text-muted-foreground">File: <span className="font-semibold text-foreground">{importFileName}</span></p>
            ) : null}

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Use the template if the merchant is starting fresh. Export CSV first if they want to edit the current live catalog and re-import in the same shape.
            </div>

            {importRows.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-md border border-border">
                  <span>Total Rows: <strong className="text-foreground">{importRows.length}</strong></span>
                  <span className="text-emerald-600 font-semibold">Valid: {importRows.filter((r) => r.isValid).length}</span>
                  <span className="text-destructive font-semibold">Invalid: {importRows.filter((r) => !r.isValid).length}</span>
                </div>

                <div className="max-h-[350px] overflow-auto border border-border rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted text-muted-foreground font-medium border-b border-border">
                      <tr>
                        <th className="p-2.5 w-10">#</th>
                        <th className="p-2.5 w-24">Status</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Price</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Stock</th>
                        <th className="p-2.5">Validation Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {importRows.map((row) => (
                        <tr key={row.rowIndex} className={row.isValid ? "hover:bg-muted/20" : "bg-destructive/5 hover:bg-destructive/10"}>
                          <td className="p-2.5 text-muted-foreground">{row.rowIndex}</td>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 text-[10px]">
                                <CheckCircle2 className="h-3 w-3" /> Valid
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1 text-[10px]">
                                <XCircle className="h-3 w-3" /> Invalid
                              </Badge>
                            )}
                          </td>
                          <td className="p-2.5 font-medium text-foreground max-w-[150px] truncate">{row.name || <span className="text-muted-foreground italic">Empty</span>}</td>
                          <td className="p-2.5 text-foreground">{row.price > 0 ? `BDT ${row.price}` : <span className="text-destructive font-mono">0</span>}</td>
                          <td className="p-2.5 text-muted-foreground">{row.category}</td>
                          <td className="p-2.5 text-muted-foreground">{row.stock}</td>
                          <td className="p-2.5">
                            {row.errors.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.errors.map((err, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] border-destructive/40 text-destructive bg-destructive/5">
                                    {err}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-600 text-[11px]">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button
              data-testid="products-execute-import-button"
              onClick={handleExecuteImport}
              disabled={importing || importRows.filter((r) => r.isValid).length === 0}
              className="gap-2"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Import {importRows.filter((r) => r.isValid).length} Valid Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmationDialog}
    </div>
  );
};

export default AdminProducts;
