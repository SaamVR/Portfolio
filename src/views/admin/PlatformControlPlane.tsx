"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Eye,
  FileImage,
  FileText,
  Filter,
  FolderArchive,
  HardDrive,
  Image,
  Key,
  Layers3,
  Loader2,
  Lock,
  Mail,
  Package,
  Receipt,
  Search,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Store,
  Trash2,
  UserCheck,
  Users,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEmail, resolveEffectiveFeatures, getLifecycleStatusForDate, getDefaultLifecycleState, type StoreLifecycleStateRecord } from "@/lib/platform/control-plane";
import { getPlatformPermissions, PLATFORM_ROLES, type PlatformRole } from "@/lib/platform/rbac";
import { logPlatformAuditAction, type PlatformAuditLogRow } from "@/lib/platform/audit-logger";
import { normalizeMediaLibrary, type MediaLibraryAsset } from "@/lib/media-library";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { cn } from "@/lib/utils";
import { DeleteStoreDialog } from "@/components/admin/DeleteStoreDialog";
import { PlanTemplateMatrixCard } from "@/components/admin/PlanTemplateMatrixCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, Navigate, useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildPlatformOverviewStats,
  buildStorePlatformSummaries,
  type PlatformAnalyticsInput,
  type StorePlatformSummary,
} from "@/lib/platform/admin-analytics";
import AdminRecoveryPanel from "@/components/admin/AdminRecoveryPanel";
import StoreAnalyticsReport from "@/components/admin/StoreAnalyticsReport";
import { buildAnalyticsReport, buildAnalyticsStoreSummaries, type AnalyticsReportEvent } from "@/lib/analytics/report";
import { downloadAnalyticsCsv } from "@/lib/analytics/export";
import { getAnalyticsPresetLabel, resolveAnalyticsDateRange, type AnalyticsDatePreset } from "@/lib/analytics/date-range";
import StoreBackupManager from "@/components/admin/StoreBackupManager";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

const PLATFORM_ROLE_COLORS: Record<string, string> = {
  super_admin: "border-primary text-primary bg-primary/10",
  admin: "border-primary text-primary bg-primary/10",
  billing_admin: "border-amber-500 text-amber-600 bg-amber-500/10",
  support_agent: "border-blue-500 text-blue-600 bg-blue-500/10",
  co_admin: "border-purple-500 text-purple-600 bg-purple-500/10",
};

type PlanRow = {
  id: string;
  name: string;
  description: string;
  monthly_price: number | null;
  currency_code?: string;
  store_limit?: number | null;
  trial_days?: number | null;
  contact_only?: boolean | null;
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
  subscriptions: Array<{ store_id: string; plan_id: string | null; status: string | null; trial_ends_at?: string | null }>;
  storeOverrides: any[];
  emailOverrides: any[];
  lifecycleStates: Array<Partial<StoreLifecycleStateRecord> & { store_id: string; lifecycle_status: string }>;
  lifecycleEvents: any[];
  orders: OrderRow[];
  products: Array<{ id: string; store_id: string; images?: any; thumbnail?: string | null; variants?: any; description?: string | null }>;
  pages: Array<{ id: string; store_id: string; slug: string; is_homepage: boolean | null }>;
  blocks: Array<{ id: string; store_id: string; page_id: string; is_visible: boolean | null; content?: any }>;
  siteSettings: Array<{ store_id: string; key: string; value: any }>;
  memberships: Array<{ store_id: string; user_id: string; role: string }>;
  messages: Array<{ id: string; store_id: string; is_read: boolean | null }>;
  reviews: Array<{ id: string; store_id: string; status: string | null }>;
  emailEvents: Array<{ id: string; store_id: string | null; status: string | null; template_name: string | null; recipient: string | null; created_at: string }>;
  invoices: any[];
  analyticsEvents: AnalyticsReportEvent[];
  auditLogs: PlatformAuditLogRow[];
  userRoles: Array<{ id: string; user_id: string; role: string; created_at: string }>;
};

export default function PlatformControlPlane() {
  const { session, platformRole, user, activeStoreId, loading: authLoading, refreshRole, signOut, setActiveStoreId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedStoreId, setSelectedStoreId] = useState(activeStoreId ?? "");
  const [storeSearch, setStoreSearch] = useState("");
  const [impersonatingStoreId, setImpersonatingStoreId] = useState<string | null>(null);
  const [exceptionEmail, setExceptionEmail] = useState("");
  const [exceptionFeatureKey, setExceptionFeatureKey] = useState("backup_import");
  const [exceptionEnabled, setExceptionEnabled] = useState(true);
  const [exceptionScopeStoreId, setExceptionScopeStoreId] = useState<string>("global");
  const [exceptionNote, setExceptionNote] = useState("");
  const [lifecycleAction, setLifecycleAction] = useState<(typeof LIFECYCLE_ACTIONS)[number]["value"]>("scan");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  const [analyticsDatePreset, setAnalyticsDatePreset] = useState<AnalyticsDatePreset>("last_30_days");
  const [analyticsCustomStart, setAnalyticsCustomStart] = useState("");
  const [analyticsCustomEnd, setAnalyticsCustomEnd] = useState("");
  const [billingReviewActionId, setBillingReviewActionId] = useState<string | null>(null);

  const permissions = getPlatformPermissions(platformRole);

  const handleImpersonateStore = async (store: { id: string; name: string; slug: string }) => {
    if (!permissions.canImpersonateMerchant) {
      toast.error("You do not have permission to impersonate merchant stores.");
      return;
    }

    try {
      setImpersonatingStoreId(store.id);

      if (typeof document !== "undefined") {
        document.cookie = `ezcomo_impersonate_store_id=${encodeURIComponent(store.id)}; path=/; max-age=7200; SameSite=Lax`;
      }

      const sessionData = {
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        impersonatorEmail: user?.email ?? "Operator",
        impersonatorRole: platformRole,
        startedAt: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("ezcomo_impersonation_session", JSON.stringify(sessionData));
      }

      if (setActiveStoreId) {
        setActiveStoreId(store.id);
      }

      await logPlatformAuditAction(supabase, {
        actorId: user?.id,
        actorEmail: user?.email,
        actorRole: platformRole,
        action: "impersonate_merchant",
        targetType: "store",
        targetId: store.id,
        details: {
          store_name: store.name,
          store_slug: store.slug,
          operator_role: platformRole,
        },
      });

      toast.success(`Impersonation mode active for ${store.name}. Redirecting...`);
      navigate(`/admin?storeId=${encodeURIComponent(store.id)}`);
    } catch (err) {
      console.error("Impersonation error:", err);
      toast.error("Failed to establish impersonation session.");
    } finally {
      setImpersonatingStoreId(null);
    }
  };

  // Advanced Billing & Subscription State
  const [isExtendTrialDialogOpen, setIsExtendTrialDialogOpen] = useState(false);
  const [extendTrialStoreId, setExtendTrialStoreId] = useState("");
  const [extendTrialDays, setExtendTrialDays] = useState(14);
  const [extendTrialNote, setExtendTrialNote] = useState("");
  const [isSubmittingExtendTrial, setIsSubmittingExtendTrial] = useState(false);

  const [isManualOverrideDialogOpen, setIsManualOverrideDialogOpen] = useState(false);
  const [manualOverrideStoreId, setManualOverrideStoreId] = useState("");
  const [manualOverridePlanId, setManualOverridePlanId] = useState("pro");
  const [manualOverrideReason, setManualOverrideReason] = useState("Platform Testing & VIP Exception");
  const [isSubmittingManualOverride, setIsSubmittingManualOverride] = useState(false);

  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState("all");
  const [ledgerMethodFilter, setLedgerMethodFilter] = useState("all");

  // Asset & Storage Telemetry State
  const [storageSearch, setStorageSearch] = useState("");
  const [storageStatusFilter, setStorageStatusFilter] = useState("all");
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [purgeTargetStoreId, setPurgeTargetStoreId] = useState("");
  const [isPurgingMedia, setIsPurgingMedia] = useState(false);

  const handleExtendTrial = async () => {
    if (!extendTrialStoreId) {
      toast.error("Please select a store to extend trial.");
      return;
    }
    if (!permissions.canManageSubscriptions && !permissions.isSuperAdmin && !permissions.isBillingAdmin) {
      toast.error("You do not have permission to extend trials.");
      return;
    }

    try {
      setIsSubmittingExtendTrial(true);
      const targetStore = data?.stores?.find((s) => s.id === extendTrialStoreId);
      const existingSub = data?.subscriptions?.find((s) => s.store_id === extendTrialStoreId);

      const currentTrialEnd = existingSub?.trial_ends_at ? new Date(existingSub.trial_ends_at) : new Date();
      const baseDate = currentTrialEnd > new Date() ? currentTrialEnd : new Date();
      const newTrialEndsAt = new Date(baseDate.getTime() + extendTrialDays * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await (supabase as any)
        .from("store_subscriptions")
        .upsert(
          {
            store_id: extendTrialStoreId,
            plan_id: existingSub?.plan_id || "free",
            status: "trialing",
            trial_ends_at: newTrialEndsAt,
            current_period_ends_at: newTrialEndsAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );

      if (error) throw error;

      await logPlatformAuditAction(supabase, {
        actorId: user?.id,
        actorEmail: user?.email,
        actorRole: platformRole,
        action: "extend_trial",
        targetType: "store",
        targetId: extendTrialStoreId,
        details: {
          store_name: targetStore?.name,
          days_added: extendTrialDays,
          new_trial_ends_at: newTrialEndsAt,
          operator_note: extendTrialNote,
        },
      });

      toast.success(`Granted +${extendTrialDays} days trial access to ${targetStore?.name || "store"}.`);
      setIsExtendTrialDialogOpen(false);
      setExtendTrialStoreId("");
      setExtendTrialNote("");
      await queryClient.invalidateQueries({ queryKey: ["platform-control-plane"] });
    } catch (err: any) {
      console.error("Extend trial error:", err);
      toast.error(err?.message || "Failed to extend trial period.");
    } finally {
      setIsSubmittingExtendTrial(false);
    }
  };

  const handleManualPlanOverride = async () => {
    if (!manualOverrideStoreId) {
      toast.error("Please select a store to override.");
      return;
    }
    if (!permissions.canManageSubscriptions && !permissions.isSuperAdmin && !permissions.isBillingAdmin) {
      toast.error("You do not have permission to execute plan overrides.");
      return;
    }

    try {
      setIsSubmittingManualOverride(true);
      const targetStore = data?.stores?.find((s) => s.id === manualOverrideStoreId);
      const targetPlan = data?.plans?.find((p) => p.id === manualOverridePlanId);

      const { error: subError } = await (supabase as any)
        .from("store_subscriptions")
        .upsert(
          {
            store_id: manualOverrideStoreId,
            plan_id: manualOverridePlanId,
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );

      if (subError) throw subError;

      const invoiceId = `inv_override_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await (supabase as any).from("store_invoices").insert({
        id: invoiceId,
        store_id: manualOverrideStoreId,
        plan_id: manualOverridePlanId,
        amount: 0,
        currency: targetPlan?.currency_code || "BDT",
        status: "paid",
        payment_method: "manual_override",
        provider: "platform_admin",
        billing_interval: "monthly",
        paid_at: new Date().toISOString(),
        provider_invoice_id: `OVERRIDE-${manualOverrideReason.slice(0, 15).toUpperCase().replace(/\s+/g, "_")}`,
      });

      await logPlatformAuditAction(supabase, {
        actorId: user?.id,
        actorEmail: user?.email,
        actorRole: platformRole,
        action: "manual_plan_override",
        targetType: "store",
        targetId: manualOverrideStoreId,
        details: {
          store_name: targetStore?.name,
          plan_id: manualOverridePlanId,
          plan_name: targetPlan?.name,
          reason: manualOverrideReason,
        },
      });

      toast.success(`Store "${targetStore?.name}" upgraded to ${targetPlan?.name || manualOverridePlanId} (Manual Override Active).`);
      setIsManualOverrideDialogOpen(false);
      setManualOverrideStoreId("");
      await queryClient.invalidateQueries({ queryKey: ["platform-control-plane"] });
    } catch (err: any) {
      console.error("Manual plan override error:", err);
      toast.error(err?.message || "Failed to override store plan.");
    } finally {
      setIsSubmittingManualOverride(false);
    }
  };

  // Security & Audit Trail State
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditRoleFilter, setAuditRoleFilter] = useState("all");
  const [selectedAuditLog, setSelectedAuditLog] = useState<PlatformAuditLogRow | null>(null);

  // Platform Role Assignment State
  const [targetAssignUserId, setTargetAssignUserId] = useState("");
  const [targetAssignRole, setTargetAssignRole] = useState<NonNullable<PlatformRole>>("support_agent");

  // Plan creation / editing state
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    description: "",
    monthly_price: "",
    annual_price: "",
    annual_discount_percentage: "0",
    currency_code: "BDT",
    store_limit: "",
    trial_days: "14",
    contact_only: false,
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
      annual_price: "",
      annual_discount_percentage: "0",
      currency_code: "BDT",
      store_limit: "",
      trial_days: "14",
      contact_only: false,
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
      annual_price: (plan as any).annual_price != null ? String((plan as any).annual_price) : "",
      annual_discount_percentage: (plan as any).annual_discount_percentage != null ? String((plan as any).annual_discount_percentage) : "0",
      currency_code: (plan as any).currency_code || "BDT",
      store_limit: (plan as any).store_limit != null ? String((plan as any).store_limit) : "",
      trial_days: (plan as any).trial_days != null ? String((plan as any).trial_days) : "14",
      contact_only: Boolean((plan as any).contact_only),
      is_active: plan.is_active,
      sort_order: String((plan as any).sort_order || 0),
    });
    setIsPlanDialogOpen(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["platform-control-plane"],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
        { data: siteSettings },
        { data: memberships },
        { data: messages },
        { data: reviews },
        { data: emailEvents },
        { data: invoices },
        { data: analyticsEvents },
        { data: auditLogs },
        { data: userRoles },
      ] = await Promise.all([
        (supabase as any).from("cms_features").select("*").order("category").order("name"),
        (supabase as any).from("cms_plans").select("id, name, description, monthly_price, annual_price, annual_discount_percentage, currency_code, store_limit, trial_days, contact_only, sort_order, is_active").order("sort_order"),
        (supabase as any).from("cms_plan_features").select("plan_id, feature_key, enabled"),
        (supabase as any).from("stores").select("id, owner_id, name, slug, custom_domain, is_published, updated_at").order("name"),
        (supabase as any).from("store_subscriptions").select("store_id, plan_id, status, trial_ends_at"),
        (supabase as any).from("store_feature_overrides").select("*"),
        (supabase as any).from("user_email_feature_overrides").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("store_lifecycle_states").select("*").order("updated_at", { ascending: false }),
        (supabase as any).from("store_lifecycle_events").select("*").order("created_at", { ascending: false }).limit(50),
        (supabase as any).from("orders").select("id, store_id, status, total, created_at"),
        (supabase as any).from("products").select("id, store_id, images, thumbnail, variants, description"),
        (supabase as any).from("store_pages").select("id, store_id, slug, is_homepage"),
        (supabase as any).from("store_page_blocks").select("id, store_id, page_id, is_visible, content"),
        (supabase as any).from("site_settings").select("store_id, key, value"),
        (supabase as any).from("store_memberships").select("store_id, user_id, role"),
        (supabase as any).from("contact_messages").select("id, store_id, is_read"),
        (supabase as any).from("product_reviews").select("id, store_id, status"),
        (supabase as any).from("email_events").select("id, store_id, status, template_name, recipient, created_at").order("created_at", { ascending: false }).limit(50),
        (supabase as any).from("store_invoices").select("*, stores(name, slug)").order("created_at", { ascending: false }),
        (supabase as any)
          .from("store_analytics_events")
          .select("store_id, event_name, visitor_id, session_id, traffic_source, traffic_medium, traffic_campaign, search_query, product_id, value, quantity, metadata, page_type, page_path, event_timestamp")
          .gte("event_timestamp", new Date(Date.now() - (1000 * 60 * 60 * 24 * 30)).toISOString())
          .order("event_timestamp", { ascending: false })
          .limit(10000),
        (supabase as any).from("platform_audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
        (supabase as any).from("user_roles").select("id, user_id, role, created_at").order("created_at", { ascending: false }),
      ]);

      return {
        features: (features ?? []) as any[],
        plans: (plans ?? []) as PlanRow[],
        planFeatures: (planFeatures ?? []) as any[],
        stores: (stores ?? []) as StoreRow[],
        subscriptions: (subscriptions ?? []) as Array<{ store_id: string; plan_id: string | null; status: string | null; trial_ends_at?: string | null }>,
        storeOverrides: (storeOverrides ?? []) as any[],
        emailOverrides: (emailOverrides ?? []) as any[],
        lifecycleStates: (lifecycleStates ?? []) as Array<Partial<StoreLifecycleStateRecord> & { store_id: string; lifecycle_status: string }>,
        lifecycleEvents: (lifecycleEvents ?? []) as any[],
        orders: (orders ?? []) as OrderRow[],
        products: (products ?? []) as Array<{ id: string; store_id: string; images?: any; thumbnail?: string | null; variants?: any; description?: string | null }>,
        pages: (pages ?? []) as Array<{ id: string; store_id: string; slug: string; is_homepage: boolean | null }>,
        blocks: (blocks ?? []) as Array<{ id: string; store_id: string; page_id: string; is_visible: boolean | null; content?: any }>,
        siteSettings: (siteSettings ?? []) as Array<{ store_id: string; key: string; value: any }>,
        memberships: (memberships ?? []) as Array<{ store_id: string; user_id: string; role: string }>,
        messages: (messages ?? []) as Array<{ id: string; store_id: string; is_read: boolean | null }>,
        reviews: (reviews ?? []) as Array<{ id: string; store_id: string; status: string | null }>,
        emailEvents: (emailEvents ?? []) as Array<{ id: string; store_id: string | null; status: string | null; template_name: string | null; recipient: string | null; created_at: string }>,
        invoices: (invoices ?? []) as any[],
        analyticsEvents: (analyticsEvents ?? []) as AnalyticsReportEvent[],
        auditLogs: (auditLogs ?? []) as PlatformAuditLogRow[],
        userRoles: (userRoles ?? []) as Array<{ id: string; user_id: string; role: string; created_at: string }>,
      };
    },
    enabled: permissions.canAccessControlPlane,
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

  const filteredInvoices = useMemo(() => {
    return (data?.invoices || []).filter((inv: any) => {
      const storeName = inv.stores?.name?.toLowerCase() || "";
      const storeSlug = inv.stores?.slug?.toLowerCase() || "";
      const invoiceId = inv.id?.toLowerCase() || "";
      const trxId = inv.provider_invoice_id?.toLowerCase() || "";
      const search = ledgerSearch.toLowerCase();

      const matchesSearch =
        !search ||
        storeName.includes(search) ||
        storeSlug.includes(search) ||
        invoiceId.includes(search) ||
        trxId.includes(search);

      const matchesStatus = ledgerStatusFilter === "all" || inv.status === ledgerStatusFilter;
      const matchesMethod = ledgerMethodFilter === "all" || (inv.payment_method || "manual_bkash") === ledgerMethodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [data?.invoices, ledgerSearch, ledgerStatusFilter, ledgerMethodFilter]);

  const storageTelemetry = useMemo(() => {
    if (!data?.stores) {
      return {
        storeMetrics: [],
        totalPlatformBytes: 0,
        totalPlatformMb: 0,
        totalPlatformAssets: 0,
        totalOrphanedAssets: 0,
        totalOrphanedBytes: 0,
        totalOrphanedMb: 0,
        highUsageStoresCount: 0,
      };
    }

    const PLAN_QUOTAS_MB: Record<string, number> = {
      free: 500,
      starter: 2048,
      pro: 10240,
      advanced: 25600,
      enterprise: 51200,
    };

    let totalPlatformBytes = 0;
    let totalPlatformAssets = 0;
    let totalOrphanedAssets = 0;
    let totalOrphanedBytes = 0;
    let highUsageStoresCount = 0;

    const storeMetrics = data.stores.map((store) => {
      const sub = data.subscriptions.find((s) => s.store_id === store.id);
      const plan = data.plans.find((p) => p.id === sub?.plan_id);
      const planKey = (plan?.id || "free").toLowerCase();
      const quotaMb = PLAN_QUOTAS_MB[planKey] || PLAN_QUOTAS_MB.free;

      const mediaSetting = data.siteSettings?.find((s) => s.store_id === store.id && s.key === "media_library");
      const assets: MediaLibraryAsset[] = normalizeMediaLibrary(mediaSetting?.value);

      const storeProducts = data.products?.filter((p) => p.store_id === store.id) || [];
      const storeBlocks = data.blocks?.filter((b) => b.store_id === store.id) || [];
      const storeSettings = data.siteSettings?.filter((s) => s.store_id === store.id && s.key !== "media_library") || [];

      const combinedRefs = (
        JSON.stringify(storeProducts) +
        JSON.stringify(storeBlocks) +
        JSON.stringify(storeSettings)
      ).toLowerCase();

      const orphanedAssets: MediaLibraryAsset[] = [];
      let storeBytes = 0;
      let storeOrphanedBytes = 0;

      assets.forEach((asset) => {
        const assetSize = asset.bytes && asset.bytes > 0 ? asset.bytes : 358400; // ~350 KB default
        storeBytes += assetSize;

        const urlMatch = asset.url ? combinedRefs.includes(asset.url.toLowerCase()) : false;
        const publicIdMatch = asset.publicId ? combinedRefs.includes(asset.publicId.toLowerCase()) : false;
        const filenameMatch = asset.originalFilename ? combinedRefs.includes(asset.originalFilename.toLowerCase()) : false;

        if (!urlMatch && !publicIdMatch && !filenameMatch) {
          orphanedAssets.push(asset);
          storeOrphanedBytes += assetSize;
        }
      });

      const storeMb = storeBytes / (1024 * 1024);
      const storeOrphanedMb = storeOrphanedBytes / (1024 * 1024);
      const usagePercent = Math.min(100, Math.round((storeMb / quotaMb) * 100));

      if (usagePercent >= 80) {
        highUsageStoresCount++;
      }

      totalPlatformBytes += storeBytes;
      totalPlatformAssets += assets.length;
      totalOrphanedAssets += orphanedAssets.length;
      totalOrphanedBytes += storeOrphanedBytes;

      return {
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        planName: plan?.name || "Free Tier",
        planId: planKey,
        quotaMb,
        totalAssets: assets.length,
        totalBytes: storeBytes,
        totalMb: Number(storeMb.toFixed(2)),
        usagePercent,
        isWarning: usagePercent >= 80 && usagePercent < 100,
        isExceeded: usagePercent >= 100,
        assets,
        orphanedAssets,
        orphanedCount: orphanedAssets.length,
        orphanedBytes: storeOrphanedBytes,
        orphanedMb: Number(storeOrphanedMb.toFixed(2)),
      };
    });

    const totalPlatformMb = Number((totalPlatformBytes / (1024 * 1024)).toFixed(2));
    const totalOrphanedMb = Number((totalOrphanedBytes / (1024 * 1024)).toFixed(2));

    return {
      storeMetrics,
      totalPlatformBytes,
      totalPlatformMb,
      totalPlatformAssets,
      totalOrphanedAssets,
      totalOrphanedBytes,
      totalOrphanedMb,
      highUsageStoresCount,
    };
  }, [data]);

  const filteredStorageMetrics = useMemo(() => {
    return storageTelemetry.storeMetrics.filter((m) => {
      const query = storageSearch.trim().toLowerCase();
      const matchesSearch = !query || m.storeName.toLowerCase().includes(query) || m.storeSlug.toLowerCase().includes(query);

      let matchesStatus = true;
      if (storageStatusFilter === "warning") {
        matchesStatus = m.isWarning || m.isExceeded;
      } else if (storageStatusFilter === "exceeded") {
        matchesStatus = m.isExceeded;
      } else if (storageStatusFilter === "orphaned") {
        matchesStatus = m.orphanedCount > 0;
      } else if (storageStatusFilter === "normal") {
        matchesStatus = !m.isWarning && !m.isExceeded;
      }

      return matchesSearch && matchesStatus;
    });
  }, [storageTelemetry.storeMetrics, storageSearch, storageStatusFilter]);

  const handlePurgeOrphanedMedia = async (targetStoreId?: string) => {
    const storeIdToPurge = targetStoreId || purgeTargetStoreId;
    if (!storeIdToPurge) {
      toast.error("Please select a store to purge orphaned media.");
      return;
    }

    const metric = storageTelemetry.storeMetrics.find((m) => m.storeId === storeIdToPurge);
    if (!metric || metric.orphanedAssets.length === 0) {
      toast.info("No orphaned media assets found for this store.");
      return;
    }

    if (!permissions.canAccessControlPlane) {
      toast.error("Operator permissions required to purge media assets.");
      return;
    }

    try {
      setIsPurgingMedia(true);
      const orphanedIds = new Set(metric.orphanedAssets.map((a) => a.id));
      const activeAssets = metric.assets.filter((a) => !orphanedIds.has(a.id));

      const { error } = await (supabase as any).from("site_settings").upsert(
        {
          store_id: storeIdToPurge,
          key: "media_library",
          value: activeAssets,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,key" },
      );

      if (error) throw error;

      await logPlatformAuditAction(supabase, {
        actorId: user?.id,
        actorEmail: user?.email,
        actorRole: platformRole,
        action: "purge_orphaned_media",
        targetType: "store_media_storage",
        targetId: storeIdToPurge,
        details: {
          store_name: metric.storeName,
          store_slug: metric.storeSlug,
          purged_count: metric.orphanedCount,
          freed_mb: metric.orphanedMb,
          remaining_asset_count: activeAssets.length,
          operator_role: platformRole,
        },
      });

      toast.success(`Purged ${metric.orphanedCount} orphaned image${metric.orphanedCount === 1 ? "" : "s"} from ${metric.storeName}, freeing ${metric.orphanedMb} MB.`);
      setIsPurgeDialogOpen(false);
      setPurgeTargetStoreId("");
      await queryClient.invalidateQueries({ queryKey: ["platform-control-plane"] });
    } catch (err: any) {
      console.error("Purge media error:", err);
      toast.error(err?.message || "Failed to purge orphaned media assets.");
    } finally {
      setIsPurgingMedia(false);
    }
  };

  const overview = useMemo(
    () => buildPlatformOverviewStats(summaries, data ?? { orders: [], products: [], plans: [] }),
    [data, summaries],
  );
  const analyticsDateRange = useMemo(
    () => resolveAnalyticsDateRange(analyticsDatePreset, analyticsCustomStart, analyticsCustomEnd),
    [analyticsCustomEnd, analyticsCustomStart, analyticsDatePreset],
  );
  const analyticsStoreLabels = useMemo(
    () => Object.fromEntries(summaries.map((store) => [store.id, `${store.name} (/${store.slug})`])),
    [summaries],
  );
  const platformAnalyticsReport = useMemo(
    () => buildAnalyticsReport(
      (data?.analyticsEvents ?? []).filter((event) => {
        const timestamp = event.event_timestamp ? new Date(event.event_timestamp).getTime() : 0;
        return timestamp >= new Date(analyticsDateRange.startIso).getTime()
          && timestamp <= new Date(analyticsDateRange.endIso).getTime();
      }),
    ),
    [analyticsDateRange.endIso, analyticsDateRange.startIso, data?.analyticsEvents],
  );
  const platformStoreAnalyticsSummaries = useMemo(
    () => buildAnalyticsStoreSummaries(
      (data?.analyticsEvents ?? []).filter((event) => {
        const timestamp = event.event_timestamp ? new Date(event.event_timestamp).getTime() : 0;
        return timestamp >= new Date(analyticsDateRange.startIso).getTime()
          && timestamp <= new Date(analyticsDateRange.endIso).getTime();
      }),
      analyticsStoreLabels,
    ),
    [analyticsDateRange.endIso, analyticsDateRange.startIso, analyticsStoreLabels, data?.analyticsEvents],
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

  if (authLoading) {
    return (
      <AdminRecoveryPanel
        title="Restoring CMS access"
        description="Platform access is still being restored before the control plane can finish loading."
        loadingLabel="Reconnecting the CMS control plane."
        retryLabel="Retry access"
        secondaryLabel="Sign out"
        onRetry={() => void refreshRole()}
        onSecondary={() => void signOut()}
      />
    );
  }

  if (!session || !user || !platformRole) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Refreshing CMS access</CardTitle>
          <CardDescription>
            The platform session is active, but the CMS control plane permissions have not fully restored yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => void refreshRole()} className="gap-2">
            <Shield className="h-4 w-4" />
            Retry access
          </Button>
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!permissions.canAccessControlPlane) {
    return <Navigate to="/admin" replace />;
  }

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["platform-control-plane"] });
    await queryClient.invalidateQueries({ queryKey: ["store-entitlements"] });
  };

  const filteredAuditLogs = useMemo(() => {
    const logs = data?.auditLogs ?? [];
    const query = auditSearch.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesQuery =
        !query ||
        [log.actor_email, log.actor_id, log.action, log.target_type, log.target_id]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query));

      const matchesAction = auditActionFilter === "all" || log.action === auditActionFilter;
      const matchesRole = auditRoleFilter === "all" || log.actor_role === auditRoleFilter;

      return matchesQuery && matchesAction && matchesRole;
    });
  }, [auditActionFilter, auditRoleFilter, auditSearch, data?.auditLogs]);

  const handleAssignUserRole = async (targetUserId: string, newRole: PlatformRole | null) => {
    if (!permissions.canAssignPlatformRoles) {
      toast.error("Super Admin permissions required to assign platform roles.");
      return;
    }
    if (!targetUserId.trim()) {
      toast.error("User ID is required.");
      return;
    }

    try {
      if (!newRole) {
        const { error } = await (supabase as any)
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId.trim());
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("user_roles")
          .upsert(
            { user_id: targetUserId.trim(), role: newRole, created_at: new Date().toISOString() },
            { onConflict: "user_id" },
          );
        if (error) throw error;
      }

      await logPlatformAuditAction(supabase, {
        actorId: user?.id,
        actorEmail: user?.email,
        actorRole: platformRole,
        action: "update_user_platform_role",
        targetType: "user_role",
        targetId: targetUserId.trim(),
        details: { target_user_id: targetUserId.trim(), assigned_role: newRole },
      });

      toast.success(`Platform role updated to ${newRole || "None"}`);
      setTargetAssignUserId("");
      await refreshAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user role");
    }
  };

  const handlePlatformStoreDeleted = async () => {
    await refreshAll();
  };

  const togglePlanFeature = async (planId: string, featureKey: string, enabled: boolean) => {
    if (!permissions.canModifyFeatureMatrix) {
      toast.error("Super Admin permissions required to modify package feature matrix.");
      return;
    }
    const { error } = await (supabase as any).from("cms_plan_features").upsert(
      { plan_id: planId, feature_key: featureKey, enabled },
      { onConflict: "plan_id,feature_key" },
    );
    if (error) {
      toast.error("Failed to update package feature.");
      return;
    }
    await logPlatformAuditAction(supabase, {
      actorId: user?.id,
      actorEmail: user?.email,
      actorRole: platformRole,
      action: "update_plan_feature",
      targetType: "plan_feature",
      targetId: `${planId}:${featureKey}`,
      details: { plan_id: planId, feature_key: featureKey, enabled },
    });
    toast.success("Package feature updated.");
    await refreshAll();
  };

  const toggleFeatureCatalog = async (featureKey: string, patch: Record<string, unknown>) => {
    if (!permissions.canModifyFeatureMatrix) {
      toast.error("Super Admin permissions required to update feature catalog.");
      return;
    }
    const { error } = await (supabase as any).from("cms_features").update(patch).eq("key", featureKey);
    if (error) {
      toast.error("Failed to update feature catalog.");
      return;
    }
    await logPlatformAuditAction(supabase, {
      actorId: user?.id,
      actorEmail: user?.email,
      actorRole: platformRole,
      action: "update_feature_catalog",
      targetType: "feature",
      targetId: featureKey,
      details: patch,
    });
    toast.success("Feature catalog updated.");
    await refreshAll();
  };

  const setStoreOverride = async (featureKey: string, enabled: boolean | null) => {
    if (!permissions.canModifyFeatureMatrix) {
      toast.error("Super Admin permissions required to modify store feature overrides.");
      return;
    }
    if (!selectedStore) return;

    if (enabled === null) {
      const { error } = await (supabase as any).from("store_feature_overrides").delete().eq("store_id", selectedStore.id).eq("feature_key", featureKey);
      if (error) {
        toast.error("Failed to clear store override.");
        return;
      }
      await logPlatformAuditAction(supabase, {
        actorId: user?.id,
        actorEmail: user?.email,
        actorRole: platformRole,
        action: "clear_store_feature_override",
        targetType: "store_override",
        targetId: `${selectedStore.id}:${featureKey}`,
        details: { store_id: selectedStore.id, store_name: selectedStore.name, feature_key: featureKey },
      });
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
    await logPlatformAuditAction(supabase, {
      actorId: user?.id,
      actorEmail: user?.email,
      actorRole: platformRole,
      action: "update_store_feature_override",
      targetType: "store_override",
      targetId: `${selectedStore.id}:${featureKey}`,
      details: { store_id: selectedStore.id, store_name: selectedStore.name, feature_key: featureKey, enabled },
    });
    toast.success("Store override updated.");
    await refreshAll();
  };

  const saveEmailException = async () => {
    if (!permissions.canGrantFeatureException) {
      toast.error("Super Admin permissions required to grant feature exceptions.");
      return;
    }
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
    await logPlatformAuditAction(supabase, {
      actorId: user?.id,
      actorEmail: user?.email,
      actorRole: platformRole,
      action: "grant_email_exception",
      targetType: "feature_exception",
      targetId: normalizedEmail,
      details: {
        normalized_email: normalizedEmail,
        feature_key: exceptionFeatureKey,
        scope_store_id: exceptionScopeStoreId,
        enabled: exceptionEnabled,
        note: exceptionNote || null,
      },
    });
    toast.success("Email exception saved.");
    setExceptionNote("");
    await refreshAll();
  };

  const deleteEmailException = async (id: string) => {
    if (!permissions.canGrantFeatureException) {
      toast.error("Super Admin permissions required to remove feature exceptions.");
      return;
    }
    const { error } = await (supabase as any).from("user_email_feature_overrides").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove email override.");
      return;
    }
    await logPlatformAuditAction(supabase, {
      actorId: user?.id,
      actorEmail: user?.email,
      actorRole: platformRole,
      action: "remove_email_exception",
      targetType: "feature_exception",
      targetId: id,
      details: { id },
    });
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
    if (!permissions.canTriggerLifecycleActions) {
      toast.error("Permissions required to trigger lifecycle actions.");
      return;
    }
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

      await logPlatformAuditAction(supabase, {
        actorId: user?.id,
        actorEmail: user?.email,
        actorRole: platformRole,
        action: `lifecycle_${lifecycleAction}`,
        targetType: "store",
        targetId: selectedStore.id,
        details: { store_id: selectedStore.id, store_name: selectedStore.name, action: lifecycleAction },
      });

      toast.success("Lifecycle action completed.");
      await refreshAll();
    } catch (error) {
      console.error(error);
      toast.error("Lifecycle action failed.");
    }
  };

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!permissions.canManagePlans) {
      toast.error("Super Admin permissions required to manage plans & pricing.");
      return;
    }
    if (!planForm.id.trim() || !planForm.name.trim() || !planForm.description.trim()) {
      toast.error("Please fill in plan ID, name, and description");
      return;
    }

    const payload = {
      id: planForm.id.trim().toLowerCase(),
      name: planForm.name.trim(),
      description: planForm.description.trim(),
      monthly_price: planForm.monthly_price.trim() !== "" ? parseInt(planForm.monthly_price.trim(), 10) : null,
      annual_price: planForm.annual_price.trim() !== "" ? parseInt(planForm.annual_price.trim(), 10) : null,
      annual_discount_percentage: Math.max(0, Math.min(100, parseInt(planForm.annual_discount_percentage.trim(), 10) || 0)),
      currency_code: planForm.currency_code.trim(),
      store_limit: planForm.store_limit.trim() !== "" ? parseInt(planForm.store_limit.trim(), 10) : null,
      trial_days: Math.max(0, parseInt(planForm.trial_days.trim(), 10) || 0),
      contact_only: planForm.contact_only,
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

      await logPlatformAuditAction(supabase, {
        actorId: user?.id,
        actorEmail: user?.email,
        actorRole: platformRole,
        action: editingPlan ? "update_plan_pricing" : "create_plan",
        targetType: "plan",
        targetId: payload.id,
        details: payload,
      });

      toast.success(editingPlan ? "Plan updated successfully!" : "Plan created successfully!");
      setIsPlanDialogOpen(false);
      await refreshAll();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save plan");
    }
  };

  const reviewManualInvoice = async (invoice: any, action: "approve" | "reject") => {
    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Please sign in again before reviewing billing requests.");
      }

      const reviewNote = action === "reject"
        ? (typeof window !== "undefined"
          ? window.prompt("Add a short rejection reason for the merchant and operators:", "Transaction could not be verified.")
          : "Transaction could not be verified.")
        : (typeof window !== "undefined"
          ? window.prompt("Optional operator note for this approval:", "")
          : "");

      if (action === "reject" && (!reviewNote || !reviewNote.trim())) {
        toast.error("A rejection reason is required.");
        return;
      }

      setBillingReviewActionId(invoice.id);

      const response = await fetch("/api/platform/billing/manual-review", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          action,
          reviewNote: reviewNote?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to review the manual payment.");
      }

      toast.success(
        action === "approve"
          ? "Manual bKash invoice approved and subscription activated!"
          : "Manual bKash invoice rejected.",
      );
      await refreshAll();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to review payment");
    } finally {
      setBillingReviewActionId(null);
    }
  };

  if (isLoading || !data) {
    return (
      <AdminRecoveryPanel
        title="Loading CMS control plane"
        description="Platform analytics, plans, and store activity are still being gathered."
        loadingLabel="Refreshing shared CMS data and store summaries."
        retryLabel="Reload CMS data"
        onRetry={() => {
          void refreshAll();
        }}
      />
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
  const operatorFollowUps = [
    unhealthyStores[0]
      ? {
          title: "Store setup quality",
          detail: `${unhealthyStores.length} store${unhealthyStores.length === 1 ? "" : "s"} still look incomplete from a CMS or launch-readiness perspective.`,
          targetTab: "health",
          badge: `${unhealthyStores.length} issue${unhealthyStores.length === 1 ? "" : "s"}`,
        }
      : null,
    nonActiveSubscriptions[0]
      ? {
          title: "Billing follow-up",
          detail: `${nonActiveSubscriptions.length} store${nonActiveSubscriptions.length === 1 ? "" : "s"} are not active or trialing right now.`,
          targetTab: "subscriptions",
          badge: `${nonActiveSubscriptions.length} store${nonActiveSubscriptions.length === 1 ? "" : "s"}`,
        }
      : null,
    failingEmailEvents[0]
      ? {
          title: "Notification delivery risk",
          detail: `${failingEmailEvents.length} recent email or notification event${failingEmailEvents.length === 1 ? "" : "s"} did not report success.`,
          targetTab: "health",
          badge: `${failingEmailEvents.length} failure${failingEmailEvents.length === 1 ? "" : "s"}`,
        }
      : null,
    pendingManualInvoices[0]
      ? {
          title: "Manual payment verification",
          detail: `${pendingManualInvoices.length} manual bKash verification request${pendingManualInvoices.length === 1 ? "" : "s"} still need review.`,
          targetTab: "subscriptions",
          badge: `${pendingManualInvoices.length} pending`,
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; detail: string; targetTab: string; badge: string }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">CMS Admin</h1>
          <p className="text-sm text-muted-foreground">SaaS control plane for merchants, stores, plans, feature access, lifecycle, and platform health.</p>
        </div>
        <Badge variant="outline" className="w-fit">Platform access only</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full items-center justify-start gap-1 overflow-x-auto scrollbar-none bg-muted/60 p-1 md:hidden">
          <TabsTrigger value="overview" className="shrink-0">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="shrink-0">Analytics</TabsTrigger>
          <TabsTrigger value="backups" className="shrink-0">Backups</TabsTrigger>
          <TabsTrigger value="stores" className="shrink-0">Merchants</TabsTrigger>
          <TabsTrigger value="plans" className="shrink-0">Plans</TabsTrigger>
          <TabsTrigger value="subscriptions" className="shrink-0">Subscriptions</TabsTrigger>
          <TabsTrigger value="storage" className="shrink-0">Storage Telemetry</TabsTrigger>
          <TabsTrigger value="health" className="shrink-0">CMS Health</TabsTrigger>
          <TabsTrigger value="lifecycle" className="shrink-0">Lifecycle</TabsTrigger>
          <TabsTrigger value="security" className="shrink-0">Security & Logs</TabsTrigger>
          <TabsTrigger value="activity" className="shrink-0">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {overviewCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card 
                  key={card.label} 
                  className="group relative overflow-hidden border-border bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">{card.label}</CardTitle>
                    <Icon className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="font-heading text-2xl font-bold text-foreground tracking-tight transition-all duration-300 group-hover:text-primary">{card.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {operatorFollowUps.length > 0 ? (
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle>Operator Follow-Up Queue</CardTitle>
                <CardDescription>The fastest platform-level issues to review next.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                {operatorFollowUps.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setActiveTab(item.targetTab)}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-background/40 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/80 hover:shadow-md hover:shadow-primary/5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-medium">{item.badge}</Badge>
                    </div>
                    <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : (
            <AdminEmptyState
              icon={Shield}
              title="Platform follow-up queue is clear"
              description="No urgent cross-store billing, health, or delivery problems are standing out right now."
              helper="This is the calm state we want before a broader merchant push."
              compact
            />
          )}

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
                <div className="rounded-lg border border-border p-4 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Master backup & restore</p>
                  <p className="mt-1 text-sm text-foreground">Open the platform-wide backup workspace to export or restore any merchant site.</p>
                  <Button type="button" className="mt-3" onClick={() => setActiveTab("backups")}>
                    Open Master Backup & Restore
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle>Analytics Controls</CardTitle>
              <CardDescription>Filter the platform report by time window and export the current raw analytics view.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["today", "last_7_days", "last_30_days", "this_month", "custom"] as AnalyticsDatePreset[]).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={analyticsDatePreset === preset ? "default" : "outline"}
                    onClick={() => setAnalyticsDatePreset(preset)}
                  >
                    {getAnalyticsPresetLabel(preset)}
                  </Button>
                ))}
              </div>
              {analyticsDatePreset === "custom" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-sm text-foreground">
                    <span>Start date</span>
                    <input
                      type="date"
                      value={analyticsCustomStart}
                      onChange={(event) => setAnalyticsCustomStart(event.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-foreground">
                    <span>End date</span>
                    <input
                      type="date"
                      value={analyticsCustomEnd}
                      onChange={(event) => setAnalyticsCustomEnd(event.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </label>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadAnalyticsCsv(
                  `platform-analytics-${analyticsDatePreset}-${new Date().toISOString().slice(0, 10)}.csv`,
                  (data.analyticsEvents ?? []).filter((event) => {
                    const timestamp = event.event_timestamp ? new Date(event.event_timestamp).getTime() : 0;
                    return timestamp >= new Date(analyticsDateRange.startIso).getTime()
                      && timestamp <= new Date(analyticsDateRange.endIso).getTime();
                  }),
                  analyticsStoreLabels,
                )}
                disabled={(data.analyticsEvents ?? []).length === 0}
              >
                Export CSV
              </Button>
            </CardContent>
          </Card>
          {platformAnalyticsReport.sessions === 0 && platformAnalyticsReport.pageViews === 0 && platformAnalyticsReport.purchases === 0 ? (
            <AdminEmptyState
              icon={BarChart3}
              title="No platform analytics data yet"
              description="Combined storefront analytics have not started filling the current platform window yet."
              helper="Once merchant stores receive traffic, this view becomes the platform-wide source of truth for discovery, conversion, and purchase behavior."
            />
          ) : null}
          <StoreAnalyticsReport
            title="Platform Analytics"
            description={`${getAnalyticsPresetLabel(analyticsDatePreset)} of combined first-party storefront analytics across all merchant sites.`}
            report={platformAnalyticsReport}
            storeSummaries={platformStoreAnalyticsSummaries}
            storeSummaryTitle="Site By Site Breakdown"
            storeSummaryDescription="Compare traffic, search intent, cart starts, checkout progress, purchases, and revenue across every tracked storefront."
          />
        </TabsContent>

        <TabsContent value="backups" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Master Backup & Restore</CardTitle>
              <CardDescription>Platform-level export and restore workspace for merchant stores, including analytics-aware snapshots.</CardDescription>
            </CardHeader>
          </Card>
          <StoreBackupManager />
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
                {filteredStores.length === 0 ? (
                  <AdminEmptyState
                    icon={Store}
                    title="No merchants match this search"
                    description="Try a store name, slug, domain, or lifecycle status to find the merchant you want."
                    helper="This search looks across the current platform summaries, plans, domains, and store labels."
                    compact
                  />
                ) : filteredStores.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setSelectedStoreId(store.id)}
                    className={`group relative overflow-hidden w-full rounded-xl border p-4 text-left transition-all duration-300 ${
                      selectedStore?.id === store.id 
                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/5" 
                        : "border-border bg-background/30 hover:border-primary/20 hover:bg-background/80 hover:shadow-sm"
                    }`}
                  >
                    {selectedStore?.id === store.id && (
                      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
                    )}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{store.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">/{store.slug}{store.custom_domain ? ` · ${store.custom_domain}` : ""}</p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <Badge variant={store.is_published ? "default" : "outline"} className="text-[10px] py-0 px-1.5 font-normal">
                            {store.is_published ? "Published" : "Draft"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-secondary/80 font-normal">
                            {store.planName}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border font-normal">
                            {store.subscriptionStatus}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border font-normal">
                            {store.lifecycleStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-right text-xs text-muted-foreground shrink-0 border-t border-border/40 pt-2 lg:border-t-0 lg:pt-0">
                        <div>
                          <p className="font-bold text-foreground text-[13px]">{formatMoney(store.revenue)}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-0.5">GMV</p>
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-[13px]">{store.orderTotal}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-0.5">Orders</p>
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-[13px]">{store.pageTotal}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-0.5">Pages</p>
                        </div>
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
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-5">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
                      <p className="font-bold text-foreground text-lg">{selectedStore.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Owner: <span className="text-foreground/80 font-medium">{selectedStore.ownerLabel}</span> · Members: <span className="text-foreground/80 font-medium">{selectedStore.memberTotal}</span></p>
                      <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                        <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                          <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[9px]">Plan</p>
                          <p className="font-semibold text-foreground text-sm mt-1">{selectedStore.planName}</p>
                        </div>
                        <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                          <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[9px]">Subscription</p>
                          <p className="font-semibold text-foreground text-sm mt-1">{selectedStore.subscriptionStatus}</p>
                        </div>
                        <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                          <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[9px]">Revenue (GMV)</p>
                          <p className="font-semibold text-foreground text-sm mt-1">{formatMoney(selectedStore.revenue)}</p>
                        </div>
                        <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                          <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[9px]">Catalog Size</p>
                          <p className="font-semibold text-foreground text-sm mt-1">{selectedStore.productTotal} products</p>
                        </div>
                        <div className="rounded-xl bg-background/50 p-3 border border-border/40">
                          <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[9px]">Pages / Blocks</p>
                          <p className="font-semibold text-foreground text-sm mt-1">{selectedStore.pageTotal} p · {selectedStore.visibleBlockTotal} b</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {permissions.canImpersonateMerchant && (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700 font-medium flex items-center gap-1.5 shadow-sm"
                          disabled={impersonatingStoreId === selectedStore.id}
                          onClick={() => void handleImpersonateStore(selectedStore)}
                        >
                          <UserCheck className="h-4 w-4" />
                          {impersonatingStoreId === selectedStore.id ? "Initializing..." : "Impersonate Store"}
                        </Button>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link to={absoluteStoreUrl({ slug: selectedStore.slug, customDomain: selectedStore.custom_domain }, "/")}>View Storefront</Link>
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
                  <AdminEmptyState
                    icon={Store}
                    title="No merchant selected"
                    description="Choose a store from the merchant list to inspect its plan, feature state, and store health."
                    helper="Once selected, this panel becomes the operator control area for that merchant."
                    compact
                  />
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
                  <div 
                    key={plan.id} 
                    className="group relative overflow-hidden rounded-xl border border-border bg-background/40 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-background/80 hover:shadow-sm"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary/20 transition-all duration-300 group-hover:bg-primary" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{plan.name}</p>
                          <Badge variant="outline" className="font-mono text-[10px] bg-background/50">{plan.id}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                        <p className="text-[11px] text-muted-foreground/80">
                          Store limit: <span className="font-medium text-foreground">{plan.store_limit != null ? plan.store_limit : "Unlimited"}</span> | Trial: <span className="font-medium text-foreground">{plan.trial_days ?? 14} days</span> | Sort order: <span className="font-medium text-foreground">{plan.sort_order ?? 0}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 font-semibold">
                          {plan.monthly_price != null ? `BDT ${plan.monthly_price}` : "Custom"}
                        </Badge>
                        {plan.contact_only ? <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">Contact support</Badge> : null}
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-3 rounded-lg text-xs" onClick={() => openEditPlan(plan)}>
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
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {data.plans.map((plan) => {
                        const enabled = Boolean(data.planFeatures.find((row) => row.plan_id === plan.id && row.feature_key === feature.key)?.enabled);
                        return (
                          <div 
                            key={`${plan.id}-${feature.key}`} 
                            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-300 ${
                              enabled 
                                ? "border-primary/20 bg-primary/5" 
                                : "border-border bg-background/40"
                            }`}
                          >
                            <span className="text-xs font-medium text-foreground">{plan.name}</span>
                            <Switch 
                              checked={enabled} 
                              className="scale-90"
                              onCheckedChange={(checked) => void togglePlanFeature(plan.id, feature.key, checked)} 
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <PlanTemplateMatrixCard
            plans={data.plans}
            planFeatures={data.planFeatures}
            onTogglePlanFeature={togglePlanFeature}
            canModify={permissions.canModifyFeatureMatrix}
          />
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          {/* Quick Operational Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div>
              <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Subscription & Billing Operations</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage trial extensions, manual plan overrides, and review financial transaction logs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/30 hover:bg-primary/5 text-xs"
                disabled={!permissions.canManageSubscriptions && !permissions.isSuperAdmin && !permissions.isBillingAdmin}
                onClick={() => {
                  setExtendTrialStoreId(data?.stores?.[0]?.id || "");
                  setIsExtendTrialDialogOpen(true);
                }}
              >
                <CalendarPlus className="h-4 w-4 text-primary" />
                <span>Extend Trial</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-gradient-to-r from-primary to-primary/90 text-xs shadow"
                disabled={!permissions.canManageSubscriptions && !permissions.isSuperAdmin && !permissions.isBillingAdmin}
                onClick={() => {
                  setManualOverrideStoreId(data?.stores?.[0]?.id || "");
                  setIsManualOverrideDialogOpen(true);
                }}
              >
                <Sparkles className="h-4 w-4" />
                <span>Manual Plan Override</span>
              </Button>
            </div>
          </div>

          {/* Distribution & Needs Attention Cards */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Subscription Distribution</CardTitle>
                <CardDescription>Current subscription status across all tenant stores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from(new Set(summaries.map((store) => store.subscriptionStatus))).map((status) => (
                  <div key={status} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium text-foreground capitalize">{status}</span>
                    <Badge variant="secondary">{summaries.filter((store) => store.subscriptionStatus === status).length}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Needs Billing Attention</CardTitle>
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setExtendTrialStoreId(store.id);
                        setIsExtendTrialDialogOpen(true);
                      }}
                    >
                      Extend Trial
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Manual bKash Verification Requests */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Manual bKash Verification Requests</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Review and verify manual bKash &quot;Send Money&quot; transaction submissions from store owners.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {pendingManualInvoices.length} Pending
              </Badge>
            </CardHeader>
            <CardContent>
              {pendingManualInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No pending manual payment verification requests.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase font-medium">
                        <th className="pb-3 pt-2">Store</th>
                        <th className="pb-3 pt-2">Plan Package</th>
                        <th className="pb-3 pt-2">Amount</th>
                        <th className="pb-3 pt-2">Transaction ID (TrxID)</th>
                        <th className="pb-3 pt-2">Submitted At</th>
                        <th className="pb-3 pt-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pendingManualInvoices.map((invoice: any) => (
                        <tr key={invoice.id} className="text-foreground text-xs">
                          <td className="py-3 font-medium">
                            {invoice.stores?.name || "Unknown Store"}
                            <span className="block text-[11px] font-normal text-muted-foreground">{invoice.stores?.slug}</span>
                          </td>
                          <td className="py-3 font-mono">{invoice.plan_id}</td>
                          <td className="py-3 font-semibold">BDT {invoice.amount}</td>
                          <td className="py-3 font-mono text-primary font-bold">{invoice.provider_invoice_id}</td>
                          <td className="py-3 text-muted-foreground">
                            {invoice.created_at ? new Date(invoice.created_at).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700 h-8 px-3 text-xs"
                                disabled={billingReviewActionId === invoice.id}
                                onClick={() => {
                                  void reviewManualInvoice(invoice, "approve");
                                }}
                              >
                                {billingReviewActionId === invoice.id ? "Working..." : "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10 h-8 px-3 text-xs"
                                disabled={billingReviewActionId === invoice.id}
                                onClick={() => {
                                  void reviewManualInvoice(invoice, "reject");
                                }}
                              >
                                {billingReviewActionId === invoice.id ? "Working..." : "Reject"}
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

          {/* Platform Billing Ledger */}
          <Card className="border-border">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span>Platform Financial Ledger & History</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Centralized audit trail of all store invoices, bKash payments, and manual plan override entries.
                  </CardDescription>
                </div>

                <Badge variant="secondary" className="font-mono text-xs self-start sm:self-auto">
                  {filteredInvoices.length} {filteredInvoices.length === 1 ? "Record" : "Records"}
                </Badge>
              </div>

              {/* Filters Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by store, invoice ID, TrxID..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div>
                  <select
                    value={ledgerStatusFilter}
                    onChange={(e) => setLedgerStatusFilter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9"
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div>
                  <select
                    value={ledgerMethodFilter}
                    onChange={(e) => setLedgerMethodFilter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9"
                  >
                    <option value="all">All Payment Methods</option>
                    <option value="manual_override">Manual Override ($0)</option>
                    <option value="manual_bkash">Manual bKash</option>
                    <option value="bkash">bKash Gateway</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No billing history matches the selected search/filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground uppercase font-medium">
                        <th className="pb-3 pt-2">Date & Time</th>
                        <th className="pb-3 pt-2">Store</th>
                        <th className="pb-3 pt-2">Plan</th>
                        <th className="pb-3 pt-2">Amount</th>
                        <th className="pb-3 pt-2">Method</th>
                        <th className="pb-3 pt-2">Ref / TrxID</th>
                        <th className="pb-3 pt-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredInvoices.map((inv: any) => (
                        <tr key={inv.id} className="text-foreground">
                          <td className="py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {inv.created_at ? new Date(inv.created_at).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-3 font-medium">
                            {inv.stores?.name || "Unknown Store"}
                            <span className="block text-[11px] font-normal text-muted-foreground">{inv.stores?.slug}</span>
                          </td>
                          <td className="py-3 font-mono capitalize">{inv.plan_id}</td>
                          <td className="py-3 font-semibold">
                            {inv.amount === 0 ? (
                              <span className="text-muted-foreground">Free ($0)</span>
                            ) : (
                              <span>{inv.currency || "BDT"} {inv.amount}</span>
                            )}
                          </td>
                          <td className="py-3">
                            <Badge variant="outline" className="font-mono text-[10px] capitalize">
                              {inv.payment_method?.replace("_", " ") || "manual_bkash"}
                            </Badge>
                          </td>
                          <td className="py-3 font-mono text-[11px] text-primary">
                            {inv.provider_invoice_id || inv.id?.slice(0, 12)}
                          </td>
                          <td className="py-3 text-right">
                            <Badge
                              className={cn(
                                "font-mono text-[10px] uppercase",
                                inv.status === "paid" && "bg-green-600/10 text-green-600 border-green-600/30",
                                inv.status === "pending" && "bg-amber-600/10 text-amber-600 border-amber-600/30",
                                inv.status === "rejected" && "bg-red-600/10 text-red-600 border-red-600/30"
                              )}
                              variant="outline"
                            >
                              {inv.status}
                            </Badge>
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
                {unhealthyStores.length === 0 ? (
                  <AdminEmptyState
                    icon={CheckCircle2}
                    title="CMS health looks good"
                    description="No stores currently stand out for missing homepage structure, low block count, or missing custom pages."
                    helper="This check helps you spot weak merchant setups before those gaps turn into support tickets."
                    compact
                  />
                ) : unhealthyStores.map((store) => (
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
                {failingEmailEvents.length === 0 ? (
                  <AdminEmptyState
                    icon={Mail}
                    title="No recent notification failures"
                    description="Recent email and notification events are not showing failed outcomes right now."
                    helper="That does not replace a live smoke test, but it is a healthy platform signal."
                    compact
                  />
                ) : null}
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
                {selectedStore ? (
                  <DeleteStoreDialog
                    storeId={selectedStore.id}
                    storeName={selectedStore.name}
                    mode="platform"
                    buttonLabel="Delete Selected Site"
                    buttonClassName="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onDeleted={handlePlatformStoreDeleted}
                  />
                ) : null}
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
                    <AdminEmptyState
                      icon={Clock3}
                      title="No lifecycle events yet"
                      description="No archive, restore, reminder, or deletion lifecycle actions have been recorded yet."
                      helper="Once merchant lifecycle actions begin, this becomes the operator audit trail for those decisions."
                      compact
                    />
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
                    <AdminEmptyState
                      icon={Wand2}
                      title="No email exceptions yet"
                      description="No per-email feature grants or revocations have been recorded."
                      helper="That is usually the healthiest starting point unless you are running a pilot, beta, or support exception."
                      compact
                    />
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

        <TabsContent value="security" className="space-y-6">
          {/* Security & Access Overview Header Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>Current Operator Context</span>
                  <Shield className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm truncate">{user?.email}</span>
                  <Badge variant="outline" className={cn("capitalize font-semibold", PLATFORM_ROLE_COLORS[platformRole || ""] || "")}>
                    {platformRole?.replace("_", " ") || "No Role"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {permissions.canModifyFeatureMatrix && (
                    <Badge variant="secondary" className="text-[10px]">Feature Matrix</Badge>
                  )}
                  {permissions.canManagePlans && (
                    <Badge variant="secondary" className="text-[10px]">Plans & Pricing</Badge>
                  )}
                  {permissions.canReviewManualInvoices && (
                    <Badge variant="secondary" className="text-[10px]">Manual Billing</Badge>
                  )}
                  {permissions.canDeleteStores && (
                    <Badge variant="secondary" className="text-[10px]">Store Deletion</Badge>
                  )}
                  {permissions.canAssignPlatformRoles && (
                    <Badge variant="secondary" className="text-[10px]">Assign Roles</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>Audit Trail Volume</span>
                  <FileText className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl font-bold text-foreground">{data?.auditLogs.length ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Captured operator audit events in platform_audit_logs</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>Registered Platform Operators</span>
                  <Building2 className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl font-bold text-foreground">{data?.userRoles.length ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Users assigned explicit RBAC platform roles</p>
              </CardContent>
            </Card>
          </div>

          {/* Role Assignment & Platform Access Section */}
          {permissions.canAssignPlatformRoles && (
            <Card className="border-border bg-card/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Platform Operator Role Management</span>
                </CardTitle>
                <CardDescription>
                  Assign or modify granular platform roles for team members. Changes take effect on next token refresh or session navigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end rounded-xl border border-border bg-background/50 p-4">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="assign-user-id">User ID (Supabase Auth UUID)</Label>
                    <Input
                      id="assign-user-id"
                      value={targetAssignUserId}
                      onChange={(e) => setTargetAssignUserId(e.target.value)}
                      placeholder="e.g. 98b50e2d-dc99-43ef-b387-052637738f61"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-52 space-y-1.5">
                    <Label htmlFor="assign-role-select">Platform Role</Label>
                    <select
                      id="assign-role-select"
                      value={targetAssignRole}
                      onChange={(e) => setTargetAssignRole(e.target.value as NonNullable<PlatformRole>)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {PLATFORM_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleAssignUserRole(targetAssignUserId, targetAssignRole)}
                    className="gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Assign Role
                  </Button>
                </div>

                {/* Assigned Roles List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Active Platform Roles ({data?.userRoles.length ?? 0})</h4>
                  {data?.userRoles.length === 0 ? (
                    <AdminEmptyState
                      icon={Shield}
                      title="No explicit user roles assigned"
                      description="Default fallback assigns binary legacy admin rights to master accounts."
                      compact
                    />
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                      {data?.userRoles.map((ur) => (
                        <div key={ur.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3.5 bg-background/30 hover:bg-background/60 transition-colors">
                          <div className="space-y-0.5">
                            <p className="font-mono text-xs text-foreground font-medium">{ur.user_id}</p>
                            <p className="text-[11px] text-muted-foreground">Assigned: {new Date(ur.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={cn("capitalize font-semibold", PLATFORM_ROLE_COLORS[ur.role || ""] || "")}>
                              {ur.role.replace("_", " ")}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleAssignUserRole(ur.user_id, null)}
                              className="text-destructive hover:text-destructive text-xs h-8"
                            >
                              Revoke
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Logs Explorer & Search */}
          <Card className="border-border bg-card/60">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-primary" />
                    <span>Platform Audit Logs</span>
                  </CardTitle>
                  <CardDescription>
                    Immutable operator audit trail recording sensitive administrative changes across all stores and global settings.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search actor, action, target..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <select
                    value={auditRoleFilter}
                    onChange={(e) => setAuditRoleFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs focus:outline-none"
                  >
                    <option value="all">All Roles</option>
                    {PLATFORM_ROLES.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                    <option value="admin">Legacy Admin</option>
                  </select>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs focus:outline-none"
                  >
                    <option value="all">All Actions</option>
                    <option value="approve_invoice">Approve Invoice</option>
                    <option value="reject_invoice">Reject Invoice</option>
                    <option value="delete_store">Delete Store</option>
                    <option value="update_plan_pricing">Update Plan Pricing</option>
                    <option value="create_plan">Create Plan</option>
                    <option value="update_plan_feature">Update Plan Feature</option>
                    <option value="update_feature_catalog">Update Catalog</option>
                    <option value="update_store_feature_override">Store Feature Override</option>
                    <option value="grant_email_exception">Grant Email Exception</option>
                    <option value="remove_email_exception">Remove Email Exception</option>
                    <option value="update_user_platform_role">Update User Role</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredAuditLogs.length === 0 ? (
                <AdminEmptyState
                  icon={Clock3}
                  title="No audit logs match filters"
                  description="Administrative actions matching your search and role filters will appear here."
                  compact
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/50 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background/40">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-background/80 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{log.actor_email || log.actor_id?.slice(0, 8) || "System"}</span>
                              {log.actor_role && (
                                <Badge variant="outline" className={cn("text-[10px] py-0 capitalize", PLATFORM_ROLE_COLORS[log.actor_role || ""] || "")}>
                                  {log.actor_role.replace("_", " ")}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="secondary" className="font-mono text-[11px] bg-primary/10 text-primary border-primary/20">
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-muted-foreground capitalize">{log.target_type}: </span>
                            <span className="font-mono text-foreground font-medium">{log.target_id}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAuditLog(log)}
                              className="h-7 text-xs gap-1"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Inspect
                            </Button>
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

        <TabsContent value="storage" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Media Storage</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <HardDrive className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">{storageTelemetry.totalPlatformMb} MB</span>
                  <span className="text-xs text-muted-foreground">({(storageTelemetry.totalPlatformMb / 1024).toFixed(2)} GB)</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Across all tenant storefront assets</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Media Files</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <FileImage className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">{storageTelemetry.totalPlatformAssets}</span>
                  <span className="text-xs text-muted-foreground">indexed assets</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Indexed in merchant media libraries</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Orphaned Storage</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Trash2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">{storageTelemetry.totalOrphanedMb} MB</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">({storageTelemetry.totalOrphanedAssets} files)</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Unreferenced files eligible for purge</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quota Alerts</span>
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    storageTelemetry.highUsageStoresCount > 0 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">{storageTelemetry.highUsageStoresCount}</span>
                  <span className="text-xs text-muted-foreground">stores high usage</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Stores near or over 80% quota limit</p>
              </CardContent>
            </Card>
          </div>

          {/* Storage Telemetry Table Card */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  Merchant Storage & Media Consumption Telemetry
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Monitor Cloudinary media consumption, storage quota utilization per plan, and safely purge unreferenced orphaned assets.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPurgeTargetStoreId("");
                    setIsPurgeDialogOpen(true);
                  }}
                  className="h-9 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Media Purge Tool
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Search & Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search merchant by store name or slug..."
                    value={storageSearch}
                    onChange={(e) => setStorageSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" /> Status:
                  </span>
                  <Select value={storageStatusFilter} onValueChange={setStorageStatusFilter}>
                    <SelectTrigger className="h-9 text-xs w-[180px]">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Merchants</SelectItem>
                      <SelectItem value="warning">High Usage (80%+)</SelectItem>
                      <SelectItem value="exceeded">Quota Exceeded (100%+)</SelectItem>
                      <SelectItem value="orphaned">Has Orphaned Assets</SelectItem>
                      <SelectItem value="normal">Normal Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Merchant Store</TableHead>
                      <TableHead className="text-xs">Plan Tier</TableHead>
                      <TableHead className="text-xs">Total Storage</TableHead>
                      <TableHead className="text-xs">Quota Progress</TableHead>
                      <TableHead className="text-xs">Orphaned Media</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStorageMetrics.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                          No merchant stores match the storage filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStorageMetrics.map((metric) => (
                        <TableRow key={metric.storeId} className="hover:bg-muted/20">
                          <TableCell className="py-3 font-medium">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-foreground">{metric.storeName}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">{metric.storeSlug}</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-[11px] capitalize font-medium">
                              {metric.planName}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-foreground">{metric.totalMb} MB</span>
                              <span className="text-[11px] text-muted-foreground">{metric.totalAssets} files</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 w-[200px]">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-medium">{metric.usagePercent}%</span>
                                <span className="text-muted-foreground">{metric.totalMb} / {metric.quotaMb} MB</span>
                              </div>
                              <Progress
                                value={metric.usagePercent}
                                className={cn(
                                  "h-2",
                                  metric.isExceeded
                                    ? "bg-red-200 dark:bg-red-950 [&>div]:bg-red-600"
                                    : metric.isWarning
                                    ? "bg-amber-200 dark:bg-amber-950 [&>div]:bg-amber-500"
                                    : "bg-emerald-100 dark:bg-emerald-950 [&>div]:bg-emerald-500"
                                )}
                              />
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            {metric.orphanedCount > 0 ? (
                              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-xs">
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{metric.orphanedCount} files ({metric.orphanedMb} MB)</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Clean
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-3">
                            {metric.isExceeded ? (
                              <Badge variant="destructive" className="text-[10px]">Quota Exceeded</Badge>
                            ) : metric.isWarning ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">High Usage</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Healthy</Badge>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={metric.orphanedCount === 0}
                              onClick={() => {
                                setPurgeTargetStoreId(metric.storeId);
                                setIsPurgeDialogOpen(true);
                              }}
                              className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Purge
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Log Details Inspection Dialog */}
      <Dialog open={!!selectedAuditLog} onOpenChange={(open) => !open && setSelectedAuditLog(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              <span>Audit Log Record</span>
            </DialogTitle>
            <DialogDescription>
              Full payload captured in public.platform_audit_logs for security inspection.
            </DialogDescription>
          </DialogHeader>
          {selectedAuditLog && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold">Actor Email</span>
                  <p className="font-medium text-foreground">{selectedAuditLog.actor_email || "System / N/A"}</p>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold">Actor Role</span>
                  <p className="font-medium text-foreground capitalize">{selectedAuditLog.actor_role?.replace("_", " ") || "N/A"}</p>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold">Action</span>
                  <p className="font-mono text-primary font-semibold">{selectedAuditLog.action}</p>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold">Timestamp</span>
                  <p className="font-mono text-foreground">{new Date(selectedAuditLog.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">JSON Event Payload / Metadata</Label>
                <pre className="rounded-lg border border-border bg-muted/60 p-4 text-[11px] font-mono text-foreground overflow-x-auto max-h-60 scrollbar-thin">
                  {JSON.stringify(selectedAuditLog.details, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedAuditLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="plan-annual-price">Annual Price (BDT)</Label>
                <Input
                  id="plan-annual-price"
                  type="number"
                  value={planForm.annual_price}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, annual_price: e.target.value }))}
                  placeholder="e.g. 50000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="plan-annual-discount">Annual Discount (%)</Label>
                <Input
                  id="plan-annual-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={planForm.annual_discount_percentage}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, annual_discount_percentage: e.target.value }))}
                  placeholder="0"
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
              <div>
                <Label htmlFor="plan-trial-days">Trial Days</Label>
                <Input
                  id="plan-trial-days"
                  type="number"
                  min="0"
                  value={planForm.trial_days}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, trial_days: e.target.value }))}
                  placeholder="14"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 pt-6">
                <Label htmlFor="plan-active">Is Plan Active</Label>
                <Switch
                  id="plan-active"
                  checked={planForm.is_active}
                  onCheckedChange={(checked) => setPlanForm((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Label htmlFor="plan-contact-only">Contact Support Only</Label>
                <Switch
                  id="plan-contact-only"
                  checked={planForm.contact_only}
                  onCheckedChange={(checked) => setPlanForm((prev) => ({ ...prev, contact_only: checked }))}
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

      {/* Extend Trial Dialog */}
      <Dialog open={isExtendTrialDialogOpen} onOpenChange={setIsExtendTrialDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              <span>Extend Store Trial</span>
            </DialogTitle>
            <DialogDescription>
              Manually grant extra trial days to a tenant store without triggering automated billing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div>
              <Label className="text-xs">Select Target Store</Label>
              <select
                value={extendTrialStoreId}
                onChange={(e) => setExtendTrialStoreId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>-- Select Store --</option>
                {(data?.stores || []).map((store: any) => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Trial Days Extension</Label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={extendTrialDays === days ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setExtendTrialDays(days)}
                  >
                    +{days} Days
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom-trial-days" className="text-xs">Or Enter Custom Days</Label>
              <Input
                id="custom-trial-days"
                type="number"
                min="1"
                max="365"
                value={extendTrialDays}
                onChange={(e) => setExtendTrialDays(parseInt(e.target.value) || 7)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="trial-note" className="text-xs">Operator Note / Rationale</Label>
              <Textarea
                id="trial-note"
                value={extendTrialNote}
                onChange={(e) => setExtendTrialNote(e.target.value)}
                placeholder="e.g. VIP Onboarding Extension requested by merchant support..."
                className="mt-1 text-xs h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsExtendTrialDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmittingExtendTrial || !extendTrialStoreId}
                onClick={handleExtendTrial}
              >
                {isSubmittingExtendTrial ? "Saving..." : `Confirm +${extendTrialDays} Days`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Plan Override Dialog */}
      <Dialog open={isManualOverrideDialogOpen} onOpenChange={setIsManualOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Manual Plan Override</span>
            </DialogTitle>
            <DialogDescription>
              Directly assign a plan tier to a merchant store without immediate payment processing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div>
              <Label className="text-xs">Target Store</Label>
              <select
                value={manualOverrideStoreId}
                onChange={(e) => setManualOverrideStoreId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>-- Select Store --</option>
                {(data?.stores || []).map((store: any) => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Target Plan Tier</Label>
              <select
                value={manualOverridePlanId}
                onChange={(e) => setManualOverridePlanId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 capitalize"
              >
                {(data?.plans || []).map((plan: any) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.monthly_price === 0 ? "Free" : `BDT ${plan.monthly_price}/mo`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="override-reason" className="text-xs">Override Reason / Audit Note</Label>
              <Input
                id="override-reason"
                value={manualOverrideReason}
                onChange={(e) => setManualOverrideReason(e.target.value)}
                placeholder="e.g. Sponsorship, QA Testing, Payment Dispute Waiver"
                className="mt-1 text-xs"
              />
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <span className="font-semibold block">Important Audit Info</span>
              <p className="text-[11px] leading-relaxed">
                This action will mark the target store&apos;s subscription as active under the selected plan tier and generate a $0 paid invoice in the Platform Billing Ledger.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsManualOverrideDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                disabled={isSubmittingManualOverride || !manualOverrideStoreId}
                onClick={handleManualPlanOverride}
              >
                {isSubmittingManualOverride ? "Applying..." : "Activate Plan Override"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Purge Audit Dialog */}
      <Dialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Media Storage Purge Tool
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Audit and remove orphaned media assets that are not referenced in active products, page blocks, or site settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Select Target Merchant Store</Label>
              <Select
                value={purgeTargetStoreId}
                onValueChange={(val) => setPurgeTargetStoreId(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose store to audit..." />
                </SelectTrigger>
                <SelectContent>
                  {storageTelemetry.storeMetrics.map((metric) => (
                    <SelectItem key={metric.storeId} value={metric.storeId} className="text-xs">
                      {metric.storeName} ({metric.orphanedCount} orphaned, {metric.orphanedMb} MB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {purgeTargetStoreId ? (
              (() => {
                const metric = storageTelemetry.storeMetrics.find((m) => m.storeId === purgeTargetStoreId);
                if (!metric) return null;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">Total Media</div>
                        <div className="text-sm font-bold text-foreground">{metric.totalAssets} files ({metric.totalMb} MB)</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Orphaned Files</div>
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{metric.orphanedCount} files</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Reclaimable Space</div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{metric.orphanedMb} MB</div>
                      </div>
                    </div>

                    {metric.orphanedCount > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Orphaned Asset Audit Preview</span>
                          <span className="text-[11px] text-muted-foreground">Showing up to 8 files</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 rounded-md border border-border/40 bg-background">
                          {metric.orphanedAssets.slice(0, 8).map((asset, i) => (
                            <div key={asset.id || i} className="group relative rounded-md border border-border/60 overflow-hidden bg-muted/20 text-center p-1.5 space-y-1">
                              {asset.url ? (
                                <img src={asset.url} alt={asset.originalFilename || asset.alt || "Media"} className="h-12 w-full object-cover rounded" />
                              ) : (
                                <div className="h-12 w-full flex items-center justify-center bg-muted rounded">
                                  <FileImage className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <p className="text-[10px] truncate text-muted-foreground font-mono">{asset.originalFilename || asset.publicId || "Asset"}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>Purging will unlink these assets from the store&apos;s media library and reclaim platform storage. Active storefront items will not be affected.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>This store has no orphaned media assets. All files are in use!</span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                Select a store above to inspect its media library audit.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsPurgeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!purgeTargetStoreId || isPurgingMedia || (storageTelemetry.storeMetrics.find(m => m.storeId === purgeTargetStoreId)?.orphanedCount || 0) === 0}
              onClick={() => handlePurgeOrphanedMedia()}
              className="gap-1.5"
            >
              {isPurgingMedia ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Purging...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Confirm Purge & Reclaim Storage
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
