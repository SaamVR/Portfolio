import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Package, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import CloudinaryMultiUpload from "@/components/admin/CloudinaryMultiUpload";
import {
  parseCsvText,
  parseXlsxBuffer,
  validateImportRow,
  buildStoreBatchInsertPayload,
  buildProductsExportCsv,
  SAMPLE_TEMPLATE_CSV,
  type ParsedImportRow,
} from "@/lib/cms/product-import";

type Product = Tables<"products">;

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
  stock: 0,
};

const BADGES = ["none", "New", "Sale"];

const AdminProducts = () => {
  const { role , activeStoreId} = useAuth();
  const isAdmin = role === "admin";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dbTypes, setDbTypes] = useState<string[]>([]);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);

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

  const handleExportCatalog = () => {
    if (products.length === 0) {
      toast.error("There are no products to export yet.");
      return;
    }

    const csv = buildProductsExportCsv(products);
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
      const productRows = await fetchProducts();
      setProducts(productRows);
    } catch (err) {
      console.error("Failed to bulk import products:", err);
      toast.error(err instanceof Error ? err.message : "Failed to import products");
    } finally {
      setImporting(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    let nextProducts: Product[] = [];

    if (!activeStoreId) {
      return nextProducts;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", activeStoreId as string)
      .order("created_at", { ascending: false });

    if (error) throw error;
    nextProducts = data ?? [];
    return nextProducts;
  }, [activeStoreId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!activeStoreId) {
        setProducts([]);
        setDbCategories([]);
        setDbTypes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [productRows, categoriesRes, typesRes] = await Promise.all([
          fetchProducts(),
          supabase.from("product_categories").select("name").eq("store_id", activeStoreId as string).order("sort_order"),
          supabase.from("product_types").select("name").eq("store_id", activeStoreId as string).order("sort_order"),
        ]);

        if (!active) return;
        setProducts(productRows);

        if (categoriesRes.error || typesRes.error) {
          console.error("Failed to load product taxonomy:", categoriesRes.error || typesRes.error);
          setDbCategories([]);
          setDbTypes([]);
          return;
        }

        setDbCategories((categoriesRes.data ?? []).map((r: any) => r.name));
        setDbTypes((typesRes.data ?? []).map((r: any) => r.name));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load products:", error);
        toast.error("Failed to refresh products. Please try again.");
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
  }, [activeStoreId, fetchProducts]);

  useEffect(() => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyProduct);
    setSaving(false);
    setSearch("");
  }, [activeStoreId]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyProduct);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
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
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!activeStoreId) {
      toast.error("Select a store before saving products.");
      return;
    }

    if (!form.name || !form.image_url || form.price <= 0) {
      toast.error("Name, image URL, and price are required");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      images: (form.images ?? []).filter((url) => url.trim() !== ""),
      badge: form.badge || null,
      original_price: form.original_price || null,
      store_id: activeStoreId,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id).eq("store_id", activeStoreId as string);
      if (error) {
        toast.error("Failed to update product");
      } else {
        toast.success("Product updated");
      }
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) {
        toast.error("Failed to add product");
      } else {
        toast.success("Product added");
      }
    }
    setSaving(false);
    setDialogOpen(false);
    void fetchProducts()
      .then((productRows) => {
        setProducts(productRows);
      })
      .catch((error) => {
        console.error("Failed to reload products:", error);
        toast.error("Failed to refresh products. Please try again.");
      });
  };

  const handleDelete = async (id: string) => {
    if (!activeStoreId) {
      toast.error("Select a store before deleting products.");
      return;
    }

    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id).eq("store_id", activeStoreId as string);
    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      fetchProducts();
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const featuredCount = products.filter((product) => product.featured).length;
  const lowOrOutOfStockCount = products.filter((product) => (product.stock ?? 0) <= 0).length;
  const readyToSellCount = products.filter((product) => (product.stock ?? 0) > 0 && product.is_available !== false).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your catalog, import inventory in bulk, and export the live product list when the merchant needs it.</p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-3 lg:justify-end">
          <Button
            variant="outline"
            data-testid="products-export-button"
            onClick={handleExportCatalog}
            className="h-11 justify-center gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            data-testid="products-bulk-import-button"
            onClick={() => setImportDialogOpen(true)}
            className="h-11 justify-center gap-2"
          >
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>
          <Button data-testid="products-add-button" onClick={openNew} className="h-11 justify-center gap-2">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Catalog size</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">{products.length}</CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ready to sell</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">{readyToSellCount}</CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Featured / out of stock</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium text-foreground">
            <span className="text-2xl">{featuredCount}</span> featured · <span className="text-2xl">{lowOrOutOfStockCount}</span> out
          </CardContent>
        </Card>
      </div>

      <Input
        data-testid="products-search"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm"
      />
                      {loading && products.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4 rounded-xl border border-dashed border-border bg-card/50 mt-8">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Package className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-heading font-bold text-foreground mb-2">Your store is empty</h3>
          <p className="text-muted-foreground max-w-sm mb-8 text-sm">
            Add your first product to start selling. You can easily upload images, set prices, and manage inventory right from here.
          </p>
          <Button onClick={openNew} className="gap-2 px-8 shadow-lg shadow-primary/20 transition-all hover:scale-105 rounded-full">
            <Plus className="h-4 w-4" /> Add Your First Product
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p.id)}
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input data-testid="products-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price (BDT) *</Label>
                <Input data-testid="products-form-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
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
                onChange={(url) => setForm({ ...form, image_url: url })}
                folder="products"
                label="Upload main image"
                inputTestId="products-form-image-url"
              />
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
                <Label>Stock *</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
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
            <div className="grid gap-2">
              <Label>Sizes (comma-separated)</Label>
              <Input
                value={form.sizes.join(", ")}
                onChange={(e) => setForm({ ...form, sizes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="S, M, L, XL"
              />
            </div>
            <div className="grid gap-2">
              <Label>Colors (comma-separated)</Label>
              <Input
                value={form.colors.join(", ")}
                onChange={(e) => setForm({ ...form, colors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="Black, White, Navy"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              <Label>Featured product</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button data-testid="products-save-button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Update" : "Add"} Product
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
    </div>
  );
};

export default AdminProducts;
