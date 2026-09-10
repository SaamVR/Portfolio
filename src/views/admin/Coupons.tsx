import { useAuth } from "@/hooks/auth-context";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, Tag, ToggleLeft, ToggleRight, Pencil, X, Check, Copy, Sparkles, CalendarClock, TicketPercent, QrCode, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearchParams } from "@/lib/react-router-dom-shim";
import CartRecoveryPage from "./CartRecovery";
import QrCodeGeneratorPage from "./QrCodeGenerator";

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

const couponPresets = [
  {
    id: "flash-sale",
    label: "Flash sale",
    helper: "10% off with a same-day expiry window.",
    values: {
      code: "FLASH10",
      discount_type: "percentage" as const,
      discount_value: 10,
      min_order: 0,
      max_uses: "",
      expires_at: new Date().toISOString().slice(0, 10),
    },
  },
  {
    id: "first-order",
    label: "First order push",
    helper: "Fixed discount for new-customer campaigns.",
    values: {
      code: "WELCOME100",
      discount_type: "fixed" as const,
      discount_value: 100,
      min_order: 1000,
      max_uses: "100",
      expires_at: "",
    },
  },
  {
    id: "weekend",
    label: "Weekend promo",
    helper: "15% off with light urgency and a minimum basket.",
    values: {
      code: "WEEKEND15",
      discount_type: "percentage" as const,
      discount_value: 15,
      min_order: 1500,
      max_uses: "",
      expires_at: "",
    },
  },
];

type MarketingTab = "coupons" | "recovery" | "qr";

const marketingTools: Array<{ id: MarketingTab; label: string; helper: string; icon: typeof Tag }> = [
  { id: "coupons", label: "Discount coupons", helper: "Create offers shoppers can enter at checkout.", icon: Tag },
  { id: "recovery", label: "Cart recovery", helper: "Follow up with shoppers who left before ordering.", icon: ShoppingCart },
  { id: "qr", label: "QR promo codes", helper: "Create scannable links for print and offline campaigns.", icon: QrCode },
];

const Coupons = () => {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") || "coupons") as MarketingTab;

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
      return data as unknown as CouponCode[];
    },
    enabled: Boolean(activeStoreId),
  });

  useEffect(() => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyCoupon);
  }, [activeStoreId]);

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon ${code} copied`);
  };

  const applyPreset = (preset: typeof couponPresets[number]) => {
    setForm(preset.values);
    setShowForm(true);
    setEditId(null);
  };

  const activeCoupons = coupons.filter((coupon) => coupon.is_active);
  const endingSoonCount = activeCoupons.filter((coupon) => {
    if (!coupon.expires_at) return false;
    const expiresAt = new Date(coupon.expires_at).getTime();
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return expiresAt >= now && expiresAt <= now + sevenDays;
  }).length;
  const totalRedemptions = coupons.reduce((sum, coupon) => sum + (coupon.uses_count || 0), 0);

  const createCoupon = useMutation({
    mutationFn: async () => {
      if (!activeStoreId) throw new Error("Select a store before saving coupons.");

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
      if (!activeStoreId) throw new Error("Select a store before updating coupons.");
      const { error } = await supabase.from("coupon_codes" as any).update({ is_active }).eq("id", id).eq("store_id", activeStoreId as string);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons", activeStoreId] }),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      if (!activeStoreId) throw new Error("Select a store before deleting coupons.");
      const { error } = await supabase.from("coupon_codes" as any).delete().eq("id", id).eq("store_id", activeStoreId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coupon deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons", activeStoreId] });
    },
  });

  const startEdit = (coupon: CouponCode) => {
    setEditId(coupon.id);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order: coupon.min_order,
      max_uses: coupon.max_uses ? String(coupon.max_uses) : "",
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyCoupon);
  };

  const changeTab = (tab: MarketingTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Marketing</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose one growth tool at a time: create an offer, recover a cart, or share a scannable campaign link.
          </p>
        </div>
        {activeTab === "coupons" && !showForm ? (
          <Button onClick={() => setShowForm(true)} className="min-h-11 w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" /> Create coupon
          </Button>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => changeTab(value as MarketingTab)} className="space-y-6">
        <div className="space-y-2 sm:hidden">
          <p className="text-sm font-semibold text-foreground">Marketing tools</p>
          <div className="grid gap-2">
            {marketingTools.map((tool) => {
              const Icon = tool.icon;
              const selected = activeTab === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => changeTab(tool.id)}
                  className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/30"}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{tool.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{tool.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <TabsList className="hidden h-auto grid-cols-3 gap-1 border border-border bg-secondary/40 p-1 sm:grid">
          <TabsTrigger value="coupons" className="min-h-11 gap-2"><Tag className="h-4 w-4" />Coupons</TabsTrigger>
          <TabsTrigger value="recovery" className="min-h-11 gap-2"><ShoppingCart className="h-4 w-4" />Cart recovery</TabsTrigger>
          <TabsTrigger value="qr" className="min-h-11 gap-2"><QrCode className="h-4 w-4" />QR codes</TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="space-y-5">
          <Card className="border-border">
            <CardContent className="grid grid-cols-3 divide-x divide-border p-0">
              <div className="p-4 text-center sm:p-5">
                <Tag className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-2 text-xl font-semibold text-foreground">{activeCoupons.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="p-4 text-center sm:p-5">
                <CalendarClock className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-2 text-xl font-semibold text-foreground">{endingSoonCount}</p>
                <p className="text-xs text-muted-foreground">Ending soon</p>
              </div>
              <div className="p-4 text-center sm:p-5">
                <TicketPercent className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-2 text-xl font-semibold text-foreground">{totalRedemptions}</p>
                <p className="text-xs text-muted-foreground">Uses</p>
              </div>
            </CardContent>
          </Card>

          {!showForm ? (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />Quick start</CardTitle>
                <CardDescription>Pick a campaign shape, then adjust the values for your store.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {couponPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="min-h-20 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <p className="font-medium text-foreground">{preset.label}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{preset.helper}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {showForm ? (
            <Card className="border-primary/25">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{editId ? "Edit coupon" : "Create coupon"}</CardTitle>
                <CardDescription>Set the customer-facing code and the commercial limits in one place.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {!editId ? (
                  <div className="grid gap-2 md:grid-cols-3">
                    {couponPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="min-h-16 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <p className="text-sm font-medium text-foreground">{preset.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{preset.helper}</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="coupon-code">Coupon code *</Label>
                    <Input id="coupon-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER20" className="min-h-11 font-mono uppercase" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Discount type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["percentage", "fixed"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setForm({ ...form, discount_type: type })}
                          className={`min-h-11 rounded-md border px-3 text-sm font-medium transition-colors ${form.discount_type === type ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        >
                          {type === "percentage" ? "% off" : "BDT fixed"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="coupon-value">Discount value *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{form.discount_type === "percentage" ? "%" : "BDT"}</span>
                      <Input id="coupon-value" type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} className="min-h-11 pl-9" min={0} max={form.discount_type === "percentage" ? 100 : undefined} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="coupon-minimum">Minimum order (BDT)</Label>
                    <Input id="coupon-minimum" type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} placeholder="0 = no minimum" min={0} className="min-h-11" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="coupon-max-uses">Maximum uses</Label>
                    <Input id="coupon-max-uses" type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Blank = unlimited" min={1} className="min-h-11" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="coupon-expiry">Expiry date</Label>
                    <Input id="coupon-expiry" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="min-h-11" />
                  </div>
                </div>

                <div className="grid gap-2 sm:flex">
                  <Button onClick={() => createCoupon.mutate()} disabled={!form.code || createCoupon.isPending} className="min-h-11 gap-2">
                    {createCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {editId ? "Save coupon" : "Create coupon"}
                  </Button>
                  <Button variant="outline" onClick={cancelForm} className="min-h-11 gap-2"><X className="h-4 w-4" />Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isLoading && coupons.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-xl border border-border bg-card/40">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Loading coupons…</div>
            </div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-5 py-14 text-center">
              <Tag className="h-10 w-10 text-muted-foreground/50" />
              <h2 className="mt-3 font-heading text-lg font-semibold text-foreground">Create your first offer</h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">A simple welcome or campaign coupon gives you a concrete promotion to share with shoppers.</p>
              {!showForm ? <Button onClick={() => setShowForm(true)} className="mt-4 min-h-11 gap-2"><Plus className="h-4 w-4" />Create coupon</Button> : null}
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {coupons.map((coupon) => (
                  <Card key={coupon.id} className="border-border">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-base font-semibold text-foreground">{coupon.code}</p>
                          <p className="mt-1 text-sm font-semibold text-primary">{coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `BDT ${coupon.discount_value} off`}</p>
                        </div>
                        <Button variant="outline" size="sm" className="min-h-11 gap-2" onClick={() => copyCouponCode(coupon.code)}><Copy className="h-4 w-4" />Copy</Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-y border-border/60 py-3 text-xs">
                        <div><p className="text-muted-foreground">Minimum order</p><p className="mt-1 font-medium text-foreground">{coupon.min_order > 0 ? `BDT ${coupon.min_order}` : "None"}</p></div>
                        <div><p className="text-muted-foreground">Uses</p><p className="mt-1 font-medium text-foreground">{coupon.uses_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}</p></div>
                        <div><p className="text-muted-foreground">Expires</p><p className="mt-1 font-medium text-foreground">{coupon.expires_at ? format(new Date(coupon.expires_at), "MMM d, yyyy") : "Never"}</p></div>
                        <div><p className="text-muted-foreground">Status</p><p className="mt-1 font-medium text-foreground">{coupon.is_active ? "Active" : "Inactive"}</p></div>
                      </div>

                      <Button
                        variant="outline"
                        className="min-h-11 w-full justify-between"
                        onClick={() => toggleActive.mutate({ id: coupon.id, is_active: !coupon.is_active })}
                        disabled={toggleActive.isPending}
                      >
                        <span>{coupon.is_active ? "Pause coupon" : "Activate coupon"}</span>
                        {coupon.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" className="min-h-11 gap-2" onClick={() => startEdit(coupon)}><Pencil className="h-4 w-4" />Edit</Button>
                        <Button
                          variant="ghost"
                          className="min-h-11 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => { if (confirm(`Delete coupon "${coupon.code}"?`)) deleteCoupon.mutate(coupon.id); }}
                          disabled={deleteCoupon.isPending}
                        ><Trash2 className="h-4 w-4" />Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Offer</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Limits</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-4"><span className="font-mono font-semibold text-foreground">{coupon.code}</span></td>
                        <td className="px-4 py-4"><p className="font-semibold text-primary">{coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `BDT ${coupon.discount_value} off`}</p><p className="mt-1 text-xs text-muted-foreground">Min {coupon.min_order > 0 ? `BDT ${coupon.min_order}` : "none"}</p></td>
                        <td className="px-4 py-4 text-muted-foreground"><p>{coupon.uses_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""} uses</p><p className="mt-1 text-xs">{coupon.expires_at ? `Ends ${format(new Date(coupon.expires_at), "MMM d, yyyy")}` : "No expiry"}</p></td>
                        <td className="px-4 py-4">
                          <Button variant="outline" size="sm" className="min-h-11 gap-2" onClick={() => toggleActive.mutate({ id: coupon.id, is_active: !coupon.is_active })} disabled={toggleActive.isPending}>
                            {coupon.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                            {coupon.is_active ? "Active" : "Inactive"}
                          </Button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="min-h-11 gap-2" onClick={() => copyCouponCode(coupon.code)}><Copy className="h-4 w-4" />Copy</Button>
                            <Button variant="secondary" size="sm" className="min-h-11 gap-2" onClick={() => startEdit(coupon)}><Pencil className="h-4 w-4" />Edit</Button>
                            <Button variant="ghost" size="sm" className="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { if (confirm(`Delete coupon "${coupon.code}"?`)) deleteCoupon.mutate(coupon.id); }} disabled={deleteCoupon.isPending}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4"><CartRecoveryPage /></TabsContent>
        <TabsContent value="qr" className="space-y-4"><QrCodeGeneratorPage /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Coupons;