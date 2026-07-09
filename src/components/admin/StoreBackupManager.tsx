"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileArchive, Loader2, RefreshCcw, Upload, DatabaseBackup, ShieldAlert, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { uploadMediaAsset } from "@/lib/cloudinary-upload";
import { collectMediaUrlsFromValue, createBackupZipBlob, inferBackupMediaFileName, inferBackupMediaFolder, parseBackupFile, replaceUrlsInValue, type StoreBackupMediaFile } from "@/lib/store-backup";
import { inferMediaTypeFromUrl, normalizeMediaLibrary } from "@/lib/media-library";

type StoreOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  currency_code: string | null;
  locale: string | null;
  plan: string | null;
  store_type: string | null;
  logo_url: string | null;
  is_published: boolean | null;
};

const EXPORT_TABLES = {
  store_themes: "store_id",
  store_pages: "store_id",
  store_page_blocks: "store_id",
  store_page_revisions: "store_id",
  store_subscriptions: "store_id",
  products: "store_id",
  product_categories: "store_id",
  product_types: "store_id",
  coupon_codes: "store_id",
  orders: "store_id",
  product_reviews: "store_id",
  contact_messages: "store_id",
  customer_addresses: "store_id",
  site_settings: "store_id",
  store_memberships: "store_id",
  store_staff_invites: "store_id",
} as const;

const DELETE_ORDER = [
  "store_page_revisions",
  "store_page_blocks",
  "store_pages",
  "product_reviews",
  "orders",
  "coupon_codes",
  "products",
  "product_categories",
  "product_types",
  "contact_messages",
  "customer_addresses",
  "site_settings",
  "store_staff_invites",
  "store_memberships",
  "store_themes",
  "store_subscriptions",
] as const;

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

type AccessImportMode = "none" | "invites_only" | "memberships_and_invites";
type BackupFormat = "json" | "zip";

export default function StoreBackupManager() {
  const { platformRole, role, activeStoreId } = useAuth();
  const isPlatformAdmin = platformRole === "admin";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceStoreId, setSourceStoreId] = useState(activeStoreId);
  const [targetStoreId, setTargetStoreId] = useState(activeStoreId);
  const [includeMediaFiles, setIncludeMediaFiles] = useState(true);
  const [includeAccessData, setIncludeAccessData] = useState(true);
  const [backupFormat, setBackupFormat] = useState<BackupFormat>("zip");
  const [replaceTargetContent, setReplaceTargetContent] = useState(true);
  const [preserveTargetSlug, setPreserveTargetSlug] = useState(true);
  const [accessImportMode, setAccessImportMode] = useState<AccessImportMode>("invites_only");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSummary, setLastSummary] = useState<string>("");

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ["backup-stores", activeStoreId, isPlatformAdmin],
    queryFn: async () => {
      let query = (supabase as any)
        .from("stores")
        .select("id, name, slug, description, currency_code, locale, plan, store_type, logo_url, is_published")
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

  const buildBackupPackage = async () => {
    if (!sourceStore) {
      throw new Error("Select a source store first.");
    }

    const tableEntries = await Promise.all(Object.entries(EXPORT_TABLES).map(async ([tableName, column]) => {
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
      version: "2026-07-02" as const,
      exportedAt: new Date().toISOString(),
      source: {
        storeId: sourceStore.id,
        storeSlug: sourceStore.slug,
        storeName: sourceStore.name,
      },
      data,
      mediaFiles,
    };
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const backupPackage = await buildBackupPackage();
      const baseFileName = `${backupPackage.source.storeSlug || "store"}-backup-${backupPackage.exportedAt.slice(0, 10)}`;
      if (backupFormat === "zip") {
        const zipBlob = await createBackupZipBlob(backupPackage);
        downloadBlobFile(`${baseFileName}.zip`, zipBlob);
      } else {
        downloadJsonFile(`${baseFileName}.json`, backupPackage);
      }
      setLastSummary(`Exported ${backupPackage.source.storeName} as ${backupFormat.toUpperCase()} with ${backupPackage.mediaFiles.length} media files.`);
      toast.success("Store backup exported.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to export store backup");
    } finally {
      setExporting(false);
    }
  };

  const clearTargetStore = async (storeId: string) => {
    for (const tableName of DELETE_ORDER) {
      const { error } = await (supabase as any).from(tableName).delete().eq("store_id", storeId);
      if (error) {
        throw error;
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

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !targetStore) return;

    setImporting(true);

    try {
      const parsedPackage = await parseBackupFile(file);
      const urlMap = includeMediaFiles && parsedPackage.mediaFiles.length > 0
        ? await importMediaFiles(targetStore.id, parsedPackage.mediaFiles)
        : new Map<string, string>();

      const rewrittenData = replaceUrlsInValue(parsedPackage.data, urlMap) as Record<string, any>;

      if (replaceTargetContent) {
        await clearTargetStore(targetStore.id);
      }

      const incomingStore = rewrittenData.store as StoreOption | undefined;
      const nextStoreRow = {
        ...incomingStore,
        id: targetStore.id,
        slug: preserveTargetSlug ? targetStore.slug : incomingStore?.slug ?? targetStore.slug,
      };

      const { error: storeError } = await (supabase as any).from("stores").upsert(nextStoreRow, { onConflict: "id" });
      if (storeError) throw storeError;

      const upsertRows = async (tableName: string, rows: any[], onConflict = "id") => {
        if (!rows || rows.length === 0) return;
        const nextRows = rows.map((row) => ({
          ...row,
          store_id: targetStore.id,
        }));
        const { error } = await (supabase as any).from(tableName).upsert(nextRows, { onConflict });
        if (error) throw error;
      };

      await upsertRows("store_subscriptions", rewrittenData.store_subscriptions ?? [], "store_id");
      await upsertRows("store_themes", rewrittenData.store_themes ?? [], "store_id");
      await upsertRows("product_categories", rewrittenData.product_categories ?? []);
      await upsertRows("product_types", rewrittenData.product_types ?? []);
      await upsertRows("products", rewrittenData.products ?? []);
      await upsertRows("coupon_codes", rewrittenData.coupon_codes ?? []);
      await upsertRows("orders", rewrittenData.orders ?? []);
      await upsertRows("product_reviews", rewrittenData.product_reviews ?? []);
      await upsertRows("contact_messages", rewrittenData.contact_messages ?? []);
      await upsertRows("customer_addresses", rewrittenData.customer_addresses ?? []);
      await upsertRows("store_pages", rewrittenData.store_pages ?? []);
      await upsertRows("store_page_blocks", rewrittenData.store_page_blocks ?? []);
      await upsertRows("store_page_revisions", rewrittenData.store_page_revisions ?? []);

      const siteSettingsRows = (rewrittenData.site_settings ?? []).map((row: any) => ({
        ...row,
        store_id: targetStore.id,
      }));
      if (siteSettingsRows.length > 0) {
        const { error } = await (supabase as any).from("site_settings").upsert(siteSettingsRows, { onConflict: "store_id,key" });
        if (error) throw error;
      }

      if (accessImportMode !== "none") {
        const importedInvites = (rewrittenData.store_staff_invites ?? []).map((row: any) => ({
          ...row,
          id: crypto.randomUUID(),
          store_id: targetStore.id,
          invite_code: createInviteCode(),
          claimed_by: null,
          claimed_at: null,
          status: "pending",
        }));

        if (importedInvites.length > 0) {
          const { error } = await (supabase as any).from("store_staff_invites").upsert(importedInvites, { onConflict: "id" });
          if (error) throw error;
        }
      }

      if (accessImportMode === "memberships_and_invites") {
        const importedMemberships = (rewrittenData.store_memberships ?? [])
          .filter((row: any) => row.user_id)
          .map((row: any) => ({
            ...row,
            id: crypto.randomUUID(),
            store_id: targetStore.id,
          }));

        if (importedMemberships.length > 0) {
          const { error } = await (supabase as any).from("store_memberships").upsert(importedMemberships, { onConflict: "store_id,user_id" });
          if (error) throw error;
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["media_library", targetStore.id] }),
        queryClient.invalidateQueries({ queryKey: ["site_settings", targetStore.id] }),
        queryClient.invalidateQueries({ queryKey: ["backup-stores"] }),
      ]);

      setLastSummary(`Imported ${parsedPackage.source.storeName} into ${targetStore.name} with ${parsedPackage.mediaFiles.length} packaged media files and access mode ${accessImportMode}.`);
      toast.success("Store backup imported.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to import store backup");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6">
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
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Export Store</p>
              <p className="text-xs text-muted-foreground">Creates a self-contained JSON backup package.</p>
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
                Exporting <span className="font-medium text-foreground">{sourceStore.name}</span> will capture CMS pages, theme, site settings, products, coupons, orders, reviews, messages, addresses, media references, and optionally staff access metadata.
              </div>
            ) : null}
            <Button type="button" onClick={() => void handleExport()} disabled={exporting || importing || !sourceStore} className="gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : backupFormat === "zip" ? <FileArchive className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              Export {backupFormat === "zip" ? "ZIP" : "JSON"}
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Import Into Store</p>
              <p className="text-xs text-muted-foreground">Restore a backup package into an existing store workspace.</p>
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
                  Import rewrites store ownership to the selected workspace and can overwrite target content. Invite imports are regenerated as new pending codes, and membership imports assume those user accounts already exist on this platform.
                </p>
              </div>
            </div>
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
              onChange={handleImportFile}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing || exporting || !targetStore} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Last Action</CardTitle>
            <CardDescription>Recent export/import summary for this admin session.</CardDescription>
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
    </div>
  );
}

