"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, DatabaseBackup, Download, FileArchive, Loader2, RefreshCcw, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMerchantConfirm } from "@/components/admin/MerchantConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { inferMediaTypeFromUrl, normalizeMediaLibrary } from "@/lib/media-library";
import { getPlatformPermissions } from "@/lib/platform/rbac";
import {
  collectMediaUrlsFromValue,
  createBackupZipBlob,
  inferBackupMediaFileName,
  inferBackupMediaFolder,
  type StoreBackupMediaFile,
  type StoreBackupPackage,
} from "@/lib/store-backup";
import {
  atomicRestoreMediaToFile,
  buildAtomicRestoreManifest,
  parseBackupFileForAtomicRestore,
  type AtomicRestoreManifest,
  type AtomicRestorePackage,
} from "@/lib/store-backup-restore-client";

type BackupFormat = "json" | "zip";
type AccessImportMode = "none" | "invites_only" | "memberships_and_invites";
type RestorePhase = "idle" | "preflight" | "staging" | "committing" | "reconciling" | "complete" | "attention" | "ambiguous";
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
type RestoreOptions = {
  targetStoreId: string;
  replaceTargetContent: boolean;
  preserveTargetSlug: boolean;
  preserveTargetDomain: boolean;
  keepImportedStoreDraft: boolean;
  includeOperationalData: boolean;
  accessImportMode: AccessImportMode;
  replaceSubscription: boolean;
  format: BackupFormat;
};
type RestorePreflight = {
  operationId: string;
  status: string;
  target: { id: string; name: string; slug: string; isPublished: boolean };
  source: { storeId: string; storeSlug: string; storeName: string };
  counts: { rows: number; mediaFiles: number; mediaBytes: number };
  impacts: string[];
  warning?: string | null;
};
type BackupEventRow = {
  id: string;
  action: "export" | "import";
  format: BackupFormat;
  metadata: Record<string, unknown> | null;
  created_at: string;
  status?: string | null;
  lifecycle_managed?: boolean | null;
  error_summary?: string | null;
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
const ACCESS_EXPORT_TABLES = { store_memberships: "store_id", store_staff_invites: "store_id" } as const;
const OPERATIONAL_EXPORT_TABLES = {
  orders: "store_id",
  product_reviews: "store_id",
  contact_messages: "store_id",
  customer_addresses: "store_id",
  store_customer_profiles: "store_id",
  store_analytics_events: "store_id",
} as const;
const PLATFORM_EXPORT_TABLES = { store_subscriptions: "store_id" } as const;

class RestoreApiError extends Error {
  constructor(public status: number, public payload: Record<string, any>, message: string) {
    super(message);
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KiB` : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Failed to encode media file"));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to encode media file"));
    reader.readAsDataURL(blob);
  });
}

function sanitizePortableRows(tableName: string, input: unknown[]) {
  if (tableName === "store_staff_invites") {
    return input.map((value) => {
      const row = { ...(value as Record<string, unknown>) };
      delete row.invite_code;
      delete row.claimed_by;
      delete row.claimed_at;
      delete row.created_by;
      return row;
    });
  }
  if (tableName === "store_subscriptions") {
    return input.map((value) => {
      const row = { ...(value as Record<string, unknown>) };
      delete row.provider;
      delete row.provider_subscription_id;
      return row;
    });
  }
  if (tableName === "site_settings") {
    return input.map((value) => {
      const row = { ...(value as Record<string, any>) };
      if (row.key === "media_library" && Array.isArray(row.value)) {
        row.value = row.value.map((asset: Record<string, unknown>) => {
          const portable = { ...asset };
          delete portable.publicId;
          delete portable.uploadedBy;
          return portable;
        });
      }
      return row;
    });
  }
  return input;
}

async function postRestoreApi<T>(path: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new RestoreApiError(response.status, payload, typeof payload.error === "string" ? payload.error : `Restore API failed with ${response.status}`);
  return payload as T;
}

function lifecycleCopy(event: BackupEventRow) {
  if (!event.lifecycle_managed) return { label: "Legacy history", variant: "outline" as const, detail: "Completed by the legacy backup flow." };
  switch (event.status) {
    case "preflight": return { label: "Validated", variant: "secondary" as const, detail: "Validated; target DB has not been mutated." };
    case "staging": return { label: "Staging", variant: "secondary" as const, detail: "Media staging can safely resume with the same backup." };
    case "running": return { label: "Applying", variant: "secondary" as const, detail: "Atomic DB outcome may still be resolving; retry only this same operation." };
    case "committed": return { label: "DB committed", variant: "secondary" as const, detail: "Database committed; storefront reconciliation is pending." };
    case "succeeded": return { label: "Complete", variant: "default" as const, detail: "Database and storefront reconciliation completed." };
    case "failed": return { label: "Rolled back", variant: "destructive" as const, detail: "Database restore did not commit; previous target DB state remains." };
    case "cleanup_required": return { label: "Cleanup", variant: "destructive" as const, detail: "DB did not commit and staged-media cleanup still needs attention." };
    case "reconciliation_required": return { label: "Reconcile", variant: "destructive" as const, detail: "DB committed; search/cache reconciliation needs retry." };
    default: return { label: event.status || "Unknown", variant: "outline" as const, detail: "Restore lifecycle state." };
  }
}

export default function StoreBackupManager() {
  const { activeStoreId, platformRole, session, storeRole, user } = useAuth();
  const canManageBackups = getPlatformPermissions(platformRole).canManageBackups;
  const canManageActiveStore = storeRole === "owner" || storeRole === "admin";
  const allowed = canManageBackups || canManageActiveStore;
  const queryClient = useQueryClient();
  const { confirm, confirmationDialog } = useMerchantConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceStoreId, setSourceStoreId] = useState(activeStoreId ?? "");
  const [targetStoreId, setTargetStoreId] = useState(activeStoreId ?? "");
  const [backupFormat, setBackupFormat] = useState<BackupFormat>("zip");
  const [includeMedia, setIncludeMedia] = useState(true);
  const [includeAccessExport, setIncludeAccessExport] = useState(true);
  const [includeOperationalExport, setIncludeOperationalExport] = useState(false);
  const [replaceTargetContent, setReplaceTargetContent] = useState(true);
  const [preserveTargetSlug, setPreserveTargetSlug] = useState(true);
  const [keepImportedStoreDraft, setKeepImportedStoreDraft] = useState(true);
  const [includeOperationalRestore, setIncludeOperationalRestore] = useState(false);
  const [accessImportMode, setAccessImportMode] = useState<AccessImportMode>("invites_only");
  const [replaceSubscription, setReplaceSubscription] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<AtomicRestorePackage | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [preflight, setPreflight] = useState<RestorePreflight | null>(null);
  const [phase, setPhase] = useState<RestorePhase>("idle");
  const [phaseMessage, setPhaseMessage] = useState("");
  const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);
  const [currentManifest, setCurrentManifest] = useState<AtomicRestoreManifest | null>(null);
  const [currentOptions, setCurrentOptions] = useState<RestoreOptions | null>(null);

  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["backup-stores", activeStoreId, canManageBackups],
    enabled: allowed && Boolean(activeStoreId || canManageBackups),
    queryFn: async () => {
      let query = (supabase as any).from("stores").select("id,owner_id,name,slug,custom_domain,description,currency_code,locale,plan,store_type,logo_url,is_published").order("name");
      if (!canManageBackups && activeStoreId) query = query.eq("id", activeStoreId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StoreOption[];
    },
  });

  useEffect(() => {
    if (activeStoreId && stores.some((store) => store.id === activeStoreId)) {
      setSourceStoreId(activeStoreId);
      setTargetStoreId(activeStoreId);
    } else {
      if (!sourceStoreId && stores[0]?.id) setSourceStoreId(stores[0].id);
      if (!targetStoreId && stores[0]?.id) setTargetStoreId(stores[0].id);
    }
  }, [activeStoreId, sourceStoreId, stores, targetStoreId]);

  const sourceStore = useMemo(() => stores.find((store) => store.id === sourceStoreId) ?? null, [sourceStoreId, stores]);
  const targetStore = useMemo(() => stores.find((store) => store.id === targetStoreId) ?? null, [targetStoreId, stores]);
  const selectedHistoryStoreId = targetStoreId || activeStoreId || null;
  const busy = ["preflight", "staging", "committing", "reconciling"].includes(phase);

  const { data: history = [] } = useQuery({
    queryKey: ["store-backup-events", selectedHistoryStoreId],
    enabled: Boolean(selectedHistoryStoreId) && allowed,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("store_backup_events")
        .select("id,action,format,metadata,created_at,status,lifecycle_managed,error_summary")
        .eq("store_id", selectedHistoryStoreId).order("created_at", { ascending: false }).limit(16);
      if (error) throw error;
      return (data ?? []) as BackupEventRow[];
    },
  });

  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["store-backup-events", selectedHistoryStoreId] }),
    queryClient.invalidateQueries({ queryKey: ["media_library"] }),
    queryClient.invalidateQueries({ queryKey: ["site_settings"] }),
    queryClient.invalidateQueries({ queryKey: ["backup-stores"] }),
    queryClient.invalidateQueries({ queryKey: ["store-entitlements"] }),
  ]);

  const exportTables = () => ({
    ...CORE_EXPORT_TABLES,
    ...(includeAccessExport ? ACCESS_EXPORT_TABLES : {}),
    ...(includeOperationalExport ? OPERATIONAL_EXPORT_TABLES : {}),
    ...(canManageBackups ? PLATFORM_EXPORT_TABLES : {}),
  } as Record<string, string>);

  const buildBackup = async (): Promise<StoreBackupPackage> => {
    if (!sourceStore) throw new Error("Select a source store first.");
    const tables = exportTables();
    const entries = await Promise.all(Object.entries(tables).map(async ([table, column]) => {
      const { data, error } = await (supabase as any).from(table).select("*").eq(column, sourceStore.id);
      if (error) throw error;
      return [table, sanitizePortableRows(table, data ?? [])] as const;
    }));
    const tableData = Object.fromEntries(entries) as Record<string, any[]>;
    const library = normalizeMediaLibrary((tableData.site_settings ?? []).find((row: any) => row.key === "media_library")?.value);
    const data: Record<string, unknown> = { store: sourceStore, ...tableData };
    const mediaFiles: StoreBackupMediaFile[] = [];
    if (includeMedia) {
      const urls = Array.from(new Set(Array.from(collectMediaUrlsFromValue(data)).filter((url) => !url.startsWith("data:"))));
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const blob = await response.blob();
          const asset = library.find((candidate) => candidate.url === url);
          mediaFiles.push({
            originalUrl: url,
            fileName: asset?.originalFilename || inferBackupMediaFileName(url),
            mimeType: blob.type || undefined,
            resourceType: asset?.resourceType ?? inferMediaTypeFromUrl(url),
            folder: asset?.folder || inferBackupMediaFolder(url),
            dataUrl: await blobToDataUrl(blob),
          });
        } catch (error) {
          console.warn("Backup media capture skipped:", url, error);
        }
      }
    }
    return {
      version: "2026-07-26",
      exportedAt: new Date().toISOString(),
      source: { storeId: sourceStore.id, storeSlug: sourceStore.slug, storeName: sourceStore.name },
      metadata: { includedOperationalData: includeOperationalExport, includedAccessData: includeAccessExport, includedMediaFiles: includeMedia, tableKeys: Object.keys(tables) },
      data,
      mediaFiles,
    };
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const backup = await buildBackup();
      const base = `${backup.source.storeSlug || "store"}-backup-${backup.exportedAt.slice(0, 10)}`;
      if (backupFormat === "zip") downloadBlob(`${base}.zip`, await createBackupZipBlob(backup));
      else downloadBlob(`${base}.json`, new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const { error } = await (supabase as any).from("store_backup_events").insert({
        store_id: backup.source.storeId,
        actor_user_id: user?.id ?? null,
        action: "export",
        format: backupFormat,
        source_store_id: backup.source.storeId,
        target_store_id: null,
        metadata: { includedMediaFiles: includeMedia, includedAccessData: includeAccessExport, includedOperationalData: includeOperationalExport, mediaFileCount: backup.mediaFiles.length, tableKeys: backup.metadata?.tableKeys ?? [] },
      });
      if (error) throw error;
      await invalidate();
      toast.success("Store backup exported.");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to export store backup"));
    } finally {
      setExporting(false);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseBackupFileForAtomicRestore(file);
      setPendingBackup(parsed);
      setPendingFileName(file.name);
      setPreflight(null);
      setCurrentOperationId(null);
      setCurrentManifest(null);
      setCurrentOptions(null);
      setPhase("idle");
      setPhaseMessage(`Loaded ${file.name} locally. No target DB rows or media were changed.`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not read backup package"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const reconcile = async (operationId: string) => {
    if (!session?.access_token) throw new Error("Session expired.");
    setPhase("reconciling");
    setPhaseMessage("Database committed. Reconciling storefront search and caches…");
    try {
      await postRestoreApi("/api/store-backups/restore/reconcile", session.access_token, { operationId });
      setPhase("complete");
      setPhaseMessage("Restore complete. Database, search index, and storefront caches are reconciled.");
      await invalidate();
      toast.success("Store restore completed.");
    } catch (error) {
      if (error instanceof RestoreApiError && error.payload?.committed) {
        setPhase("attention");
        setPhaseMessage("Database committed, but storefront reconciliation needs retry. Do not repeat the database restore.");
        await invalidate();
        return;
      }
      throw error;
    }
  };

  const stageAndCommit = async (operationId: string, manifest: AtomicRestoreManifest, options: RestoreOptions, recoveredStatus: string) => {
    if (!session?.access_token || !pendingBackup) throw new Error("Session or selected backup is no longer available.");
    if (recoveredStatus !== "running") {
      setPhase("staging");
      for (let index = 0; index < pendingBackup.mediaFiles.length; index += 1) {
        const media = pendingBackup.mediaFiles[index];
        setPhaseMessage(`Staging media ${index + 1} of ${pendingBackup.mediaFiles.length}…`);
        const file = await atomicRestoreMediaToFile(media);
        const signed = await postRestoreApi<{ bucket: string; path: string; token: string }>("/api/store-backups/restore/media", session.access_token, {
          operationId,
          originalUrl: media.originalUrl,
          fileName: media.fileName,
          mimeType: file.type || media.mimeType || "",
          resourceType: media.resourceType,
          declaredBytes: media.declaredBytes,
        });
        const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (error && !/already exists|duplicate/i.test(error.message)) throw error;
      }
    }

    setPhase("committing");
    setPhaseMessage(recoveredStatus === "running" ? "Resolving the existing atomic restore attempt…" : "Applying the atomic database restore…");
    try {
      const result = await postRestoreApi<{ committed: boolean; status: string }>("/api/store-backups/restore/commit", session.access_token, { operationId, manifest, options });
      if (!result.committed) throw new Error("Restore transaction did not commit.");
      await reconcile(operationId);
    } catch (error) {
      if (error instanceof RestoreApiError && error.payload?.ambiguous) {
        setPhase("ambiguous");
        setPhaseMessage("DB outcome is still resolving. Retry this same operation only; do not start a different restore or delete staged media.");
        await invalidate();
        return;
      }
      setPhase("attention");
      setPhaseMessage(errorMessage(error, "Restore needs attention."));
      await invalidate();
      throw error;
    }
  };

  const startRestore = async () => {
    if (!pendingBackup || !targetStore || !session?.access_token) return;
    const manifest = buildAtomicRestoreManifest(pendingBackup);
    const options: RestoreOptions = {
      targetStoreId,
      replaceTargetContent,
      preserveTargetSlug,
      preserveTargetDomain: true,
      keepImportedStoreDraft,
      includeOperationalData: includeOperationalRestore,
      accessImportMode,
      replaceSubscription: canManageBackups && replaceSubscription,
      format: pendingFileName.toLowerCase().endsWith(".zip") ? "zip" : "json",
    };
    setCurrentManifest(manifest);
    setCurrentOptions(options);
    setPhase("preflight");
    setPhaseMessage("Validating authority, references, conflicts and restore limits…");
    try {
      const result = await postRestoreApi<RestorePreflight>("/api/store-backups/restore/preflight", session.access_token, { manifest, options });
      setPreflight(result);
      setCurrentOperationId(result.operationId);
      setPhase("idle");
      const recovered = result.status === "staging" || result.status === "running";
      setPhaseMessage(recovered
        ? `Recovered existing ${result.status} operation ${result.operationId}. Continue only this same backup.`
        : "Server preflight passed. No media or target DB rows have been changed.");
      const confirmed = await confirm({
        title: recovered ? "Resume this restore operation?" : replaceTargetContent ? "Replace and restore this store?" : "Merge this backup into the store?",
        description: recovered
          ? `This exact backup/options digest already has an active ${result.status} operation for ${result.target.name}. Resuming reuses the same durable operation.`
          : `${result.source.storeName} will be restored into ${result.target.name}. Ownership will not transfer.`,
        entityLabel: "Backup",
        entityValue: pendingFileName || result.source.storeName,
        storeName: result.target.name,
        impacts: [...result.impacts, `${result.counts.rows} database row(s) and ${result.counts.mediaFiles} media file(s) (${formatBytes(result.counts.mediaBytes)}).`, "Target custom-domain verification is never transferred by a backup."],
        warning: result.warning || undefined,
        recoveryText: "DB mutation is atomic. Confirmed DB failure rolls back target data and compensates staged media. Ambiguous transport outcomes retain the same durable operation. Post-commit search/cache reconciliation retries without replaying DB mutation.",
        confirmLabel: recovered ? "Resume same operation" : replaceTargetContent ? "Replace & restore store" : "Merge backup into store",
        tone: replaceTargetContent ? "destructive" : "warning",
      });
      if (!confirmed) return;
      await stageAndCommit(result.operationId, manifest, options, result.status);
    } catch (error) {
      setPhase("attention");
      setPhaseMessage(errorMessage(error, "Restore preflight failed."));
      toast.error(errorMessage(error, "Restore failed"));
    }
  };

  const retryCurrent = async () => {
    if (!currentOperationId || !currentManifest || !currentOptions) return;
    try {
      await stageAndCommit(currentOperationId, currentManifest, currentOptions, "running");
    } catch (error) {
      toast.error(errorMessage(error, "Restore retry failed"));
    }
  };

  if (!allowed) {
    return <Card><CardHeader><CardTitle>Store backup</CardTitle><CardDescription>Store owner/admin or full backup authority is required.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Editors, viewers, support, and billing-only roles cannot use this sensitive portability surface.</CardContent></Card>;
  }

  return <div className="space-y-6">
    {confirmationDialog}
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><DatabaseBackup className="h-5 w-5" /> Store backup & atomic restore</CardTitle><CardDescription>Portable exports and server-authoritative rollback-safe restores.</CardDescription></CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border p-4">
          <div><h3 className="font-semibold">Export backup</h3><p className="text-sm text-muted-foreground">Active invite codes, provider subscription IDs, and source object deletion identities are stripped from portable exports.</p></div>
          <div className="space-y-2"><Label>Source store</Label><Select value={sourceStoreId} onValueChange={setSourceStoreId} disabled={exporting || storesLoading}><SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger><SelectContent>{stores.map((store) => <SelectItem key={store.id} value={store.id}>{store.name} ({store.slug})</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Format</Label><Select value={backupFormat} onValueChange={(value) => setBackupFormat(value as BackupFormat)} disabled={exporting}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="zip">ZIP package</SelectItem><SelectItem value="json">JSON</SelectItem></SelectContent></Select></div>
          <label className="flex items-center justify-between gap-4 text-sm"><span>Package media</span><Switch checked={includeMedia} onCheckedChange={setIncludeMedia} disabled={exporting} /></label>
          <label className="flex items-center justify-between gap-4 text-sm"><span>Include access metadata</span><Switch checked={includeAccessExport} onCheckedChange={setIncludeAccessExport} disabled={exporting} /></label>
          <label className="flex items-center justify-between gap-4 text-sm"><span>Include operational history</span><Switch checked={includeOperationalExport} onCheckedChange={setIncludeOperationalExport} disabled={exporting} /></label>
          <Button onClick={() => void handleExport()} disabled={exporting || !sourceStore}>{exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export backup</Button>
        </section>

        <section className="space-y-4 rounded-xl border p-4">
          <div><h3 className="font-semibold">Restore backup</h3><p className="text-sm text-muted-foreground">Preflight validates first; media stages direct to Storage; target DB mutation uses one transaction.</p></div>
          <input ref={fileInputRef} type="file" accept=".json,.zip,application/json,application/zip" className="hidden" onChange={(event) => void handleFile(event)} disabled={busy} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />{pendingFileName ? "Choose another backup" : "Load backup"}</Button>
          {pendingBackup ? <div className="rounded-lg border bg-muted/30 p-3 text-sm"><div className="flex items-center gap-2 font-medium"><FileArchive className="h-4 w-4" />{pendingFileName}</div><p className="mt-1 text-muted-foreground">{pendingBackup.source.storeName} ({pendingBackup.source.storeSlug}) · {pendingBackup.mediaFiles.length} packaged media file(s)</p></div> : null}
          <div className="space-y-2"><Label>Target store</Label><Select value={targetStoreId} onValueChange={(value) => { setTargetStoreId(value); setPreflight(null); }} disabled={busy || storesLoading}><SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger><SelectContent>{stores.map((store) => <SelectItem key={store.id} value={store.id}>{store.name} ({store.slug})</SelectItem>)}</SelectContent></Select></div>
          <label className="flex items-center justify-between gap-4 text-sm"><span>Replace target content</span><Switch checked={replaceTargetContent} onCheckedChange={(value) => { setReplaceTargetContent(value); setPreflight(null); }} disabled={busy} /></label>
          <label className="flex items-center justify-between gap-4 text-sm"><span>Preserve target slug</span><Switch checked={preserveTargetSlug} onCheckedChange={(value) => { setPreserveTargetSlug(value); setPreflight(null); }} disabled={busy} /></label>
          <label className="flex items-center justify-between gap-4 text-sm"><span>Keep restored storefront draft</span><Switch checked={keepImportedStoreDraft} onCheckedChange={(value) => { setKeepImportedStoreDraft(value); setPreflight(null); }} disabled={busy} /></label>
          <label className="flex items-center justify-between gap-4 text-sm"><span>Restore operational history</span><Switch checked={includeOperationalRestore} onCheckedChange={(value) => { setIncludeOperationalRestore(value); setPreflight(null); }} disabled={busy} /></label>
          <div className="space-y-2"><Label>Access data</Label><Select value={accessImportMode} onValueChange={(value) => { setAccessImportMode(value as AccessImportMode); setPreflight(null); }} disabled={busy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Preserve target access only</SelectItem><SelectItem value="invites_only">Import pending invites</SelectItem><SelectItem value="memberships_and_invites">Merge memberships + invites</SelectItem></SelectContent></Select></div>
          {canManageBackups ? <label className="flex items-center justify-between gap-4 text-sm"><span>Replace subscription business state</span><Switch checked={replaceSubscription} onCheckedChange={(value) => { setReplaceSubscription(value); setPreflight(null); }} disabled={busy} /></label> : null}
          <Button onClick={() => void startRestore()} disabled={busy || !pendingBackup || !targetStore} variant={replaceTargetContent ? "destructive" : "default"}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validate & restore</Button>
          {(phase === "ambiguous" || (phase === "attention" && currentOperationId && currentManifest && currentOptions)) ? <Button variant="outline" onClick={() => void retryCurrent()} disabled={busy}><RefreshCcw className="mr-2 h-4 w-4" />Retry same restore operation</Button> : null}
        </section>
      </CardContent>
    </Card>

    {(phaseMessage || preflight) ? <Card><CardHeader><CardTitle className="text-base">Restore status</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex flex-wrap items-center gap-2"><Badge variant={phase === "complete" ? "default" : phase === "attention" || phase === "ambiguous" ? "destructive" : "secondary"}>{phase}</Badge><span>{phaseMessage}</span></div>{preflight ? <p className="text-muted-foreground">Operation {preflight.operationId} · target {preflight.target.name} · {preflight.counts.rows} row(s).</p> : null}</CardContent></Card> : null}

    <Card><CardHeader><CardTitle className="text-base">Backup & restore history</CardTitle><CardDescription>DB rollback and post-commit reconciliation are tracked separately.</CardDescription></CardHeader><CardContent className="space-y-3">{history.length === 0 ? <p className="text-sm text-muted-foreground">No backup history for this store yet.</p> : history.map((event) => { const lifecycle = lifecycleCopy(event); return <div key={event.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge variant={event.action === "export" ? "outline" : "secondary"}>{event.action}</Badge><Badge variant={lifecycle.variant}>{lifecycle.label}</Badge><span className="text-muted-foreground">{event.format.toUpperCase()}</span></div><span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span></div><p className="mt-2 text-muted-foreground">{lifecycle.detail}</p>{event.error_summary ? <p className="mt-1 flex items-start gap-1 text-xs text-destructive"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{event.error_summary}</p> : null}{event.lifecycle_managed && ["committed", "reconciliation_required"].includes(String(event.status)) ? <Button size="sm" variant="outline" className="mt-3" onClick={() => void reconcile(event.id)} disabled={busy}><RefreshCcw className="mr-2 h-3.5 w-3.5" />Retry reconciliation</Button> : null}</div>; })}</CardContent></Card>
  </div>;
}
