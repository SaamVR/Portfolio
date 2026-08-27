"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Download, FileArchive, Loader2, RefreshCcw, Upload, DatabaseBackup, ShieldAlert, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { isPlatformRole } from "@/lib/platform/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { uploadMediaAsset } from "@/lib/cloudinary-upload";
import { assertBackupReviewReferences, collectMediaUrlsFromValue, createBackupZipBlob, inferBackupMediaFileName, inferBackupMediaFolder, parseBackupFile, replaceUrlsInValue, type StoreBackupMediaFile } from "@/lib/store-backup";
import { inferMediaTypeFromUrl, normalizeMediaLibrary } from "@/lib/media-library";
import { refreshStorefrontCacheForStore } from "@/lib/storefront-cache-client";

type StoreOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  custom_domain?: string | null;
  owner_id?: string | null;
  currency_code: string | null;
  locale: string | null;
  plan: string | null;
  store_type: string | null;
  logo_url: string | null;
  is_published: boolean | null;
};

const CORE_EXPORT_TABLES = {
  store_business_profiles: "store_id",
  store_themes: "store_id",
  store_pages: "store_id",
  store_page_blocks: "store_id",
  store_page_revisions: "store_id",
  blog_posts: "store_id",
  products: "store_id",
  product_categories: "store_id",
  product_types: "store_id",
  coupon_codes: "store_id",
  site_settings: "store_id",
} as const;

const ACCESS_EXPORT_TABLES = {
  store_memberships: "store_id",
  store_staff_invites: "store_id",
} as const;

const OPERATIONAL_EXPORT_TABLES = {
  orders: "store_id",
  product_reviews: "store_id",
  contact_messages: "store_id",
  customer_addresses: "store_id",
  store_customer_profiles: "store_id",
  store_analytics_events: "store_id",
} as const;

const PLATFORM_EXPORT_TABLES = {
  store_subscriptions: "store_id",
} as const;

const DELETE_ORDER = [
  "store_page_revisions",
  "store_page_blocks",
  "store_pages",
  "blog_posts",
  "store_business_profiles",
  "store_analytics_events",
  "product_reviews",
  "orders",
  "coupon_codes",
  "products",
  "product_categories",
  "product_types",
  "contact_messages",
  "customer_addresses",
  "store_customer_profiles",
  "site_settings",
  "store_staff_invites",
  "store_memberships",
  "store_themes",
  "store_subscriptions",
] as const;

function getExportTables({
  includeAccessData,
  includeOperationalData,
  isPlatformAdmin,
}: {
  includeAccessData: boolean;
  includeOperationalData: boolean;
  isPlatformAdmin: boolean;
}) {
  return {
    ...CORE_EXPORT_TABLES,
    ...(includeAccessData ? ACCESS_EXPORT_TABLES : {}),
    ...(includeOperationalData ? OPERATIONAL_EXPORT_TABLES : {}),
    ...(isPlatformAdmin ? PLATFORM_EXPORT_TABLES : {}),
  } as Record<string, string>;
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to encode media file"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to encode media file"));
    reader.readAsDataURL(blob);
  });
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function createInviteCode() {
  return `STAFF-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function generateImportedOrderNumber() {
  const dateStamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `IMP-${dateStamp}-${suffix}`;
}

function normalizeImportedCouponCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().slice(0, 80);
}

function generateImportedCouponCode(baseCode: string, usedCodes: Set<string>) {
  const fallbackBase = normalizeImportedCouponCode(baseCode) || `IMPORTED-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  if (!usedCodes.has(fallbackBase)) {
    usedCodes.add(fallbackBase);
    return fallbackBase;
  }

  let attempt = 1;
  while (attempt < 1000) {
    const suffix = attempt === 1 ? "-COPY" : `-COPY-${attempt}`;
    const nextCode = `${fallbackBase.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
    if (!usedCodes.has(nextCode)) {
      usedCodes.add(nextCode);
      return nextCode;
    }
    attempt += 1;
  }

  const fallback = `IMPORTED-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  usedCodes.add(fallback);
  return fallback;
}

type AccessImportMode = "none" | "invites_only" | "memberships_and_invites";
type BackupFormat = "json" | "zip";
type ParsedBackupPackage = Awaited<ReturnType<typeof parseBackupFile>>;
type BackupEventRow = {
  id: string;
  store_id: string;
  actor_user_id: string | null;
  action: "export" | "import";
  format: "json" | "zip";
  source_store_id: string | null;
  target_store_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

function getErrorMessage(error: unknown, fallback = "Unknown backup error") {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim().length > 0) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return record.error;
    }
    if (typeof record.details === "string" && record.details.trim().length > 0) {
      return record.details;
    }
    if (typeof record.hint === "string" && record.hint.trim().length > 0) {
      return record.hint;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      // Ignore serialization failures and fall back below.
    }
  }

  return fallback;
}

function replaceMappedIdsInValue<T>(value: T, idMap: Map<string, string>): T {
  if (typeof value === "string") {
    return (idMap.get(value) ?? value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceMappedIdsInValue(item, idMap)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceMappedIdsInValue(item, idMap)]),
    ) as T;
  }

  return value;
}

async function logBackupEvent(event: {
  storeId: string;
  action: "export" | "import";
  format: BackupFormat;
  sourceStoreId?: string | null;
  targetStoreId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await (supabase as any).from("store_backup_events").insert({
    store_id: event.storeId,
    actor_user_id: event.actorUserId ?? null,
    action: event.action,
    format: event.format,
    source_store_id: event.sourceStoreId ?? null,
    target_store_id: event.targetStoreId ?? null,
    metadata: event.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to save backup history event: ${getErrorMessage(error)}`);
  }
}

export default function StoreBackupManager() {
  const { platformRole, role, activeStoreId, user } = useAuth();
  const isPlatformAdmin = isPlatformRole(platformRole);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceStoreId, setSourceStoreId] = useState(activeStoreId);
  const [targetStoreId, setTargetStoreId] = useState(activeStoreId);
  const [includeMediaFiles, setIncludeMediaFiles] = useState(true);
  const [includeAccessData, setIncludeAccessData] = useState(true);
  const [backupFormat, setBackupFormat] = useState<BackupFormat>("zip");
  const [replaceTargetContent, setReplaceTargetContent] = useState(true);
  const [preserveTargetSlug, setPreserveTargetSlug] = useState(true);
  const [preserveTargetDomain, setPreserveTargetDomain] = useState(true);
  const [keepImportedStoreDraft, setKeepImportedStoreDraft] = useState(true);
  const [includeOperationalData, setIncludeOperationalData] = useState(false);
  const [accessImportMode, setAccessImportMode] = useState<AccessImportMode>("invites_only");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSummary, setLastSummary] = useState<string>("");
  const [pendingImportPackage, setPendingImportPackage] = useState<ParsedBackupPackage | null>(null);
  const [pendingImportFileName, setPendingImportFileName] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "export" | "import">("all");

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ["backup-stores", activeStoreId, isPlatformAdmin],
    queryFn: async () => {
      let query = (supabase as any)
        .from("stores")
        .select("id, owner_id, name, slug, custom_domain, description, currency_code, locale, plan, store_type, logo_url, is_published")
        .order("name");

      if (!isPlatformAdmin) {
        query = query.eq("id", activeStoreId as string);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as StoreOption[];
    },
    enabled: role === "admin" || role === "co_admin",
  });

  const sourceStore = useMemo(() => stores.find((store) => store.id === sourceStoreId) ?? null, [sourceStoreId, stores]);
  const targetStore = useMemo(() => stores.find((store) => store.id === targetStoreId) ?? null, [stores, targetStoreId]);
  const exportCoverage = useMemo(() => ([
    includeMediaFiles ? "Media files" : "Media URLs only",
    includeAccessData ? "Staff access metadata" : "No access data",
    includeOperationalData ? "Orders, reviews, messages, analytics" : "No operational history",
    isPlatformAdmin ? "Platform subscription rows allowed" : "Platform subscription rows preserved on target",
  ]), [includeAccessData, includeMediaFiles, includeOperationalData, isPlatformAdmin]);
  const pendingImportTableCounts = useMemo(() => {
    if (!pendingImportPackage) return [];
    return Object.entries(pendingImportPackage.data)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => ({ key, count: Array.isArray(value) ? value.length : 0 }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count);
  }, [pendingImportPackage]);
  const pendingImportTotalRows = useMemo(
    () => pendingImportTableCounts.reduce((sum, entry) => sum + entry.count, 0),
    [pendingImportTableCounts],
  );
  const selectedHistoryStoreId = targetStoreId ?? sourceStoreId ?? activeStoreId ?? null;

  const { data: backupHistory = [], isLoading: loadingBackupHistory } = useQuery({
    queryKey: ["store-backup-events", selectedHistoryStoreId],
    enabled: Boolean(selectedHistoryStoreId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_backup_events")
        .select("id, store_id, actor_user_id, action, format, source_store_id, target_store_id, metadata, created_at")
        .eq("store_id", selectedHistoryStoreId as string)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      return (data ?? []) as BackupEventRow[];
    },
  });
  const historyStoreIds = useMemo(
    () =>
      Array.from(
        new Set(
          backupHistory.flatMap((event) => [event.store_id, event.source_store_id, event.target_store_id].filter(Boolean)),
        ),
      ) as string[],
    [backupHistory],
  );
  const { data: historyStores = [] } = useQuery({
    queryKey: ["store-backup-event-stores", historyStoreIds],
    enabled: historyStoreIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stores")
        .select("id, name, slug")
        .in("id", historyStoreIds);

      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; slug: string }>;
    },
  });
  const historyStoreLabels = useMemo(
    () => Object.fromEntries(historyStores.map((store) => [store.id, `${store.name} (${store.slug})`])),
    [historyStores],
  );
  const filteredBackupHistory = useMemo(
    () => historyFilter === "all" ? backupHistory : backupHistory.filter((event) => event.action === historyFilter),
    [backupHistory, historyFilter],
  );
  const importMetadata = pendingImportPackage?.metadata ?? {
    includedOperationalData: false,
    includedAccessData: false,
    includedMediaFiles: false,
  };
  const importRiskLevel = useMemo(() => {
    if (!pendingImportPackage) return null;
    if (replaceTargetContent && (includeOperationalData || importMetadata.includedOperationalData)) return "high";
    if (!preserveTargetSlug || !preserveTargetDomain || accessImportMode === "memberships_and_invites") return "medium";
    return "low";
  }, [
    accessImportMode,
    importMetadata.includedOperationalData,
    includeOperationalData,
    pendingImportPackage,
    preserveTargetDomain,
    preserveTargetSlug,
    replaceTargetContent,
  ]);
  const importRiskNotes = useMemo(() => {
    if (!pendingImportPackage) return [];
    return [
      "Target store name stays unchanged while the imported content is applied inside it.",
      replaceTargetContent ? "Current target content will be cleared before restore." : "Current target content will remain and the restore will merge into it.",
      includeOperationalData && importMetadata.includedOperationalData
        ? "Orders, reviews, contact messages, addresses, and analytics will also be restored."
        : "Operational history will stay out unless you explicitly include it.",
      accessImportMode === "memberships_and_invites"
        ? "Memberships and pending invites will be recreated for this store."
        : accessImportMode === "invites_only"
          ? "Only pending invite access will be recreated."
          : "No access rows will be imported from the package.",
      preserveTargetSlug ? "Target storefront slug stays unchanged." : "Target storefront slug can be overwritten by the backup.",
      preserveTargetDomain ? "Target custom domain stays unchanged." : "Target custom domain can be overwritten by the backup.",
      keepImportedStoreDraft ? "Restored store will stay draft by default." : "Restored store can retain live or published state from the backup.",
    ];
  }, [
    accessImportMode,
    importMetadata.includedOperationalData,
    includeOperationalData,
    keepImportedStoreDraft,
    pendingImportPackage,
    preserveTargetDomain,
    preserveTargetSlug,
    replaceTargetContent,
  ]);
  const historyCounts = useMemo(() => ({
    export: backupHistory.filter((event) => event.action === "export").length,
    import: backupHistory.filter((event) => event.action === "import").length,
  }), [backupHistory]);

  useEffect(() => {
    if (activeStoreId && stores.some((store) => store.id === activeStoreId)) {
      setSourceStoreId(activeStoreId);
      setTargetStoreId(activeStoreId);
      return;
    }

    if (!sourceStoreId && stores[0]?.id) {
      setSourceStoreId(stores[0].id);
    }

    if (!targetStoreId && stores[0]?.id) {
      setTargetStoreId(stores[0].id);
    }
  }, [activeStoreId, sourceStoreId, stores, targetStoreId]);

  const buildBackupPackage = async () => {
    if (!sourceStore) {
      throw new Error("Select a source store first.");
    }

    const exportTables = getExportTables({
      includeAccessData,
      includeOperationalData,
      isPlatformAdmin,
    });
    const tableEntries = await Promise.all(Object.entries(exportTables).map(async ([tableName, column]) => {
      const query = (supabase as any).from(tableName).select("*").eq(column, sourceStore.id);
      const { data, error } = await query;
      if (error) throw error;
      return [tableName, data ?? []] as const;
    }));
    const tableData = Object.fromEntries(tableEntries) as Record<string, any[]>;

    const settings = tableData.site_settings ?? [];
    const mediaLibrarySetting = Array.isArray(settings)
      ? settings.find((setting: any) => setting.key === "media_library")
      : null;
    const mediaLibraryAssets = normalizeMediaLibrary(mediaLibrarySetting?.value);

    const data = {
      store: sourceStore,
      ...tableData,
      store_memberships: includeAccessData ? (tableData.store_memberships ?? []) : [],
      store_staff_invites: includeAccessData ? (tableData.store_staff_invites ?? []) : [],
    } as Record<string, unknown>;

    const mediaFiles: StoreBackupMediaFile[] = [];

    if (includeMediaFiles) {
      const urls = Array.from(collectMediaUrlsFromValue(data)).filter((url) => !url.startsWith("data:"));
      const seen = new Set<string>();

      for (const url of urls) {
        if (seen.has(url)) continue;
        seen.add(url);

        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const blob = await response.blob();
          const matchingAsset = mediaLibraryAssets.find((asset) => asset.url === url);

          mediaFiles.push({
            originalUrl: url,
            fileName: matchingAsset?.originalFilename || inferBackupMediaFileName(url),
            mimeType: blob.type || undefined,
            resourceType: matchingAsset?.resourceType ?? inferMediaTypeFromUrl(url),
            folder: matchingAsset?.folder || inferBackupMediaFolder(url),
            dataUrl: await blobToDataUrl(blob),
          });
        } catch (error) {
          console.warn("Failed to capture media asset for backup:", url, error);
        }
      }
    }

    return {
      version: "2026-07-26" as const,
      exportedAt: new Date().toISOString(),
      source: {
        storeId: sourceStore.id,
        storeSlug: sourceStore.slug,
        storeName: sourceStore.name,
      },
      metadata: {
        includedOperationalData: includeOperationalData,
        includedAccessData: includeAccessData,
        includedMediaFiles: includeMediaFiles,
        tableKeys: Object.keys(exportTables),
      },
      data,
      mediaFiles,
    };
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      if (!sourceStore) {
        throw new Error("Select a source store first.");
      }
      const backupPackage = await buildBackupPackage();
      const exportStoreId = sourceStore.id;
      const baseFileName = `${backupPackage.source.storeSlug || "store"}-backup-${backupPackage.exportedAt.slice(0, 10)}`;
      if (backupFormat === "zip") {
        const zipBlob = await createBackupZipBlob(backupPackage);
        downloadBlobFile(`${baseFileName}.zip`, zipBlob);
      } else {
        downloadJsonFile(`${baseFileName}.json`, backupPackage);
      }
      await logBackupEvent({
        storeId: exportStoreId,
        action: "export",
        format: backupFormat,
        sourceStoreId: exportStoreId,
        actorUserId: user?.id ?? null,
        metadata: {
          includedMediaFiles: includeMediaFiles,
          includedAccessData: includeAccessData,
          includedOperationalData: includeOperationalData,
          mediaFileCount: backupPackage.mediaFiles.length,
          tableKeys: backupPackage.metadata.tableKeys,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["store-backup-events", exportStoreId] });
      setLastSummary(`Exported ${backupPackage.source.storeName} as ${backupFormat.toUpperCase()} with ${backupPackage.mediaFiles.length} media files.`);
      toast.success("Store backup exported.");
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Failed to export store backup"));
    } finally {
      setExporting(false);
    }
  };

  const clearTargetStore = async (storeId: string) => {
    for (const tableName of DELETE_ORDER) {
      if (tableName === "store_subscriptions" && !isPlatformAdmin) {
        continue;
      }
      if (tableName === "store_memberships") {
        continue;
      }
      const { error } = await (supabase as any).from(tableName).delete().eq("store_id", storeId);
      if (error) {
        throw new Error(`Failed to clear ${tableName}: ${getErrorMessage(error)}`);
      }
    }
  };

  const importMediaFiles = async (storeId: string, mediaFiles: StoreBackupMediaFile[]) => {
    const urlMap = new Map<string, string>();

    for (const mediaFile of mediaFiles) {
      if (!mediaFile.dataUrl) {
        throw new Error(`Backup media file ${mediaFile.fileName} is missing inline content.`);
      }
      const blob = await fetch(mediaFile.dataUrl).then((response) => response.blob());
      const file = new File([blob], mediaFile.fileName, { type: mediaFile.mimeType || blob.type || undefined });
      const uploaded = await uploadMediaAsset({
        file,
        folder: mediaFile.folder || "imports",
        resourceType: mediaFile.resourceType,
        storeId,
      });
      urlMap.set(mediaFile.originalUrl, uploaded.url);
    }

    return urlMap;
  };

  const stageImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsedPackage = await parseBackupFile(file);
      setPendingImportPackage(parsedPackage);
      setPendingImportFileName(file.name);
      toast.success(`Loaded ${file.name}. Review the restore preview before importing.`);
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Failed to read backup file"));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const executeImport = async () => {
    if (!pendingImportPackage || !targetStore) return;

    setImporting(true);

    try {
      const parsedPackage = pendingImportPackage;
      if (includeOperationalData) {
        assertBackupReviewReferences(parsedPackage.data);
      }

      const urlMap = includeMediaFiles && parsedPackage.mediaFiles.length > 0
        ? await importMediaFiles(targetStore.id, parsedPackage.mediaFiles)
        : new Map<string, string>();

      const rewrittenData = replaceUrlsInValue(parsedPackage.data, urlMap) as Record<string, any>;

      if (replaceTargetContent) {
        await clearTargetStore(targetStore.id);
      }

      const ensureCurrentUserMembership = async (nextRole: "owner" | "admin" | "editor" | "viewer" = "owner") => {
        if (!user?.id) return;
        const { error } = await (supabase as any).from("store_memberships").upsert({
          store_id: targetStore.id,
          user_id: user.id,
          role: nextRole,
          invited_by: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "store_id,user_id" });
        if (error) throw new Error(`Failed to ensure current user access: ${getErrorMessage(error)}`);
      };

      await ensureCurrentUserMembership("owner");

      const incomingStore = rewrittenData.store as StoreOption | undefined;
      const categoryIdMap = new Map<string, string>();
      const productTypeIdMap = new Map<string, string>();
      const productIdMap = new Map<string, string>();
      const orderIdMap = new Map<string, string>();
      const pageIdMap = new Map<string, string>();
      const blockIdMap = new Map<string, string>();
      const sharedIdMap = new Map<string, string>();

      const importedCategories = (rewrittenData.product_categories ?? []).map((row: any) => {
        const nextId = crypto.randomUUID();
        if (typeof row?.id === "string") {
          categoryIdMap.set(row.id, nextId);
          sharedIdMap.set(row.id, nextId);
        }
        return {
          ...row,
          id: nextId,
          store_id: targetStore.id,
        };
      }).map((row: any) => ({
        ...row,
        parent_id: typeof row.parent_id === "string" ? (categoryIdMap.get(row.parent_id) ?? null) : null,
      }));

      const importedProductTypes = (rewrittenData.product_types ?? []).map((row: any) => {
        const nextId = crypto.randomUUID();
        if (typeof row?.id === "string") {
          productTypeIdMap.set(row.id, nextId);
          sharedIdMap.set(row.id, nextId);
        }
        return {
          ...row,
          id: nextId,
          store_id: targetStore.id,
        };
      });

      const importedProducts = (rewrittenData.products ?? []).map((row: any) => {
        const nextId = crypto.randomUUID();
        if (typeof row?.id === "string") {
          productIdMap.set(row.id, nextId);
          sharedIdMap.set(row.id, nextId);
        }
        return {
          ...row,
          id: nextId,
          store_id: targetStore.id,
        };
      }).map((row: any) => replaceMappedIdsInValue(row, sharedIdMap));

      const importedPages = (rewrittenData.store_pages ?? []).map((row: any) => {
        const nextId = crypto.randomUUID();
        if (typeof row?.id === "string") {
          pageIdMap.set(row.id, nextId);
          sharedIdMap.set(row.id, nextId);
        }
        return {
          ...row,
          id: nextId,
          store_id: targetStore.id,
        };
      });

      const importedOrders = includeOperationalData
        ? (rewrittenData.orders ?? []).map((row: any) => {
            const nextId = crypto.randomUUID();
            if (typeof row?.id === "string") {
              orderIdMap.set(row.id, nextId);
              sharedIdMap.set(row.id, nextId);
            }
            return {
              ...row,
              id: nextId,
              store_id: targetStore.id,
              order_number: generateImportedOrderNumber(),
              client_request_id: null,
              items: replaceMappedIdsInValue(row?.items ?? [], sharedIdMap),
            };
          })
        : [];

      const incomingCouponCodes = Array.from(
        new Set(
          (rewrittenData.coupon_codes ?? [])
            .map((row: any) => normalizeImportedCouponCode(row?.code))
            .filter(Boolean),
        ),
      );
      const usedCouponCodes = new Set<string>();
      if (incomingCouponCodes.length > 0) {
        const { data: existingCoupons, error: existingCouponError } = await (supabase as any)
          .from("coupon_codes")
          .select("code")
          .in("code", incomingCouponCodes);

        if (existingCouponError) {
          throw new Error(`Failed to validate imported coupon codes: ${getErrorMessage(existingCouponError)}`);
        }

        for (const code of (existingCoupons ?? [])
          .map((row: { code?: string | null }) => normalizeImportedCouponCode(row?.code))
          .filter(Boolean)) {
          usedCouponCodes.add(code);
        }
      }

      const importedCoupons = (rewrittenData.coupon_codes ?? []).map((row: any) => ({
        ...row,
        id: crypto.randomUUID(),
        store_id: targetStore.id,
        code: generateImportedCouponCode(row?.code ?? "", usedCouponCodes),
      }));

      const importedBlogPosts = (rewrittenData.blog_posts ?? []).map((row: any) => ({
        ...row,
        id: crypto.randomUUID(),
        store_id: targetStore.id,
      }));

      const importedContactMessages = includeOperationalData
        ? (rewrittenData.contact_messages ?? []).map((row: any) => ({
            ...row,
            id: crypto.randomUUID(),
            store_id: targetStore.id,
          }))
        : [];

      const importedCustomerAddresses = includeOperationalData
        ? (rewrittenData.customer_addresses ?? []).map((row: any) => ({
            ...row,
            id: crypto.randomUUID(),
            store_id: targetStore.id,
          }))
        : [];

      const importedReviews = includeOperationalData
        ? (rewrittenData.product_reviews ?? []).map((row: any, index: number) => {
            const mappedProductId = typeof row?.product_id === "string" ? productIdMap.get(row.product_id) : null;
            if (!mappedProductId) {
              throw new Error(`Backup review ${index + 1} could not be remapped to an imported product.`);
            }

            let mappedOrderId: string | null = null;
            if (row?.order_id !== null && row?.order_id !== undefined) {
              mappedOrderId = typeof row.order_id === "string" ? (orderIdMap.get(row.order_id) ?? null) : null;
              if (!mappedOrderId) {
                throw new Error(`Backup review ${index + 1} could not be remapped to an imported order.`);
              }
            }

            return {
              ...row,
              id: crypto.randomUUID(),
              store_id: targetStore.id,
              product_id: mappedProductId,
              order_id: mappedOrderId,
            };
          })
        : [];

      const importedBlocks = (rewrittenData.store_page_blocks ?? []).map((row: any) => {
        const nextId = crypto.randomUUID();
        if (typeof row?.id === "string") {
          blockIdMap.set(row.id, nextId);
          sharedIdMap.set(row.id, nextId);
        }
        return {
          ...row,
          id: nextId,
          store_id: targetStore.id,
          page_id: typeof row?.page_id === "string" ? (pageIdMap.get(row.page_id) ?? row.page_id) : row?.page_id,
          props: replaceMappedIdsInValue(row?.props ?? {}, sharedIdMap),
        };
      });

      const importedRevisions = (rewrittenData.store_page_revisions ?? []).map((row: any) => ({
        id: crypto.randomUUID(),
        page_id: typeof row?.page_id === "string" ? (pageIdMap.get(row.page_id) ?? row.page_id) : row?.page_id,
        store_id: targetStore.id,
        revision_label: typeof row?.revision_label === "string" && row.revision_label.trim().length > 0
          ? row.revision_label.trim()
          : "Imported revision",
        blocks_snapshot: replaceMappedIdsInValue(row?.blocks_snapshot ?? [], sharedIdMap),
        changed_by: null,
        created_at: new Date().toISOString(),
      }));

      const nextStoreRow = {
        name: targetStore.name,
        slug: preserveTargetSlug ? targetStore.slug : incomingStore?.slug ?? targetStore.slug,
        custom_domain: preserveTargetDomain ? targetStore.custom_domain ?? null : incomingStore?.custom_domain ?? null,
        description: incomingStore?.description ?? null,
        currency_code: incomingStore?.currency_code ?? targetStore.currency_code ?? "BDT",
        locale: incomingStore?.locale ?? targetStore.locale ?? "en-BD",
        plan: targetStore.plan ?? incomingStore?.plan ?? "basic",
        store_type: incomingStore?.store_type ?? targetStore.store_type ?? "general-catalog",
        logo_url: incomingStore?.logo_url ?? null,
        is_published: keepImportedStoreDraft ? false : Boolean(incomingStore?.is_published),
      };

      const { error: storeError } = await (supabase as any).from("stores").update(nextStoreRow).eq("id", targetStore.id);
      if (storeError) throw new Error(`Failed to update target store: ${getErrorMessage(storeError)}`);

      const importedThemeRows = Array.isArray(rewrittenData.store_themes) ? rewrittenData.store_themes : [];
      const importedThemePackageIds = Array.from(new Set(
        importedThemeRows
          .map((row: any) => (typeof row?.theme_package_id === "string" ? row.theme_package_id : null))
          .filter((value: string | null): value is string => Boolean(value)),
      ));
      let validThemePackageIds = new Set<string>();

      if (importedThemePackageIds.length > 0) {
        const { data: existingThemePackages, error: themePackageLookupError } = await (supabase as any)
          .from("theme_packages")
          .select("id")
          .in("id", importedThemePackageIds);

        if (themePackageLookupError) {
          throw new Error(`Failed to validate imported theme package references: ${getErrorMessage(themePackageLookupError)}`);
        }

        validThemePackageIds = new Set(
          ((existingThemePackages ?? []) as Array<{ id: string }>).map((row) => row.id),
        );
      }

      const upsertRows = async (tableName: string, rows: any[], onConflict = "id") => {
        if (!rows || rows.length === 0) return;
        const nextRows = rows.map((row) => ({
          ...row,
          store_id: targetStore.id,
        }));
        const { error } = await (supabase as any).from(tableName).upsert(nextRows, { onConflict });
        if (error) throw new Error(`Failed to import ${tableName}: ${getErrorMessage(error)}`);
      };

      if (isPlatformAdmin) {
        const importedSubscriptions = (rewrittenData.store_subscriptions ?? []).map((row: any) => ({
          id: crypto.randomUUID(),
          store_id: targetStore.id,
          plan_id: typeof row?.plan_id === "string" && row.plan_id.trim().length > 0 ? row.plan_id : targetStore.plan || "basic",
          status: keepImportedStoreDraft ? "trialing" : (row?.status ?? "trialing"),
          trial_ends_at: row?.trial_ends_at ?? null,
          current_period_ends_at: row?.current_period_ends_at ?? null,
          provider: row?.provider ?? null,
          provider_subscription_id: row?.provider_subscription_id ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        await upsertRows("store_subscriptions", importedSubscriptions, "store_id");
      }

      await upsertRows("store_business_profiles", rewrittenData.store_business_profiles ?? [], "store_id");
      await upsertRows(
        "store_themes",
        importedThemeRows.map((row: any) => {
          const { id: _ignoredThemeId, ...rest } = row ?? {};
          return {
            ...rest,
          theme_package_id: validThemePackageIds.has(String(row?.theme_package_id ?? ""))
            ? row.theme_package_id
            : null,
          };
        }),
        "store_id",
      );
      await upsertRows("product_categories", importedCategories);
      await upsertRows("product_types", importedProductTypes);
      await upsertRows("products", importedProducts);
      await upsertRows("coupon_codes", importedCoupons);
      await upsertRows("blog_posts", importedBlogPosts);
      if (includeOperationalData) {
        await upsertRows("orders", importedOrders);
        await upsertRows("product_reviews", importedReviews);
        await upsertRows("contact_messages", importedContactMessages);
        await upsertRows("customer_addresses", importedCustomerAddresses);
        await upsertRows("store_customer_profiles", (rewrittenData.store_customer_profiles ?? []).map((row: any) => ({
          ...row,
          store_id: targetStore.id,
        })));
        await upsertRows("store_analytics_events", (rewrittenData.store_analytics_events ?? []).map((row: any) => ({
          ...row,
          id: crypto.randomUUID(),
          store_id: targetStore.id,
          order_id: typeof row?.order_id === "string" ? (orderIdMap.get(row.order_id) ?? null) : null,
          product_id: typeof row?.product_id === "string" ? (productIdMap.get(row.product_id) ?? null) : null,
          customer_id: null,
          metadata: replaceMappedIdsInValue(row?.metadata ?? {}, sharedIdMap),
        })));
      }
      await upsertRows("store_pages", importedPages);
      await upsertRows("store_page_blocks", importedBlocks);
      await upsertRows("store_page_revisions", importedRevisions);

      const siteSettingsRows = (rewrittenData.site_settings ?? []).map((row: any) => ({
        ...(() => {
          const { id: _ignoredSettingId, ...rest } = row ?? {};
          return rest;
        })(),
        store_id: targetStore.id,
        updated_by: null,
        value: replaceMappedIdsInValue(row?.value ?? {}, sharedIdMap),
      }));
      if (siteSettingsRows.length > 0) {
        const { error } = await (supabase as any).from("site_settings").upsert(siteSettingsRows, { onConflict: "store_id,key" });
        if (error) throw new Error(`Failed to import site_settings: ${getErrorMessage(error)}`);
      }

      if (accessImportMode !== "none") {
        const importedInvites = (rewrittenData.store_staff_invites ?? []).map((row: any) => ({
          id: crypto.randomUUID(),
          store_id: targetStore.id,
          invite_code: typeof row?.invite_code === "string" && row.invite_code.trim().length > 0
            ? `${row.invite_code.trim()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
            : createInviteCode(),
          email: typeof row?.email === "string" && row.email.trim().length > 0 ? row.email.trim() : null,
          role: row?.role === "owner" || row?.role === "admin" || row?.role === "editor" || row?.role === "viewer"
            ? row.role
            : "viewer",
          claimed_by: null,
          claimed_at: null,
          status: "pending",
          expires_at: null,
          metadata: typeof row?.metadata === "object" && row.metadata !== null ? row.metadata : {},
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        if (importedInvites.length > 0) {
          const { error } = await (supabase as any).from("store_staff_invites").upsert(importedInvites, { onConflict: "id" });
          if (error) throw new Error(`Failed to import store_staff_invites: ${getErrorMessage(error)}`);
        }
      }

      if (accessImportMode === "memberships_and_invites") {
        const importedMemberships = (rewrittenData.store_memberships ?? [])
          .filter((row: any) => row.user_id)
          .map((row: any) => ({
            id: crypto.randomUUID(),
            store_id: targetStore.id,
            user_id: row.user_id,
            role: row?.role === "owner" || row?.role === "admin" || row?.role === "editor" || row?.role === "viewer"
              ? row.role
              : "viewer",
            invited_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

        if (importedMemberships.length > 0) {
          const { error } = await (supabase as any).from("store_memberships").upsert(importedMemberships, { onConflict: "store_id,user_id" });
          if (error) throw new Error(`Failed to import store_memberships: ${getErrorMessage(error)}`);
        }
      }

      await ensureCurrentUserMembership("owner");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["media_library", targetStore.id] }),
        queryClient.invalidateQueries({ queryKey: ["site_settings", targetStore.id] }),
        queryClient.invalidateQueries({ queryKey: ["backup-stores"] }),
        queryClient.invalidateQueries({ queryKey: ["store-entitlements"] }),
      ]);
      await refreshStorefrontCacheForStore(supabase, targetStore.id);
      await logBackupEvent({
        storeId: targetStore.id,
        action: "import",
        format: pendingImportFileName.toLowerCase().endsWith(".json") ? "json" : "zip",
        sourceStoreId: parsedPackage.source.storeId,
        targetStoreId: targetStore.id,
        actorUserId: user?.id ?? null,
        metadata: {
          sourceStoreName: parsedPackage.source.storeName,
          includedMediaFiles: parsedPackage.mediaFiles.length > 0,
          packagedMediaFiles: parsedPackage.mediaFiles.length,
          includedOperationalData: includeOperationalData,
          accessImportMode,
          replaceTargetContent,
          preserveTargetSlug,
          preserveTargetDomain,
          keepImportedStoreDraft,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["store-backup-events", targetStore.id] });

      setLastSummary(`Imported ${parsedPackage.source.storeName} into ${targetStore.name} with ${parsedPackage.mediaFiles.length} packaged media files, ${includeOperationalData ? "including" : "excluding"} operational data, and access mode ${accessImportMode}.`);
      setPendingImportPackage(null);
      setPendingImportFileName("");
      toast.success("Store backup imported.");
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, "Failed to import store backup"));
    } finally {
      setImporting(false);
    }
  };

  if (role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-7">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected source</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{sourceStore ? `${sourceStore.name} (${sourceStore.slug})` : "Choose a store"}</p>
            <p className="mt-1 text-xs text-muted-foreground">The workspace we will package for export.</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected target</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{targetStore ? `${targetStore.name} (${targetStore.slug})` : "Choose a store"}</p>
            <p className="mt-1 text-xs text-muted-foreground">The workspace that would receive a restore.</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">History in view</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{backupHistory.length} recent event{backupHistory.length === 1 ? "" : "s"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{historyCounts.export} exports and {historyCounts.import} restores for this workspace.</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Restore posture</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {pendingImportPackage ? `${String(importRiskLevel).toUpperCase()} risk preview` : "Waiting for backup file"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingImportPackage ? "Review the restore preview before importing anything." : "Load a backup file to see the restore risk and scope."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <DatabaseBackup className="h-5 w-5 text-primary" />
              Store Backup & Portability
            </CardTitle>
            <Badge variant="secondary">Portable Package</Badge>
          </div>
          <CardDescription>
            Export a complete store snapshot with CMS design, commerce data, settings, and optional inline media files. Import it into another store workspace later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-7 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Export Store</p>
              <p className="text-xs text-muted-foreground">Create a portable package with your design, settings, catalog, and optional operating history.</p>
            </div>
            <div className="grid gap-2">
              <Label>Source Store</Label>
              <Select value={sourceStoreId ?? undefined} onValueChange={setSourceStoreId} disabled={loadingStores || exporting || importing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Include media files</p>
                <p className="text-xs text-muted-foreground">Embed actual image/video blobs, not just URLs.</p>
              </div>
              <Switch checked={includeMediaFiles} onCheckedChange={setIncludeMediaFiles} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Include staff access data</p>
                <p className="text-xs text-muted-foreground">Carry memberships and pending invite metadata in the backup package.</p>
              </div>
              <Switch checked={includeAccessData} onCheckedChange={setIncludeAccessData} />
            </div>
            <div className="grid gap-2">
              <Label>Backup Format</Label>
              <Select value={backupFormat} onValueChange={(value) => setBackupFormat(value as BackupFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zip">ZIP package</SelectItem>
                  <SelectItem value="json">JSON package</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sourceStore ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                Exporting <span className="font-medium text-foreground">{sourceStore.name}</span> will capture CMS pages, blog posts, theme, site settings, products, coupons, orders, reviews, messages, saved customer profiles, addresses, media references, and optionally staff access metadata.
              </div>
            ) : null}
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current export coverage</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {exportCoverage.map((item) => (
                  <Badge key={item} variant="secondary">{item}</Badge>
                ))}
              </div>
            </div>
            <Button type="button" onClick={() => void handleExport()} disabled={exporting || importing || !sourceStore} className="gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : backupFormat === "zip" ? <FileArchive className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              Export {backupFormat === "zip" ? "ZIP" : "JSON"}
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border border-border p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Restore Into Store</p>
              <p className="text-xs text-muted-foreground">Bring a backup package into an existing store workspace.</p>
            </div>
            <div className="grid gap-2">
              <Label>Target Store</Label>
              <Select value={targetStoreId ?? undefined} onValueChange={setTargetStoreId} disabled={loadingStores || exporting || importing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Replace target content</p>
                <p className="text-xs text-muted-foreground">Clear current store-scoped data before restore.</p>
              </div>
              <Switch checked={replaceTargetContent} onCheckedChange={setReplaceTargetContent} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Preserve target slug</p>
                <p className="text-xs text-muted-foreground">Keep the destination store URL/slug instead of overwriting it from backup.</p>
              </div>
              <Switch checked={preserveTargetSlug} onCheckedChange={setPreserveTargetSlug} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Preserve target domain</p>
                <p className="text-xs text-muted-foreground">Keep the current custom domain instead of importing the source domain.</p>
              </div>
              <Switch checked={preserveTargetDomain} onCheckedChange={setPreserveTargetDomain} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Keep imported store as draft</p>
                <p className="text-xs text-muted-foreground">Safer default for imported sites so they do not go live immediately.</p>
              </div>
              <Switch checked={keepImportedStoreDraft} onCheckedChange={setKeepImportedStoreDraft} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Include operational data</p>
                <p className="text-xs text-muted-foreground">Import orders, reviews, messages, saved customer profiles, addresses, and storefront analytics too.</p>
              </div>
              <Switch checked={includeOperationalData} onCheckedChange={setIncludeOperationalData} />
            </div>
            <div className="grid gap-2">
              <Label>Staff Access Import</Label>
              <Select value={accessImportMode} onValueChange={(value) => setAccessImportMode(value as AccessImportMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Skip access data</SelectItem>
                  <SelectItem value="invites_only">Import pending invites only</SelectItem>
                  <SelectItem value="memberships_and_invites">Import memberships and invites</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Import now preserves the target store owner and your current admin access, and by default also keeps the target domain and restores the imported store as draft. Invite imports are regenerated as new pending codes, membership imports assume those user accounts already exist on this platform, and analytics history is only restored when operational data is enabled.
                </p>
              </div>
            </div>
            {!isPlatformAdmin ? (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-100">
                Billing subscriptions are preserved from the target store during import. Only platform admins can rewrite subscription rows.
              </div>
            ) : null}
            <div className="rounded-lg border border-border bg-card/50 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Access portability mode: <span className="font-medium text-foreground">{accessImportMode.replaceAll("_", " ")}</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.zip,application/zip"
              className="hidden"
              onChange={stageImportFile}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing || exporting || !targetStore} className="gap-2">
              <Upload className="h-4 w-4" />
              Choose Backup File
            </Button>
            {pendingImportPackage ? (
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Restore preview ready</p>
                    <p className="text-xs text-muted-foreground">
                      {pendingImportFileName} from {pendingImportPackage.source.storeName} exported on {new Date(pendingImportPackage.exportedAt).toLocaleString()}.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setPendingImportPackage(null); setPendingImportFileName(""); }}>
                      Clear
                    </Button>
                    <Button type="button" onClick={() => void executeImport()} disabled={importing || !targetStore} className="gap-2">
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
                      Restore Into Target
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-border bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Media files</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{pendingImportPackage.mediaFiles.length}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Rows in package</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{pendingImportTotalRows}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Included options</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{importMetadata.includedOperationalData ? "Operational data" : "No operational data"}</Badge>
                      <Badge variant="secondary">{importMetadata.includedAccessData ? "Access data" : "No access data"}</Badge>
                    </div>
                  </div>
                  <div className={`rounded-lg border bg-background/70 p-3 ${
                    importRiskLevel === "high"
                      ? "border-destructive/40"
                      : importRiskLevel === "medium"
                        ? "border-amber-500/40"
                        : "border-emerald-500/40"
                  }`}>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Restore safety</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{preserveTargetSlug ? "Preserve slug" : "Overwrite slug"}</Badge>
                      <Badge variant="outline">{preserveTargetDomain ? "Preserve domain" : "Overwrite domain"}</Badge>
                      <Badge variant="outline">{keepImportedStoreDraft ? "Restore as draft" : "Can go live"}</Badge>
                    </div>
                    <p className={`mt-3 text-xs font-medium ${
                      importRiskLevel === "high"
                        ? "text-destructive"
                        : importRiskLevel === "medium"
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}>
                      {importRiskLevel === "high"
                        ? "High risk: this restore can replace live store content and also bring older operating history with it."
                        : importRiskLevel === "medium"
                          ? "Medium risk: this restore changes important store identity or access details."
                          : "Low risk: this restore keeps the target identity stable and stays on the safer defaults."}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background/70 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What this restore will do</p>
                      {importRiskNotes.map((note) => (
                        <p key={note} className="text-sm text-muted-foreground">{note}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {pendingImportTableCounts.length > 0 ? (
                  <div className="rounded-lg border border-border bg-background/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Backup contents</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {pendingImportTableCounts.slice(0, 10).map((entry) => (
                        <div key={entry.key} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{entry.key.replaceAll("_", " ")}</span>
                          <span className="text-muted-foreground">{entry.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Last Action</CardTitle>
            <CardDescription>The latest backup or restore summary from this admin session.</CardDescription>
          </div>
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setLastSummary("")}>
            <RefreshCcw className="h-4 w-4" />
            Clear
          </Button>
        </CardHeader>
        <CardContent>
          {lastSummary ? (
            <div className="rounded-lg border border-border bg-card/60 p-4 text-sm text-foreground">{lastSummary}</div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No backup action has run yet in this session.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">Backup & Restore History</CardTitle>
              <CardDescription>Recent saved export and restore activity for the selected store workspace.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "export", "import"] as const).map((filterValue) => (
                <Button
                  key={filterValue}
                  type="button"
                  size="sm"
                  variant={historyFilter === filterValue ? "default" : "outline"}
                  onClick={() => setHistoryFilter(filterValue)}
                >
                  {filterValue === "all" ? "All events" : filterValue === "export" ? "Exports" : "Restores"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingBackupHistory ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading backup history...
            </div>
          ) : filteredBackupHistory.length > 0 ? (
            filteredBackupHistory.map((event) => (
              <div key={event.id} className="rounded-lg border border-border bg-card/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={event.action === "import" ? "default" : "secondary"}>
                        {event.action === "import" ? "Restore" : "Export"}
                      </Badge>
                      <Badge variant="outline">{event.format.toUpperCase()}</Badge>
                      {event.metadata?.includedOperationalData ? <Badge variant="outline">Operational data</Badge> : null}
                      {event.metadata?.includedMediaFiles || event.metadata?.packagedMediaFiles > 0 ? <Badge variant="outline">Media included</Badge> : null}
                    </div>
                    <p className="text-sm text-foreground">
                      {event.action === "export"
                        ? "A portable backup package was created for this store."
                        : `A backup package from ${event.metadata?.sourceStoreName || "another store"} was restored into this store.`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.action === "import"
                        ? `Access mode: ${String(event.metadata?.accessImportMode || "n/a").replaceAll("_", " ")}.`
                        : `Tables captured: ${Array.isArray(event.metadata?.tableKeys) ? event.metadata.tableKeys.length : 0}.`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Source: {event.source_store_id ? (historyStoreLabels[event.source_store_id] ?? event.source_store_id) : "This store"} ·
                      Target: {event.target_store_id ? (historyStoreLabels[event.target_store_id] ?? event.target_store_id) : (historyStoreLabels[event.store_id] ?? event.store_id)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {backupHistory.length > 0
                ? "No history items match the current filter."
                : "No persisted backup history exists yet for this store. New exports and restores will appear here."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

