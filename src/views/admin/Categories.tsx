import { useAuth } from "@/hooks/auth-context";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, FolderTree, Layers, Image as ImageIcon } from "lucide-react";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import type { Json } from "@/integrations/supabase/types";
import {
  getTemplateDefaultMetricKeys,
  getTemplateDefaultProductMetrics,
  mergeMetricDefinitions,
  normalizeMetricDefinitions,
  normalizeMetricLabel,
  normalizeProductMetricKey,
  type ProductMetricDefinition,
} from "@/lib/cms/product-metrics";
import {
  fetchStoreProductTypes,
  formatTaxonomyError,
  notifyProductTaxonomyUpdated,
  saveStoreProductType,
} from "@/lib/cms/product-taxonomy";
import { refreshEntireStorefrontCache, refreshStorefrontContentCache, refreshStorefrontTaxonomyCache } from "@/lib/storefront-cache-client";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

interface ProductType {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
  metric_schema?: unknown;
}

type MetricsCatalogState = {
  customMetrics: ProductMetricDefinition[];
};

function describeTypeMetricMode(metricSchema: unknown) {
  if (!Array.isArray(metricSchema)) {
    return {
      summary: "Template fallback",
      detail: "This type still follows the template default option fields until you customize it.",
    };
  }

  const definitions = normalizeMetricDefinitions(metricSchema);
  if (definitions.length === 0) {
    return {
      summary: "No option selectors",
      detail: "Products under this type will not show Size, Color, or custom option pickers unless you add them back.",
    };
  }

  return {
    summary: "Custom type options",
    detail: "Only the selected metrics below will appear on product forms and storefront option selectors for this type.",
  };
}

const AdminCategories = () => {
  const { activeStoreId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [customData, setCustomData] = useState<Record<string, any>>({ categories: {}, types: {} });
  const [metricsCatalog, setMetricsCatalog] = useState<MetricsCatalogState>({ customMetrics: [] });
  const [storefrontTemplateId, setStorefrontTemplateId] = useState<string>("general-catalog");
  const [loading, setLoading] = useState(true);

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", parent_id: "none", sort_order: 0, image_url: "", tagline: "" });
  const [savingCat, setSavingCat] = useState(false);

  // Type dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    sort_order: 0,
    image_url: "",
    tagline: "",
    selectedMetricKeys: [] as string[],
    customMetricName: "",
  });
  const [savingType, setSavingType] = useState(false);

  const availableMetricDefinitions = mergeMetricDefinitions(
    getTemplateDefaultProductMetrics(storefrontTemplateId),
    metricsCatalog.customMetrics,
  );
  const defaultMetricKeys = getTemplateDefaultMetricKeys(storefrontTemplateId);

  const applyFetchedData = useCallback((nextData: {
    categories: Category[];
    types: ProductType[];
    customData: Record<string, any>;
    metricsCatalog: MetricsCatalogState;
    storefrontTemplateId: string;
  }) => {
    setCategories(nextData.categories);
    setTypes(nextData.types);
    setCustomData(nextData.customData);
    setMetricsCatalog(nextData.metricsCatalog);
    setStorefrontTemplateId(nextData.storefrontTemplateId);
  }, []);

  const fetchData = useCallback(async () => {
    const emptyData = {
      categories: [] as Category[],
      types: [] as ProductType[],
      customData: { categories: {}, types: {} } as Record<string, any>,
      metricsCatalog: { customMetrics: [] } as MetricsCatalogState,
      storefrontTemplateId: "general-catalog",
    };

    if (!activeStoreId) {
      return emptyData;
    }

    const [catRes, typeRes, settingsRes] = await Promise.all([
      supabase.from("product_categories").select("*").eq("store_id", activeStoreId as string).order("sort_order"),
      fetchStoreProductTypes(activeStoreId as string),
      supabase.from("site_settings").select("key, value").eq("store_id", activeStoreId as string).in("key", ["categories_custom_data", "product_metrics_catalog", "storefront_profile"]),
    ]);

    if (catRes.error) throw catRes.error;
    if (settingsRes.error) throw settingsRes.error;

    const settingsRows = settingsRes.data ?? [];
    const categoriesCustomData = settingsRows.find((row) => row.key === "categories_custom_data")?.value;
    const productMetricsCatalog = settingsRows.find((row) => row.key === "product_metrics_catalog")?.value;
    const storefrontProfile = settingsRows.find((row) => row.key === "storefront_profile")?.value as Record<string, unknown> | undefined;

    return {
      categories: (catRes.data as Category[]) ?? [],
      types: (typeRes as ProductType[]) ?? [],
      customData: categoriesCustomData ? categoriesCustomData as Record<string, any> : { categories: {}, types: {} },
      metricsCatalog: {
        customMetrics: normalizeMetricDefinitions(
          typeof productMetricsCatalog === "object" && productMetricsCatalog
            ? (productMetricsCatalog as Record<string, unknown>).customMetrics
            : [],
        ),
      },
      storefrontTemplateId:
        typeof storefrontProfile?.template_id === "string"
          ? storefrontProfile.template_id
          : "general-catalog",
    };
  }, [activeStoreId]);

  const saveCustomData = async (updatedData: any) => {
    if (!activeStoreId) {
      toast.error("Select a store before saving category settings.");
      return;
    }

    setCustomData(updatedData);
    await supabase.from("site_settings").upsert({
      store_id: activeStoreId,
      key: "categories_custom_data",
      value: updatedData
    }, { onConflict: "store_id,key" });
    await refreshStorefrontContentCache(supabase, activeStoreId);
  };

  const saveMetricsCatalog = async (updatedCatalog: MetricsCatalogState) => {
    if (!activeStoreId) {
      toast.error("Select a store before saving metric settings.");
      return;
    }

    setMetricsCatalog(updatedCatalog);
    await supabase.from("site_settings").upsert({
      store_id: activeStoreId,
      key: "product_metrics_catalog",
      value: updatedCatalog as unknown as Json,
    }, { onConflict: "store_id,key" });
    await refreshStorefrontTaxonomyCache(supabase, activeStoreId);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!activeStoreId) {
        setCategories([]);
        setTypes([]);
        setCustomData({ categories: {}, types: {} });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextData = await fetchData();
        if (!active) return;
        applyFetchedData(nextData);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load categories and types:", error);
        toast.error(formatTaxonomyError(error));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [activeStoreId, applyFetchedData, fetchData]);

  const reloadData = useCallback(async () => {
    const nextData = await fetchData();
    applyFetchedData(nextData);
    return nextData;
  }, [applyFetchedData, fetchData]);

  useEffect(() => {
    setCatDialogOpen(false);
    setEditingCat(null);
    setCatForm({ name: "", parent_id: "none", sort_order: 0, image_url: "", tagline: "" });
    setSavingCat(false);
    setTypeDialogOpen(false);
    setEditingType(null);
    setTypeForm({ name: "", sort_order: 0, image_url: "", tagline: "", selectedMetricKeys: [], customMetricName: "" });
    setSavingType(false);
  }, [activeStoreId]);

  // --- Category CRUD ---
  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", parent_id: "none", sort_order: categories.length + 1, image_url: "", tagline: "" });
    setCatDialogOpen(true);
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    const custom = customData.categories?.[c.name] ?? {};
    setCatForm({ 
      name: c.name, 
      parent_id: c.parent_id ?? "none", 
      sort_order: c.sort_order,
      image_url: custom.image_url ?? "",
      tagline: custom.tagline ?? ""
    });
    setCatDialogOpen(true);
  };

  const saveCat = async () => {
    if (!activeStoreId) {
      toast.error("Select a store before saving categories.");
      return;
    }

    if (!catForm.name.trim()) { toast.error("Name is required"); return; }
    setSavingCat(true);
    const payload = {
      name: catForm.name.trim(),
      parent_id: catForm.parent_id === "none" ? null : catForm.parent_id,
      sort_order: catForm.sort_order,
    };

    if (editingCat) {
      const { error } = await supabase.from("product_categories").update(payload).eq("id", editingCat.id).eq("store_id", activeStoreId as string);
      if (error) toast.error("Failed to update");
      else {
        toast.success("Category updated");
        const updated = {
          ...customData,
          categories: {
            ...customData.categories,
            [catForm.name.trim()]: {
              image_url: catForm.image_url,
              tagline: catForm.tagline
            }
          }
        };
        await saveCustomData(updated);
        await refreshEntireStorefrontCache(supabase, activeStoreId);
      }
    } else {
      const { error } = await supabase.from("product_categories").insert({
        ...payload,
        store_id: activeStoreId,
      });
      if (error) toast.error("Failed to add");
      else {
        toast.success("Category added");
        const updated = {
          ...customData,
          categories: {
            ...customData.categories,
            [catForm.name.trim()]: {
              image_url: catForm.image_url,
              tagline: catForm.tagline
            }
          }
        };
        await saveCustomData(updated);
        await refreshEntireStorefrontCache(supabase, activeStoreId);
      }
    }
    setSavingCat(false);
    setCatDialogOpen(false);
    await reloadData();
    notifyProductTaxonomyUpdated();
  };

  const deleteCat = async (id: string) => {
    if (!activeStoreId) {
      toast.error("Select a store before deleting categories.");
      return;
    }

    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("product_categories").delete().eq("id", id).eq("store_id", activeStoreId as string);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Category deleted");
      await refreshEntireStorefrontCache(supabase, activeStoreId);
      await reloadData();
      notifyProductTaxonomyUpdated();
    }
  };

  // --- Type CRUD ---
  const openNewType = () => {
    setEditingType(null);
    setTypeForm({
      name: "",
      sort_order: types.length + 1,
      image_url: "",
      tagline: "",
      selectedMetricKeys: defaultMetricKeys,
      customMetricName: "",
    });
    setTypeDialogOpen(true);
  };

  const openEditType = (t: ProductType) => {
    setEditingType(t);
    const custom = customData.types?.[t.name] ?? {};
    const selectedMetrics = Array.isArray(t.metric_schema)
      ? normalizeMetricDefinitions(t.metric_schema).map((metric) => metric.key)
      : defaultMetricKeys;
    setTypeForm({ 
      name: t.name, 
      sort_order: t.sort_order,
      image_url: custom.image_url ?? "",
      tagline: custom.tagline ?? "",
      selectedMetricKeys: selectedMetrics,
      customMetricName: "",
    });
    setTypeDialogOpen(true);
  };

  const saveType = async () => {
    if (!activeStoreId) {
      toast.error("Select a store before saving product types.");
      return;
    }

    if (!typeForm.name.trim()) { toast.error("Name is required"); return; }
    setSavingType(true);
    const selectedMetricDefinitions = availableMetricDefinitions.filter((metric) => typeForm.selectedMetricKeys.includes(metric.key));
    const payload = {
      name: typeForm.name.trim(),
      sort_order: typeForm.sort_order,
      metric_schema: selectedMetricDefinitions.map((metric) => ({
        key: metric.key,
        label: metric.label,
      })),
    };

    const { error, metricSchemaPersisted } = await saveStoreProductType({
      storeId: activeStoreId as string,
      editingTypeId: editingType?.id,
      payload,
    });

    if (error) {
      toast.error(`Failed to save type: ${formatTaxonomyError(error)}`);
    } else {
      if (editingType) {
        toast.success("Type updated");
      } else {
        toast.success("Type added");
      }
      const updated = {
        ...customData,
        types: {
          ...customData.types,
          [typeForm.name.trim()]: {
            image_url: typeForm.image_url,
            tagline: typeForm.tagline
          }
        }
      };
      await saveCustomData(updated);
      if (!metricSchemaPersisted && selectedMetricDefinitions.length > 0) {
        toast.message("Type saved, but custom metrics will stay unavailable until the latest database migration is applied.");
      }
      await refreshEntireStorefrontCache(supabase, activeStoreId);
      await reloadData();
      notifyProductTaxonomyUpdated();
    }
    setSavingType(false);
    setTypeDialogOpen(false);
  };

  const deleteType = async (id: string) => {
    if (!activeStoreId) {
      toast.error("Select a store before deleting product types.");
      return;
    }

    if (!confirm("Delete this type?")) return;
    const { error } = await supabase.from("product_types").delete().eq("id", id).eq("store_id", activeStoreId as string);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Type deleted");
      await refreshStorefrontTaxonomyCache(supabase, activeStoreId);
      await reloadData();
      notifyProductTaxonomyUpdated();
    }
  };

  const toggleTypeMetric = (metricKey: string) => {
    setTypeForm((current) => ({
      ...current,
      selectedMetricKeys: current.selectedMetricKeys.includes(metricKey)
        ? current.selectedMetricKeys.filter((value) => value !== metricKey)
        : [...current.selectedMetricKeys, metricKey],
    }));
  };

  const addCustomMetric = async () => {
    const key = normalizeProductMetricKey(typeForm.customMetricName);
    if (!key) {
      toast.error("Enter a metric name first.");
      return;
    }

    if (availableMetricDefinitions.some((metric) => metric.key === key)) {
      setTypeForm((current) => ({
        ...current,
        customMetricName: "",
        selectedMetricKeys: current.selectedMetricKeys.includes(key)
          ? current.selectedMetricKeys
          : [...current.selectedMetricKeys, key],
      }));
      return;
    }

    const updatedCatalog: MetricsCatalogState = {
      customMetrics: [
        ...metricsCatalog.customMetrics,
        {
          key,
          label: typeForm.customMetricName.trim() || normalizeMetricLabel(key),
          kind: "multi_value_text",
          source: "store",
        },
      ],
    };

    await saveMetricsCatalog(updatedCatalog);
    setTypeForm((current) => ({
      ...current,
      customMetricName: "",
      selectedMetricKeys: [...current.selectedMetricKeys, key],
    }));
  };

  // helpers
  const topCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);
  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    return categories.find((c) => c.id === parentId)?.name ?? "-";
  };

  if (loading && categories.length === 0 && types.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Categories & Types</h1>
        <p className="text-sm text-muted-foreground">Manage product categories, product types, and store-specific product metrics.</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories" className="gap-2"><FolderTree className="h-4 w-4" />Categories</TabsTrigger>
          <TabsTrigger value="types" className="gap-2"><Layers className="h-4 w-4" />Types</TabsTrigger>
        </TabsList>

        {/* ---- CATEGORIES TAB ---- */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewCat} className="gap-2"><Plus className="h-4 w-4" />Add Category</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">All Categories</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Preview</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Tagline</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No categories yet</TableCell></TableRow>
                  ) : (
                    categories.map((c) => {
                      const custom = customData.categories?.[c.name] ?? {};
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            {custom.image_url ? (
                              <img src={custom.image_url} alt={c.name} className="h-8 w-8 rounded-full object-cover border border-border bg-muted" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <FolderTree className="h-4 w-4" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {c.parent_id && <span className="mr-2 text-muted-foreground">↳</span>}
                            {c.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{getParentName(c.parent_id)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                            {custom.tagline || "-"}
                          </TableCell>
                          <TableCell>{c.sort_order}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCat(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteCat(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Subcategory overview */}
          {topCategories.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Category Hierarchy</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {topCategories.map((parent) => {
                  const children = getChildren(parent.id);
                  return (
                    <div key={parent.id} className="rounded-lg border border-border p-3">
                      <p className="font-heading text-sm font-semibold text-foreground">{parent.name}</p>
                      {children.length > 0 ? (
                        <ul className="mt-1 ml-4 space-y-0.5">
                          {children.map((child) => (
                            <li key={child.id} className="text-sm text-muted-foreground">↳ {child.name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground italic">No subcategories</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---- TYPES TAB ---- */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewType} className="gap-2"><Plus className="h-4 w-4" />Add Type</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">All Product Types</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Preview</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Tagline</TableHead>
                    <TableHead>Metrics</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No types yet</TableCell></TableRow>
                  ) : (
                    types.map((t) => {
                      const custom = customData.types?.[t.name] ?? {};
                      const metricDefinitions = normalizeMetricDefinitions(t.metric_schema);
                      const metricMode = describeTypeMetricMode(t.metric_schema);
                      return (
                        <TableRow key={t.id}>
                          <TableCell>
                            {custom.image_url ? (
                              <img src={custom.image_url} alt={t.name} className="h-8 w-8 rounded-full object-cover border border-border bg-muted" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Layers className="h-4 w-4" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                            {custom.tagline || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                                  {metricMode.summary}
                                </span>
                                {metricDefinitions.length === 0 ? null : metricDefinitions.map((metric) => (
                                  <span key={metric.key} className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                                    {metric.label}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[11px] leading-4 text-muted-foreground">
                                {metricMode.detail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{t.sort_order}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditType(t)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteType(t.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Parent Category</Label>
              <Select value={catForm.parent_id} onValueChange={(v) => setCatForm({ ...catForm, parent_id: v })}>
                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {topCategories
                    .filter((c) => c.id !== editingCat?.id)
                    .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Tagline / Description</Label>
              <Input value={catForm.tagline} placeholder="Smart casual essentials" onChange={(e) => setCatForm({ ...catForm, tagline: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Sort Order</Label>
              <Input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Custom Category Image (replaces default icon)</Label>
              <CloudinaryUpload
                value={catForm.image_url}
                onChange={(url) => setCatForm({ ...catForm, image_url: url })}
                folder="categories"
                accept="image/*"
                label="Upload Category Image"
              />
              {catForm.image_url && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border p-2 bg-secondary/20">
                  <img src={catForm.image_url} alt="Preview" className="h-10 w-10 rounded-full object-cover" />
                  <span className="text-xs text-muted-foreground truncate flex-1">{catForm.image_url}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCat} disabled={savingCat}>
              {savingCat && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCat ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Type" : "Add Type"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Tagline / Description</Label>
              <Input value={typeForm.tagline} placeholder="Smart casual essentials" onChange={(e) => setTypeForm({ ...typeForm, tagline: e.target.value })} />
            </div>
            <div className="grid gap-3 rounded-lg border border-border p-4">
              <div>
                <Label>Metrics for this type</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Size and Color start selected for convenience, but you can turn them off. Whatever stays selected here becomes the product option fields for this type.
                </p>
                <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    {describeTypeMetricMode(typeForm.selectedMetricKeys.length > 0
                      ? availableMetricDefinitions.filter((metric) => typeForm.selectedMetricKeys.includes(metric.key)).map((metric) => ({
                          key: metric.key,
                          label: metric.label,
                        }))
                      : []).summary}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {describeTypeMetricMode(typeForm.selectedMetricKeys.length > 0
                      ? availableMetricDefinitions.filter((metric) => typeForm.selectedMetricKeys.includes(metric.key)).map((metric) => ({
                          key: metric.key,
                          label: metric.label,
                        }))
                      : []).detail}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableMetricDefinitions.map((metric) => {
                  const selected = typeForm.selectedMetricKeys.includes(metric.key);
                  const isTemplateDefault = metric.source === "template";

                  return (
                    <button
                      key={metric.key}
                      type="button"
                      onClick={() => toggleTypeMetric(metric.key)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {metric.label}
                      {isTemplateDefault ? " • Default" : ""}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={typeForm.customMetricName}
                  placeholder="Add custom metric name"
                  onChange={(e) => setTypeForm({ ...typeForm, customMetricName: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={() => void addCustomMetric()}>
                  Add Custom
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Sort Order</Label>
              <Input type="number" value={typeForm.sort_order} onChange={(e) => setTypeForm({ ...typeForm, sort_order: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Custom Type Image (replaces default icon)</Label>
              <CloudinaryUpload
                value={typeForm.image_url}
                onChange={(url) => setTypeForm({ ...typeForm, image_url: url })}
                folder="types"
                accept="image/*"
                label="Upload Type Image"
              />
              {typeForm.image_url && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border p-2 bg-secondary/20">
                  <img src={typeForm.image_url} alt="Preview" className="h-10 w-10 rounded-full object-cover" />
                  <span className="text-xs text-muted-foreground truncate flex-1">{typeForm.image_url}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveType} disabled={savingType}>
              {savingType && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingType ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;


