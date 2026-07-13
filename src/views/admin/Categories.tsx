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
  created_at: string;
}

const AdminCategories = () => {
  const { activeStoreId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [customData, setCustomData] = useState<Record<string, any>>({ categories: {}, types: {} });
  const [loading, setLoading] = useState(true);

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", parent_id: "none", sort_order: 0, image_url: "", tagline: "" });
  const [savingCat, setSavingCat] = useState(false);

  // Type dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: "", sort_order: 0, image_url: "", tagline: "" });
  const [savingType, setSavingType] = useState(false);

  const fetchData = useCallback(async () => {
    const emptyData = {
      categories: [] as Category[],
      types: [] as ProductType[],
      customData: { categories: {}, types: {} } as Record<string, any>,
    };

    if (!activeStoreId) {
      return emptyData;
    }

    const [catRes, typeRes, settingsRes] = await Promise.all([
      supabase.from("product_categories").select("*").eq("store_id", activeStoreId as string).order("sort_order"),
      supabase.from("product_types").select("*").eq("store_id", activeStoreId as string).order("sort_order"),
      supabase.from("site_settings").select("*").eq("key", "categories_custom_data").eq("store_id", activeStoreId as string).maybeSingle(),
    ]);

    if (catRes.error) throw catRes.error;
    if (typeRes.error) throw typeRes.error;
    if (settingsRes.error) throw settingsRes.error;

    return {
      categories: (catRes.data as Category[]) ?? [],
      types: (typeRes.data as ProductType[]) ?? [],
      customData: settingsRes.data?.value ? settingsRes.data.value as Record<string, any> : { categories: {}, types: {} },
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
        setCategories(nextData.categories);
        setTypes(nextData.types);
        setCustomData(nextData.customData);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load categories and types:", error);
        toast.error("Failed to refresh categories and types. Please try again.");
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
  }, [activeStoreId, fetchData]);

  useEffect(() => {
    setCatDialogOpen(false);
    setEditingCat(null);
    setCatForm({ name: "", parent_id: "none", sort_order: 0, image_url: "", tagline: "" });
    setSavingCat(false);
    setTypeDialogOpen(false);
    setEditingType(null);
    setTypeForm({ name: "", sort_order: 0, image_url: "", tagline: "" });
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
      }
    }
    setSavingCat(false);
    setCatDialogOpen(false);
    fetchData();
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
      fetchData();
    }
  };

  // --- Type CRUD ---
  const openNewType = () => {
    setEditingType(null);
    setTypeForm({ name: "", sort_order: types.length + 1, image_url: "", tagline: "" });
    setTypeDialogOpen(true);
  };

  const openEditType = (t: ProductType) => {
    setEditingType(t);
    const custom = customData.types?.[t.name] ?? {};
    setTypeForm({ 
      name: t.name, 
      sort_order: t.sort_order,
      image_url: custom.image_url ?? "",
      tagline: custom.tagline ?? ""
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
    const payload = { name: typeForm.name.trim(), sort_order: typeForm.sort_order };

    if (editingType) {
      const { error } = await supabase.from("product_types").update(payload).eq("id", editingType.id).eq("store_id", activeStoreId as string);
      if (error) toast.error("Failed to update");
      else {
        toast.success("Type updated");
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
      }
    } else {
      const { error } = await supabase.from("product_types").insert({
        ...payload,
        store_id: activeStoreId,
      });
      if (error) toast.error("Failed to add");
      else {
        toast.success("Type added");
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
      }
    }
    setSavingType(false);
    setTypeDialogOpen(false);
    fetchData();
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
      fetchData();
    }
  };

  // helpers
  const topCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);
  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    return categories.find((c) => c.id === parentId)?.name ?? "-";
  };

  if (loading) {
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
        <p className="text-sm text-muted-foreground">Manage product categories (with subcategories) and product types</p>
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
                    <TableHead>Order</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No types yet</TableCell></TableRow>
                  ) : (
                    types.map((t) => {
                      const custom = customData.types?.[t.name] ?? {};
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


