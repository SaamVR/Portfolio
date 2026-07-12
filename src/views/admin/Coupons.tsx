import { useAuth } from "@/hooks/auth-context";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, Tag, ToggleLeft, ToggleRight, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface CouponCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyCoupon = {
  code: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: 10,
  min_order: 0,
  max_uses: "",
  expires_at: "",
};

const Coupons = () => {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCoupon);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons", activeStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupon_codes" as any)
        .select("*")
        .eq("store_id", activeStoreId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as CouponCode[];
    },
    enabled: Boolean(activeStoreId),
  });

  useEffect(() => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyCoupon);
  }, [activeStoreId]);

  const createCoupon = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order: Number(form.min_order) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        store_id: activeStoreId,
      };
      if (editId) {
        const { error } = await supabase.from("coupon_codes" as any).update(payload).eq("id", editId).eq("store_id", activeStoreId as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupon_codes" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Coupon updated!" : "Coupon created!");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons", activeStoreId] });
      setShowForm(false);
      setEditId(null);
      setForm(emptyCoupon);
    },
    onError: (e: any) => {
      toast.error(e.message?.includes("duplicate") ? "That coupon code already exists." : "Failed to save coupon.");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupon_codes" as any).update({ is_active }).eq("id", id).eq("store_id", activeStoreId as string);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons", activeStoreId] }),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupon_codes" as any).delete().eq("id", id).eq("store_id", activeStoreId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coupon deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons", activeStoreId] });
    },
  });

  const startEdit = (c: CouponCode) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      min_order: c.min_order,
      max_uses: c.max_uses ? String(c.max_uses) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyCoupon);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Coupons</h1>
          <p className="text-sm text-muted-foreground">Create and manage discount codes for your store</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Coupon
          </Button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
            {editId ? "Edit Coupon" : "New Coupon"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Coupon Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER20"
                className="font-mono uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label>Discount Type</Label>
              <div className="flex gap-2">
                {(["percentage", "fixed"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, discount_type: type })}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      form.discount_type === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {type === "percentage" ? "% Off" : "৳ Fixed"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Discount Value *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {form.discount_type === "percentage" ? "%" : "৳"}
                </span>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                  className="pl-7"
                  min={0}
                  max={form.discount_type === "percentage" ? 100 : undefined}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Minimum Order (৳)</Label>
              <Input
                type="number"
                value={form.min_order}
                onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
                placeholder="0 = no minimum"
                min={0}
              />
            </div>
            <div className="grid gap-2">
              <Label>Max Uses (optional)</Label>
              <Input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Leave blank = unlimited"
                min={1}
              />
            </div>
            <div className="grid gap-2">
              <Label>Expiry Date (optional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => createCoupon.mutate()} disabled={!form.code || createCoupon.isPending} className="gap-2">
              {createCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editId ? "Update" : "Create"} Coupon
            </Button>
            <Button variant="outline" onClick={cancelForm} className="gap-2">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Responsive list/table container */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Tag className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="font-heading text-lg font-semibold text-foreground">No coupons yet</p>
          <p className="text-sm text-muted-foreground">Create your first discount code above.</p>
        </div>
      ) : (
        <>
          {/* Mobile view cards stack */}
          <div className="space-y-4 md:hidden">
            {coupons.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-sm text-foreground bg-secondary/80 px-2.5 py-1 rounded-lg border border-border/80">
                    {c.code}
                  </span>
                  <span className="text-primary font-bold text-sm">
                    {c.discount_type === "percentage" ? `${c.discount_value}% off` : `৳${c.discount_value} off`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-y border-border/50 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Min. Order</p>
                    <p className="font-medium text-foreground mt-0.5">{c.min_order > 0 ? `৳${c.min_order}` : "None"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Uses</p>
                    <p className="font-medium text-foreground mt-0.5">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expires</p>
                    <p className="font-medium text-foreground mt-0.5">{c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "Never"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                    <div className="mt-0.5">
                      <button
                        onClick={() => toggleActive.mutate({ id: c.id, is_active: !c.is_active })}
                        className="flex items-center gap-1.5"
                      >
                        {c.is_active ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-primary" />
                            <Badge variant="default" className="text-[9px] px-1 py-0">Active</Badge>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">Inactive</Badge>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-lg text-xs" onClick={() => startEdit(c)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 h-8 rounded-lg text-xs"
                    onClick={() => {
                      if (confirm(`Delete coupon "${c.code}"?`)) deleteCoupon.mutate(c.id);
                    }}
                    disabled={deleteCoupon.isPending}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Discount</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Min. Order</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Uses</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Expires</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-foreground">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 text-primary font-semibold">
                      {c.discount_type === "percentage" ? `${c.discount_value}% off` : `৳${c.discount_value} off`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.min_order > 0 ? `৳${c.min_order}` : "None"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive.mutate({ id: c.id, is_active: !c.is_active })}
                        className="flex items-center gap-1.5"
                      >
                        {c.is_active ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-primary" />
                            <Badge variant="default" className="text-[10px]">Active</Badge>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete coupon "${c.code}"?`)) deleteCoupon.mutate(c.id);
                          }}
                          disabled={deleteCoupon.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Coupons;

