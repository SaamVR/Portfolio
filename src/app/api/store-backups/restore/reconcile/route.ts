import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageStore, getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import {
  getRequestId,
  recordCaughtIncident,
  recordPlatformIncident,
  sanitizeIncidentText,
} from "@/lib/platform/incident-logger";
import { rateLimit } from "@/lib/rate-limit";
import { resetStorefrontSearchDocumentsForStore } from "@/lib/storefront/storefront-restore-reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({ operationId: z.string().uuid() });

function normalizePageTagSlug(slug: string) {
  const trimmed = slug.trim();
  if (!trimmed || trimmed === "/") return "homepage";
  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return normalized.replace(/[^\w/-]+/g, "-") || "homepage";
}

export async function POST(req: Request) {
  const admin = getSupabaseAdminClient();
  let operationId: string | null = null;
  let committedStoreId: string | null = null;
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limit = await rateLimit(`store_restore_reconcile:${user.id}`, { limit: 30, windowMs: 60 * 60_000 });
    if (!limit.success) return NextResponse.json({ error: "Too many restore reconciliation attempts" }, { status: 429 });

    const input = requestSchema.parse(await req.json());
    operationId = input.operationId;
    const { data: operation, error: operationError } = await admin
      .from("store_backup_events")
      .select("id,target_store_id,status,lifecycle_managed,action")
      .eq("id", operationId)
      .eq("lifecycle_managed", true)
      .eq("action", "import")
      .maybeSingle();
    if (operationError) throw operationError;
    if (!operation?.target_store_id) return NextResponse.json({ error: "Restore operation not found" }, { status: 404 });

    const allowed = await canManageStore(admin, operation.target_store_id, user.id, ["owner", "admin"]);
    if (!allowed) return NextResponse.json({ error: "Store owner or admin access required" }, { status: 403 });

    if (operation.status === "succeeded") {
      return NextResponse.json({ committed: true, status: "succeeded", replayed: true });
    }
    if (!["committed", "reconciliation_required"].includes(String(operation.status))) {
      return NextResponse.json({ error: `Restore is ${operation.status}; database reconciliation is not available yet.` }, { status: 409 });
    }
    committedStoreId = operation.target_store_id;

    const warnings: string[] = [];
    try {
      await resetStorefrontSearchDocumentsForStore(operation.target_store_id);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "External product search reconciliation failed");
    }

    try {
      const [{ data: store, error: storeError }, { data: pages, error: pagesError }] = await Promise.all([
        admin.from("stores").select("slug").eq("id", operation.target_store_id).maybeSingle(),
        admin.from("store_pages").select("slug").eq("store_id", operation.target_store_id),
      ]);
      if (storeError) throw storeError;
      if (pagesError) throw pagesError;
      if (!store?.slug) throw new Error("Target store no longer exists");

      const storeSlug = String(store.slug);
      revalidateTag(`store:${operation.target_store_id}`, "max");
      revalidateTag(`store:${operation.target_store_id}:content`, "max");
      revalidateTag(`store:${operation.target_store_id}:products`, "max");
      revalidateTag(`store:${operation.target_store_id}:taxonomy`, "max");
      revalidateTag(`store:${operation.target_store_id}:search`, "max");
      revalidateTag(`storefront:slug:${storeSlug}`, "max");
      revalidatePath(`/stores/${storeSlug}`);
      revalidatePath(`/stores/${storeSlug}/shop`);
      revalidatePath(`/stores/${storeSlug}/product/[slugId]`, "page");
      for (const page of pages ?? []) {
        const slug = typeof page.slug === "string" ? page.slug.trim() : "";
        revalidateTag(`store:${operation.target_store_id}:page:${normalizePageTagSlug(slug)}`, "max");
        if (slug && slug !== "/") {
          const normalized = slug.startsWith("/") ? slug.slice(1) : slug;
          if (normalized) revalidatePath(`/stores/${storeSlug}/${normalized}`);
        }
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Storefront cache reconciliation failed");
    }

    const now = new Date().toISOString();
    if (warnings.length > 0) {
      const summary = sanitizeIncidentText(warnings.join("; "), 500) || "Store restore reconciliation failed";
      const { error: updateError } = await admin.from("store_backup_events").update({
        status: "reconciliation_required",
        error_summary: summary,
        updated_at: now,
        completed_at: null,
      }).eq("id", operationId).eq("lifecycle_managed", true);
      if (updateError) throw updateError;
      await recordPlatformIncident(admin, {
        fingerprint: "store-restore-reconciliation-required",
        severity: "warning",
        source: "store_restore",
        title: "Committed store restore requires reconciliation",
        message: summary,
        route: "/api/store-backups/restore/reconcile",
        storeId: operation.target_store_id,
        requestId: getRequestId(req),
        metadata: { operation_id: operationId, warning_count: warnings.length },
      });
      return NextResponse.json({
        committed: true,
        status: "reconciliation_required",
        error: summary,
        recoveryRequired: true,
      }, { status: 503 });
    }

    const { error: successError } = await admin.from("store_backup_events").update({
      status: "succeeded",
      error_summary: null,
      updated_at: now,
      completed_at: now,
    }).eq("id", operationId).eq("lifecycle_managed", true);
    if (successError) throw successError;

    return NextResponse.json({ committed: true, status: "succeeded" });
  } catch (error) {
    const message = sanitizeIncidentText(
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid restore reconciliation request"
        : error instanceof Error ? error.message : "Restore reconciliation failed",
      500,
    ) || "Restore reconciliation failed";
    if (operationId) {
      await admin.from("store_backup_events").update({
        status: "reconciliation_required",
        error_summary: message,
        updated_at: new Date().toISOString(),
      }).eq("id", operationId).eq("lifecycle_managed", true).in("status", ["committed", "reconciliation_required"]);
    }
    if (operationId && committedStoreId) {
      await recordCaughtIncident(admin, {
        fingerprint: "store-restore-reconciliation-required",
        severity: "warning",
        source: "store_restore",
        title: "Committed store restore reconciliation failed",
        error,
        route: "/api/store-backups/restore/reconcile",
        storeId: committedStoreId,
        requestId: getRequestId(req),
        metadata: { operation_id: operationId, phase: "reconcile_exception" },
      });
    }
    console.error("Store restore reconciliation failed:", message);
    return NextResponse.json({ error: message, committed: Boolean(operationId), recoveryRequired: Boolean(operationId) }, { status: 500 });
  }
}
