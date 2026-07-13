"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Layers3,
  Loader2,
  Mail,
  Package,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEmail, resolveEffectiveFeatures, getLifecycleStatusForDate, getDefaultLifecycleState, type StoreLifecycleStateRecord } from "@/lib/platform/control-plane";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, Navigate } from "@/lib/react-router-dom-shim";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildPlatformOverviewStats,
  buildStorePlatformSummaries,
  type PlatformAnalyticsInput,
  type StorePlatformSummary,
} from "@/lib/platform/admin-analytics";

type PlanRow = {
  id: string;
  name: string;
  description: string;
  monthly_price: number | null;
  currency_code?: string;
  store_limit?: number | null;
  sort_order?: number;
  is_active: boolean;
};

type StoreRow = {
  id: string;
  owner_id?: string | null;
  name: string;
  slug: string;
  custom_domain?: string | null;
  is_published: boolean | null;
  updated_at?: string | null;
};

type OrderRow = {
  id: string;
  store_id: string;
  status: string;
  total: number | null;
  created_at: string;
};

const LIFECYCLE_ACTIONS = [
  { value: "scan", label: "Scan Status" },
  { value: "remind", label: "Send Reminder" },
  { value: "archive", label: "Archive Store" },
  { value: "restore", label: "Restore Store" },
  { value: "schedule_delete", label: "Schedule Delete" },
  { value: "delete_now", label: "Delete Now" },
] as const;

function formatMoney(value: number) {
  return `BDT ${Math.round(value).toLocaleString()}`;
}

type PlatformData = {
  features: any[];
  plans: PlanRow[];
  planFeatures: any[];
  stores: StoreRow[];
  subscriptions: Array<{ store_id: string; plan_id: string | null; status: string | null }>;
  storeOverrides: any[];
  emailOverrides: any[];
  lifecycleStates: Array<Partial<StoreLifecycleStateRecord> & { store_id: string; lifecycle_status: string }>;
  lifecycleEvents: any[];
  orders: OrderRow[];
  products: Array<{ id: string; store_id: string }>;
  pages: Array<{ id: string; store_id: string; slug: string; is_homepage: boolean | null }>;
  blocks: Array<{ id: string; store_id: string; page_id: string; is_visible: boolean | null }>;
  memberships: Array<{ store_id: string; user_id: string; role: string }>;
  messages: Array<{ id: string; store_id: string; is_read: boolean | null }>;
  reviews: Array<{ id: string; store_id: string; status: string | null }>;
  emailEvents: Array<{ id: string; store_id: string | null; status: string | null; template_name: string | null; recipient: string | null; created_at: string }>;
  invoices: any[];
};

export default function PlatformControlPlane() {
  const { platformRole, user, activeStoreId, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState(activeStoreId ?? "");
  const [storeSearch, setStoreSearch] = useState("");
  const [exceptionEmail, setExceptionEmail] = useState("");
  const [exceptionFeatureKey, setExceptionFeatureKey] = useState("backup_import");
  const [exceptionEnabled, setExceptionEnabled] = useState(true);
  const [exceptionScopeStoreId, setExceptionScopeStoreId] = useState<string>("global");
  const [exceptionNote, setExceptionNote] = useState("");
  const [lifecycleAction, setLifecycleAction] = useState<(typeof LIFECYCLE_ACTIONS)[number]["value"]>("scan");

  // Plan creation / editing state
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    description: "",
    monthly_price: "",
    currency_code: "BDT",
    store_limit: "",
    is_active: true,
    sort_order: "0",
  });

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      id: "",
      name: "",
      description: "",
      monthly_price: "",
      currency_code: "BDT",
      store_limit: "",
      is_active: true,
      sort_order: "0",
    });
    setIsPlanDialogOpen(true);
  };

  const openEditPlan = (plan: PlanRow) => {
    setEditingPlan(plan);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      monthly_price: plan.monthly_price != null ? String(plan.monthly_price) : "",
      currency_code: (plan as any).currency_code || "BDT",
      store_limit: (plan as any).store_limit != null ? String((plan as any).store_limit) : "",
      is_active: plan.is_active,
      sort_order: String((plan as any).sort_order || 0),
    });
    setIsPlanDialogOpen(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["platform-control-plane"],
    queryFn: async (): Promise<PlatformData> => {
      const [
        { data: features },
        { data: plans },
        { data: planFeatures },
        { data: stores },
        { data: subscriptions },
        { data: storeOverrides },
        { data: emailOverrides },
        { data: lifecycleStates },
        { data: lifecycleEvents },
        { data: orders },
        { data: products },
        { data: pages },
        { data: blocks },
        { data: memberships },
        { data: messages },
        { data: reviews },
        { data: emailEvents },
        { data: invoices },
      ] = await Promise.all([
        (supabase as any).from("cms_features").select("*").order("category").order("name"),
        (supabase as any).from("cms_plans").select("id, name, description, monthly_price, currency_code, store_limit, sort_order, is_active").order("sort_order"),
        (supabase as any).from("cms_plan_features").select("plan_id, feature_key, enabled"),
        (supabase as any).from("stores").select("id, owner_id, name, slug, custom_domain, is_published, updated_at").order("name"),
        (supabase as any).from("store_subscriptions").select("store_id, plan_id, status"),
        (supabase as any).from("store_feature_overrides").select("*"),
        (supabase as any).from("user_email_feature_overrides").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("store_lifecycle_states").select("*").order("updated_at", { ascending: false }),
        (supabase as any).from("store_lifecycle_events").select("*").order("created_at", { ascending: false }).limit(50),
        (supabase as any).from("orders").select("id, store_id, status, total, created_at"),
        (supabase as any).from("products").select("id, store_id"),
        (supabase as any).from("store_pages").select("id, store_id, slug, is_homepage"),
        (supabase as any).from("store_page_blocks").select("id, store_id, page_id, is_visible"),
        (supabase as any).from("store_memberships").select("store_id, user_id, role"),
        (supabase as any).from("contact_messages").select("id, store_id, is_read"),
        (supabase as any).from("product_reviews").select("id, store_id, status"),
        (supabase as any).from("email_events").select("id, store_id, status, template_name, recipient, created_at").order("created_at", { ascending: false }).limit(50),
        (supabase as any).from("store_invoices").select("*, stores(name, slug)").order("created_at", { ascending: false }),
      ]);

      return {
        features: (features ?? []) as any[],
        plans: (plans ?? []) as PlanRow[],
        planFeatures: (planFeatures ?? []) as any[],
        stores: (stores ?? []) as StoreRow[],
        subscriptions: (subscriptions ?? []) as Array<{ store_id: string; plan_id: string | null; status: string | null }>,
        storeOverrides: (storeOverrides ?? []) as any[],
        emailOverrides: (emailOverrides ?? []) as any[],
        lifecycleStates: (lifecycleStates ?? []) as Array<Partial<StoreLifecycleStateRecord> & { store_id: string; lifecycle_status: string }>,
        lifecycleEvents: (lifecycleEvents ?? []) as any[],
        orders: (orders ?? []) as OrderRow[],
        products: (products ?? []) as Array<{ id: string; store_id: string }>,
        pages: (pages ?? []) as Array<{ id: string; store_id: string; slug: string; is_homepage: boolean | null }>,
        blocks: (blocks ?? []) as Array<{ id: string; store_id: string; page_id: string; is_visible: boolean | null }>,
        memberships: (memberships ?? []) as Array<{ store_id: string; user_id: string; role: string }>,
        messages: (messages ?? []) as Array<{ id: string; store_id: string; is_read: boolean | null }>,
        reviews: (reviews ?? []) as Array<{ id: string; store_id: string; status: string | null }>,
        emailEvents: (emailEvents ?? []) as Array<{ id: string; store_id: string | null; status: string | null; template_name: string | null; recipient: string | null; created_at: string }>,
        invoices: (invoices ?? []) as any[],
      };
    },
    enabled: platformRole === "admin",
  });

  const summaries = useMemo<StorePlatformSummary[]>(() => (data ? buildStorePlatformSummaries(data as PlatformAnalyticsInput) : []), [data]);
  const effectiveSelectedStoreId = selectedStoreId || summaries[0]?.id || "";
  const selectedStore = summaries.find((store) => store.id === effectiveSelectedStoreId) ?? summaries[0] ?? null;
  const selectedPlanId = selectedStore?.planId ?? null;

  const filteredStores = useMemo(() => {
    const query = storeSearch.trim().toLowerCase();
    if (!query) return summaries;
    return summaries.filter((store) =>
      [store.name, store.slug, store.custom_domain, store.planName, store.subscriptionStatus, store.lifecycleStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [storeSearch, summaries]);

  const overview = useMemo(
    () => buildPlatformOverviewStats(summaries, data ?? { orders: [], products: [], plans: [] }),
    [data, summaries],
  );

  useEffect(() => {
    if (activeStoreId && summaries.some((store) => store.id === activeStoreId)) {
      setSelectedStoreId(activeStoreId);
      return;
    }

    if (!selectedStoreId && summaries[0]?.id) {
      setSelectedStoreId(summaries[0].id);
    }
  }, [activeStoreId, selectedStoreId, summaries]);

  const effectiveFeatureMap = useMemo(() => {
    if (!data || !selectedPlanId) return new Map();

    return resolveEffectiveFeatures({
      features: data.features,
      planMappings: data.planFeatures.filter((row) => row.plan_id === selectedPlanId),
      storeOverrides: data.storeOverrides.filter((row) => row.store_id === selectedStore?.id),
      emailOverrides: data.emailOverrides.filter((row) => {
        const normalized = normalizeEmail(exceptionEmail);
        return normalized ? row.normalized_email === normalized : false;
      }),
      isPlatformAdmin: false,
    });
  }, [data, exceptionEmail, selectedPlanId, selectedStore?.id]);

  if (authLoading && platformRole !== "admin") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (platformRole !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["platform-control-plane"] });
    await queryClient.invalidateQueries({ queryKey: ["store-entitlements"] });
  };

  const togglePlanFeature = async (planId: string, featureKey: string, enabled: boolean) => {
    const { error } = await (supabase as any).from("cms_plan_features").upsert(
      { plan_id: planId, feature_key: featureKey, enabled },
      { onConflict: "plan_id,feature_key" },
    );
    if (error) {
      toast.error("Failed to update package feature.");
      return;
    }
    toast.success("Package feature updated.");
    await refreshAll();
  };

  const toggleFeatureCatalog = async (featureKey: string, patch: Record<string, unknown>) => {
    const { error } = await (supabase as any).from("cms_features").update(patch).eq("key", featureKey);
    if (error) {
      toast.error("Failed to update feature catalog.");
      return;
    }
    toast.success("Feature catalog updated.");
    await refreshAll();
  };

  const setStoreOverride = async (featureKey: string, enabled: boolean | null) => {
    if (!selectedStore) return;

    if (enabled === null) {
      const { error } = await (supabase as any).from("store_feature_overrides").delete().eq("store_id", selectedStore.id).eq("feature_key", featureKey);
      if (error) {
        toast.error("Failed to clear store override.");
        return;
      }
      toast.success("Store override cleared.");
      await refreshAll();
      return;
    }

    const { error } = await (supabase as any).from("store_feature_overrides").upsert(
      {
        store_id: selectedStore.id,
        feature_key: featureKey,
        enabled,
        created_by: user?.id ?? null,
      },
      { onConflict: "store_id,feature_key" },
    );
    if (error) {
      toast.error("Failed to save store override.");
      return;
    }
    toast.success("Store override updated.");
    await refreshAll();
  };

  const saveEmailException = async () => {
    const normalizedEmail = normalizeEmail(exceptionEmail);
    if (!normalizedEmail) {
      toast.error("Enter a valid email.");
      return;
    }

    const { error } = await (supabase as any).from("user_email_feature_overrides").insert({
      normalized_email: normalizedEmail,
      feature_key: exceptionFeatureKey,
      store_id: exceptionScopeStoreId === "global" ? null : exceptionScopeStoreId,
      enabled: exceptionEnabled,
      note: exceptionNote || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error("Failed to save email override.");
      return;
    }
    toast.success("Email exception saved.");
    setExceptionNote("");
    await refreshAll();
  };

  const deleteEmailException = async (id: string) => {
    const { error } = await (supabase as any).from("user_email_feature_overrides").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove email override.");
      return;
    }
    toast.success("Email exception removed.");
    await refreshAll();
  };

  const upsertLifecycleState = async (storeId: string, patch: Record<string, unknown>) => {
    const existing = data?.lifecycleStates.find((state) => state.store_id === storeId) ?? getDefaultLifecycleState(storeId);
    const { error } = await (supabase as any).from("store_lifecycle_states").upsert(
      { ...existing, ...patch, store_id: storeId },
      { onConflict: "store_id" },
    );
    if (error) throw error;
  };

  const insertLifecycleEvent = async (storeId: string, eventType: string, message: string, metadata: Record<string, unknown> = {}) => {
    const { error } = await (supabase as any).from("store_lifecycle_events").insert({
      store_id: storeId,
      event_type: eventType,
      status: "completed",
      message,
      metadata,
      created_by: user?.id ?? null,
    });
    if (error) throw error;
  };

  const runLifecycleAction = async () => {
    if (!selectedStore) return;

    try {
      const now = new Date();
      const lifecycleState = data?.lifecycleStates.find((state) => state.store_id === selectedStore.id) ?? getDefaultLifecycleState(selectedStore.id);
      const currentStatus = getLifecycleStatusForDate(selectedStore.updated_at ? new Date(selectedStore.updated_at) : null, now);

      if (lifecycleAction === "scan") {
        const reminderCount = currentStatus === "reminded" ? Math.max(lifecycleState.reminder_count ?? 0, 1) : lifecycleState.reminder_count ?? 0;
        await upsertLifecycleState(selectedStore.id, {
          lifecycle_status: currentStatus,
          last_activity_at: selectedStore.updated_at ?? now.toISOString(),
          last_storefront_activity_at: selectedStore.updated_at ?? now.toISOString(),
          status_reason: currentStatus === "active" ? "Store activity is within the safe window." : "Store has crossed the inactivity threshold.",
          next_reminder_at: currentStatus === "reminded" ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
          reminder_count: reminderCount,
        });
        await insertLifecycleEvent(selectedStore.id, "scan", `Lifecycle status recalculated as ${currentStatus}.`, { lifecycle_status: currentStatus });
      }

      if (lifecycleAction === "remind") {
        const nextReminderCount = Math.min(3, (lifecycleState.reminder_count ?? 0) + 1);
        await upsertLifecycleState(selectedStore.id, {
          lifecycle_status: "reminded",
          reminder_count: nextReminderCount,
          last_reminder_at: now.toISOString(),
          next_reminder_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          reminder_1_sent_at: nextReminderCount >= 1 ? lifecycleState.reminder_1_sent_at ?? now.toISOString() : lifecycleState.reminder_1_sent_at,
          reminder_2_sent_at: nextReminderCount >= 2 ? lifecycleState.reminder_2_sent_at ?? now.toISOString() : lifecycleState.reminder_2_sent_at,
          reminder_3_sent_at: nextReminderCount >= 3 ? lifecycleState.reminder_3_sent_at ?? now.toISOString() : lifecycleState.reminder_3_sent_at,
          status_reason: `Reminder ${nextReminderCount} sent to the merchant owner.`,
        });
        await insertLifecycleEvent(selectedStore.id, "reminder_sent", `Reminder ${nextReminderCount} queued for the merchant owner.`, { reminder_count: nextReminderCount });
      }

      if (lifecycleAction === "archive") {
        await (supabase as any).from("stores").update({ is_published: false }).eq("id", selectedStore.id);
        await upsertLifecycleState(selectedStore.id, {
          lifecycle_status: "archived",
          archived_at: now.toISOString(),
          scheduled_delete_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status_reason: "Store was archived after inactivity review.",
        });
        await insertLifecycleEvent(selectedStore.id, "archived", "Store was unpublished and archived.", {});
      }

      if (lifecycleAction === "restore") {
        await (supabase as any).from("stores").update({ is_published: true }).eq("id", selectedStore.id);
        await upsertLifecycleState(selectedStore.id, {
          lifecycle_status: "active",
          archived_at: null,
          scheduled_delete_at: null,
          deleted_at: null,
          status_reason: "Store restored and deletion schedule cleared.",
          last_activity_at: now.toISOString(),
        });
        await insertLifecycleEvent(selectedStore.id, "restored", "Store restored from archived state.", {});
      }

      if (lifecycleAction === "schedule_delete") {
        await upsertLifecycleState(selectedStore.id, {
          lifecycle_status: "pending_delete",
          scheduled_delete_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status_reason: "Store scheduled for deletion after grace period.",
        });
        await insertLifecycleEvent(selectedStore.id, "delete_scheduled", "Store scheduled for deletion.", {});
      }

      if (lifecycleAction === "delete_now") {
        await (supabase as any).from("store_lifecycle_events").insert({
          store_id: selectedStore.id,
          event_type: "final_backup_created",
          status: "completed",
          message: "Final backup checkpoint recorded before deletion.",
          metadata: { backup_available_from: "/admin/backup" },
          created_by: user?.id ?? null,
        });
        await (supabase as any).from("stores").update({ is_published: false }).eq("id", selectedStore.id);
        await upsertLifecycleState(selectedStore.id, {
          lifecycle_status: "deleted",
          deleted_at: now.toISOString(),
          archived_at: lifecycleState.archived_at ?? now.toISOString(),
          scheduled_delete_at: now.toISOString(),
          status_reason: "Store marked deleted after final backup checkpoint.",
        });
        await insertLifecycleEvent(selectedStore.id, "deleted", "Store marked deleted. Tenant-scoped data purge is ready for execution.", {});
      }

      toast.success("Lifecycle action completed.");
      await refreshAll();
    } catch (error) {
      console.error(error);
      toast.error("Lifecycle action failed.");
    }
  };

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planForm.id.trim() || !planForm.name.trim() || !planForm.description.trim()) {
      toast.error("Please fill in plan ID, name, and description");
      return;
    }

    const payload = {
      id: planForm.id.trim().toLowerCase(),
      name: planForm.name.trim(),
      description: planForm.description.trim(),
      monthly_price: planForm.monthly_price.trim() !== "" ? parseInt(planForm.monthly_price.trim(), 10) : null,
      currency_code: planForm.currency_code.trim(),
      store_limit: planForm.store_limit.trim() !== "" ? parseInt(planForm.store_limit.trim(), 10) : null,
      is_active: planForm.is_active,
      sort_order: parseInt(planForm.sort_order.trim(), 10) || 0,
      updated_at: new Date().toISOString(),
    };

    try {
      let error;
      if (editingPlan) {
        const { error: err } = await (supabase as any)
          .from("cms_plans")
          .update(payload)
          .eq("id", editingPlan.id);
        error = err;
      } else {
        const { error: err } = await (supabase as any)
          .from("cms_plans")
          .insert({ ...payload, created_at: new Date().toISOString() });
        error = err;
      }

      if (error) throw error;

      toast.success(editingPlan ? "Plan updated successfully!" : "Plan created successfully!");
      setIsPlanDialogOpen(false);
      await refreshAll();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save plan");
    }
  };

  const approveManualInvoice = async (invoice: any) => {
    try {
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error: invoiceError } = await (supabase as any)
        .from("store_invoices")
        .update({
          status: "paid",
          paid_at: now.toISOString(),
          billing_period_end: periodEnd.toISOString(),
        })
        .eq("id", invoice.id);

      if (invoiceError) throw invoiceError;

      const { error: subError } = await (supabase as any)
        .from("store_subscriptions")
        .upsert(
          {
            store_id: invoice.store_id,
            plan_id: invoice.plan_id,
            status: "active",
            provider: "bkash_manual",
            provider_subscription_id: invoice.provider_invoice_id,
            current_period_ends_at: periodEnd.toISOString(),
          },
          { onConflict: "store_id" }
        );

      if (subError) throw subError;

      toast.success("Manual bKash invoice approved and subscription activated!");
      await refreshAll();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to approve payment");
    }
  };

  const rejectManualInvoice = async (invoice: any) => {
    try {
      const { error } = await (supabase as any)
        .from("store_invoices")
        .update({ status: "failed" })
        .eq("id", invoice.id);

      if (error) throw error;
      toast.info("Invoice marked as failed.");
      await refreshAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject invoice.");
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const overviewCards = [
    { label: "Stores", value: overview.totalStores, icon: Store },
    { label: "Published", value: overview.publishedStores, icon: CheckCircle2 },
    { label: "Draft", value: overview.draftStores, icon: FileText },
    { label: "Paid Stores", value: overview.paidStores, icon: CreditCard },
    { label: "Trial Stores", value: overview.trialStores, icon: Sparkles },
    { label: "Free Stores", value: overview.freeStores, icon: Layers3 },
    { label: "Orders", value: overview.totalOrders, icon: ShoppingCart },
    { label: "Platform GMV", value: formatMoney(overview.platformGmv), icon: BarChart3 },
    { label: "Products", value: overview.totalProducts, icon: Package },
    { label: "Lifecycle Risk", value: overview.lifecycleRisk, icon: AlertTriangle },
  ];

  const unhealthyStores = summaries.filter((store) => !store.hasHomepage || store.visibleBlockTotal < 3 || store.customPageTotal === 0 || !store.is_published);
  const failingEmailEvents = data.emailEvents.filter((event) => !["sent", "delivered", "completed"].includes(String(event.status ?? "").toLowerCase()));
  const nonActiveSubscriptions = summaries.filter((store) => !["active", "trialing"].includes(store.subscriptionStatus));
  const invoices = data.invoices ?? [];
  const pendingManualInvoices = invoices.filter((invoice) => invoice.payment_method === "bkash_manual" && invoice.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">CMS Admin</h1>
          <p className="text-sm text-muted-foreground">SaaS control plane for merchants, stores, plans, feature access, lifecycle, and platform health.</p>
        </div>
        <Badge variant="outline" className="w-fit">Platform access only</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stores">Merchants</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="health">CMS Health</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {overviewCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                    <Icon className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-2xl font-bold text-foreground">{card.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Top Stores By Revenue</CardTitle>
                <CardDescription>Existing order data aggregated across all stores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...summaries].sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((store) => (
                  <div key={store.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{store.name}</p>
                      <p className="text-xs text-muted-foreground">/{store.slug} - {store.orderTotal} orders</p>
                    </div>
                    <Badge variant="secondary">{formatMoney(store.revenue)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Platform Attention</CardTitle>
                <CardDescription>Stores and systems that may need admin follow-up.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Stores with CMS issues</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{unhealthyStores.length}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Non-active subscriptions</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{nonActiveSubscriptions.length}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Unread merchant messages</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{data.messages.filter((message) => !message.is_read).length}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Email failures</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{failingEmailEvents.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stores" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Merchants / Stores</CardTitle>
                <CardDescription>Cross-tenant store list with plan, status, CMS, and commerce summary.</CardDescription>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" value={storeSearch} onChange={(event) => setStoreSearch(event.target.value)} placeholder="Search stores, plans, domains, lifecycle..." />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredStores.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setSelectedStoreId(store.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${selectedStore?.id === store.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{store.name}</p>
                        <p className="text-xs text-muted-foreground">/{store.slug}{store.custom_domain ? ` - ${store.custom_domain}` : ""}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={store.is_published ? "default" : "outline"}>{store.is_published ? "Published" : "Draft"}</Badge>
                          <Badge variant="secondary">{store.planName}</Badge>
                          <Badge variant="outline">{store.subscriptionStatus}</Badge>
                          <Badge variant="outline">{store.lifecycleStatus}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-right text-xs text-muted-foreground">
                        <div><p className="font-semibold text-foreground">{formatMoney(store.revenue)}</p><p>GMV</p></div>
                        <div><p className="font-semibold text-foreground">{store.orderTotal}</p><p>Orders</p></div>
                        <div><p className="font-semibold text-foreground">{store.pageTotal}</p><p>Pages</p></div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Store Detail</CardTitle>
                <CardDescription>Inspect and manage the selected merchant store.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStore ? (
                  <>
                    <div className="rounded-lg border border-border p-4">
                      <p className="font-medium text-foreground">{selectedStore.name}</p>
                      <p className="text-xs text-muted-foreground">Owner: {selectedStore.ownerLabel} - Members: {selectedStore.memberTotal}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-muted-foreground">Plan</p><p className="font-medium">{selectedStore.planName}</p></div>
                        <div><p className="text-muted-foreground">Subscription</p><p className="font-medium">{selectedStore.subscriptionStatus}</p></div>
                        <div><p className="text-muted-foreground">Revenue</p><p className="font-medium">{formatMoney(selectedStore.revenue)}</p></div>
                        <div><p className="text-muted-foreground">Products</p><p className="font-medium">{selectedStore.productTotal}</p></div>
                        <div><p className="text-muted-foreground">Pages</p><p className="font-medium">{selectedStore.pageTotal}</p></div>
                        <div><p className="text-muted-foreground">Blocks</p><p className="font-medium">{selectedStore.visibleBlockTotal}/{selectedStore.blockTotal}</p></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/stores/${selectedStore.slug}`}>View Storefront</Link>
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {data.features.map((feature) => {
                        const state = effectiveFeatureMap.get(feature.key);
                        const overrideRow = data.storeOverrides.find((row) => row.store_id === selectedStore.id && row.feature_key === feature.key);
                        return (
                          <div key={feature.key} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">{feature.name}</p>
                                <p className="text-xs text-muted-foreground">{state?.enabled ? "Enabled" : "Disabled"} - {state?.reason ?? "unknown"}</p>
                              </div>
                              <Badge variant="outline">{feature.key}</Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant={overrideRow?.enabled === true ? "secondary" : "outline"} onClick={() => void setStoreOverride(feature.key, true)}>Enable</Button>
                              <Button type="button" size="sm" variant={overrideRow?.enabled === false ? "secondary" : "outline"} onClick={() => void setStoreOverride(feature.key, false)}>Disable</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => void setStoreOverride(feature.key, null)}>Clear</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No store selected.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /> Plans</CardTitle>
                  <CardDescription>Public packages and their current feature matrix.</CardDescription>
                </div>
                <Button type="button" size="sm" onClick={openCreatePlan}>Create Plan</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.plans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                          <Badge variant="outline" className="font-mono text-[10px]">{plan.id}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Store limit: {plan.store_limit != null ? plan.store_limit : "Unlimited"} | Sort order: {plan.sort_order ?? 0}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={plan.is_active ? "secondary" : "outline"}>
                          {plan.monthly_price != null ? `BDT ${plan.monthly_price}` : "Custom"}
                        </Badge>
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => openEditPlan(plan)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Feature Matrix</CardTitle>
                <CardDescription>Global feature state and which packages get each capability.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.features.map((feature) => (
                  <div key={feature.key} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{feature.name}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{feature.key}</Badge>
                          <Badge variant="outline">{feature.category}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Visible</span>
                        <Switch checked={feature.default_visible} onCheckedChange={(checked) => void toggleFeatureCatalog(feature.key, { default_visible: checked })} />
                        <span className="text-xs text-muted-foreground">Active</span>
                        <Switch checked={feature.is_active} onCheckedChange={(checked) => void toggleFeatureCatalog(feature.key, { is_active: checked })} />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {data.plans.map((plan) => {
                        const enabled = Boolean(data.planFeatures.find((row) => row.plan_id === plan.id && row.feature_key === feature.key)?.enabled);
                        return (
                          <div key={`${plan.id}-${feature.key}`} className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2">
                            <span className="text-sm text-foreground">{plan.name}</span>
                            <Switch checked={enabled} onCheckedChange={(checked) => void togglePlanFeature(plan.id, feature.key, checked)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Subscription Distribution</CardTitle>
                <CardDescription>Current subscription status across all tenant stores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from(new Set(summaries.map((store) => store.subscriptionStatus))).map((status) => (
                  <div key={status} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium text-foreground">{status}</span>
                    <Badge variant="secondary">{summaries.filter((store) => store.subscriptionStatus === status).length}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Needs Billing Attention</CardTitle>
                <CardDescription>Stores without active or trialing subscriptions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {nonActiveSubscriptions.length === 0 ? <p className="text-sm text-muted-foreground">No subscription issues found.</p> : null}
                {nonActiveSubscriptions.map((store) => (
                  <div key={store.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{store.name}</p>
                      <p className="text-xs text-muted-foreground">{store.planName} - {store.subscriptionStatus}</p>
                    </div>
                    <Badge variant="outline">Follow up</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border mt-6">
            <CardHeader>
              <CardTitle>Manual bKash Verification Requests</CardTitle>
              <CardDescription>Review and verify manual bKash &quot;Send Money&quot; transaction submissions from store owners.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingManualInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending manual payment verification requests.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-3 pt-2 font-medium">Store</th>
                        <th className="pb-3 pt-2 font-medium">Plan Package</th>
                        <th className="pb-3 pt-2 font-medium">Amount</th>
                        <th className="pb-3 pt-2 font-medium">Transaction ID (TrxID)</th>
                        <th className="pb-3 pt-2 font-medium">Submitted At</th>
                        <th className="pb-3 pt-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pendingManualInvoices.map((invoice: any) => (
                        <tr key={invoice.id} className="text-foreground">
                          <td className="py-3 font-medium">
                            {invoice.stores?.name || "Unknown Store"}
                            <span className="block text-xs font-normal text-muted-foreground">{invoice.stores?.slug}</span>
                          </td>
                          <td className="py-3 font-mono text-xs">{invoice.plan_id}</td>
                          <td className="py-3 font-semibold">BDT {invoice.amount}</td>
                          <td className="py-3 font-mono text-xs text-primary font-bold">{invoice.provider_invoice_id}</td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {invoice.created_at ? new Date(invoice.created_at).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700 h-8 px-3"
                                onClick={() => approveManualInvoice(invoice)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10 h-8 px-3"
                                onClick={() => rejectManualInvoice(invoice)}
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>CMS Health</CardTitle>
                <CardDescription>Stores with weak or incomplete page-builder setup.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {unhealthyStores.map((store) => (
                  <div key={store.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{store.name}</p>
                        <p className="text-xs text-muted-foreground">/{store.slug}</p>
                      </div>
                      <Badge variant="outline">{store.is_published ? "Published" : "Draft"}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!store.hasHomepage ? <Badge variant="outline">No homepage</Badge> : null}
                      {store.visibleBlockTotal < 3 ? <Badge variant="outline">Low block count</Badge> : null}
                      {store.customPageTotal === 0 ? <Badge variant="outline">No custom pages</Badge> : null}
                      {!store.is_published ? <Badge variant="outline">Unpublished</Badge> : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Email / Notification Failures</CardTitle>
                <CardDescription>Recent delivery attempts that did not report success.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {failingEmailEvents.length === 0 ? <p className="text-sm text-muted-foreground">No recent failures found.</p> : null}
                {failingEmailEvents.slice(0, 12).map((event) => {
                  const store = summaries.find((item) => item.id === event.store_id);
                  return (
                    <div key={event.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-foreground">{event.template_name ?? "Notification"} - {event.status ?? "unknown"}</p>
                      <p className="text-xs text-muted-foreground">{store?.name ?? event.store_id ?? "Platform"} - {event.recipient ?? "no recipient"} - {new Date(event.created_at).toLocaleString()}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle">
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /> Store Lifecycle</CardTitle>
                <CardDescription>Scan, remind, archive, restore, and schedule deletion.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={effectiveSelectedStoreId || undefined} onValueChange={setSelectedStoreId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {summaries.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({store.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={lifecycleAction} onValueChange={(value) => setLifecycleAction(value as typeof lifecycleAction)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LIFECYCLE_ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={() => void runLifecycleAction()} className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  Run Action
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Lifecycle States</CardTitle>
                <CardDescription>Current lifecycle state for each store and its reminder schedule.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summaries.map((store) => (
                  <div key={store.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{store.name}</p>
                        <p className="text-xs text-muted-foreground">/{store.slug}</p>
                      </div>
                      <Badge variant={store.lifecycleStatus === "active" ? "secondary" : "outline"}>
                        {store.lifecycleStatus}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Last activity: {store.lastActivity ?? "never"}</p>
                      <p>Orders: {store.orderTotal}</p>
                      <p>Pages: {store.pageTotal}</p>
                      <p>Blocks: {store.visibleBlockTotal}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> User Exceptions</CardTitle>
                <CardDescription>Grant or revoke a feature for a specific email with optional store scope.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>User Email</Label>
                  <Input value={exceptionEmail} onChange={(event) => setExceptionEmail(event.target.value)} placeholder="merchant@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Feature</Label>
                  <Select value={exceptionFeatureKey} onValueChange={setExceptionFeatureKey}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {data.features.map((feature) => (
                        <SelectItem key={feature.key} value={feature.key}>{feature.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Store Scope</Label>
                  <Select value={exceptionScopeStoreId} onValueChange={setExceptionScopeStoreId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      {summaries.map((store) => (
                        <SelectItem key={store.id} value={store.id}>{store.name} ({store.slug})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{exceptionEnabled ? "Grant feature" : "Revoke feature"}</p>
                    <p className="text-xs text-muted-foreground">Applies even if the package does not include the feature.</p>
                  </div>
                  <Switch checked={exceptionEnabled} onCheckedChange={setExceptionEnabled} />
                </div>
                <div className="grid gap-2">
                  <Label>Note</Label>
                  <Textarea rows={3} value={exceptionNote} onChange={(event) => setExceptionNote(event.target.value)} placeholder="Beta access, support exception, agency pilot..." />
                </div>
                <Button type="button" onClick={() => void saveEmailException()} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Save Exception
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Recent Platform Activity</CardTitle>
                  <CardDescription>Recent CMS admin and lifecycle operations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.lifecycleEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No lifecycle events yet.</div>
                  ) : null}
                  {data.lifecycleEvents.map((event) => {
                    const store = summaries.find((item) => item.id === event.store_id);
                    return (
                      <div key={event.id} className="rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{event.event_type}</p>
                            <p className="text-xs text-muted-foreground">{store?.name ?? event.store_id} - {new Date(event.created_at).toLocaleString()}</p>
                          </div>
                          <Badge variant="outline">{event.status}</Badge>
                        </div>
                        {event.message ? <p className="mt-2 text-sm text-muted-foreground">{event.message}</p> : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Existing Exceptions</CardTitle>
                  <CardDescription>Email-based overrides across stores and global scope.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.emailOverrides.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No email exceptions yet.</div>
                  ) : null}
                  {data.emailOverrides.map((row) => (
                    <div key={row.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{row.normalized_email}</p>
                        <p className="text-xs text-muted-foreground">{row.feature_key} - {row.store_id ?? "global"} - {row.enabled ? "grant" : "revoke"}</p>
                        {row.note ? <p className="mt-1 text-xs text-muted-foreground">{row.note}</p> : null}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void deleteEmailException(row.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update the details of this existing plan." : "Define a new plan with custom properties and pricing."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={savePlan} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="plan-id">Plan ID (Unique identifier)</Label>
              <Input
                id="plan-id"
                disabled={!!editingPlan}
                value={planForm.id}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, id: e.target.value }))}
                placeholder="e.g. custom-tier"
                required
              />
            </div>
            <div>
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                value={planForm.name}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Enterprise"
                required
              />
            </div>
            <div>
              <Label htmlFor="plan-desc">Description</Label>
              <Textarea
                id="plan-desc"
                value={planForm.description}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief summary of the plan benefits..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="plan-price">Monthly Price (BDT)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  value={planForm.monthly_price}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, monthly_price: e.target.value }))}
                  placeholder="e.g. 5000"
                />
              </div>
              <div>
                <Label htmlFor="plan-limit">Store Limit</Label>
                <Input
                  id="plan-limit"
                  type="number"
                  value={planForm.store_limit}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, store_limit: e.target.value }))}
                  placeholder="e.g. 10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="plan-sort">Sort Order</Label>
                <Input
                  id="plan-sort"
                  type="number"
                  value={planForm.sort_order}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, sort_order: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Label htmlFor="plan-active">Is Plan Active</Label>
                <Switch
                  id="plan-active"
                  checked={planForm.is_active}
                  onCheckedChange={(checked) => setPlanForm((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPlan ? "Save Changes" : "Create Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
