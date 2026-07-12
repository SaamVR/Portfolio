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
import { Plus, Pencil, Trash2, Loader2, Package } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import CloudinaryMultiUpload from "@/components/admin/CloudinaryMultiUpload";

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

  const fetchProducts = useCallback(async () => {
    if (!activeStoreId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", activeStoreId as string)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data ?? []);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Failed to refresh products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    void fetchProducts();

    if (!activeStoreId) {
      setDbCategories([]);
      setDbTypes([]);
      return;
    }

    void Promise.all([
      supabase.from("product_categories").select("name").eq("store_id", activeStoreId as string).order("sort_order"),
      supabase.from("product_types").select("name").eq("store_id", activeStoreId as string).order("sort_order"),
    ]).then(([categoriesRes, typesRes]) => {
      if (categoriesRes.error || typesRes.error) {
        console.error("Failed to load product taxonomy:", categoriesRes.error || typesRes.error);
        return;
      }

      setDbCategories((categoriesRes.data ?? []).map((r: any) => r.name));
      setDbTypes((typesRes.data ?? []).map((r: any) => r.name));
    });
  }, [activeStoreId, fetchProducts]);

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
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} products total</p>
        </div>
        <Button data-testid="products-add-button" onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <Input
        data-testid="products-search"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
                      {loading ? (
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
                    <p className="text-xs text-muted-foreground">{p.type} · {p.category}</p>
                  </div>
                  <p className="font-heading text-sm font-bold text-primary">৳{p.price}</p>
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
                <Label>Price (৳) *</Label>
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
    </div>
  );
};

export default AdminProducts;

