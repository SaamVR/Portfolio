import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageStore, getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import {
  digestRestoreRequest,
  normalizeStoreRestorePlan,
  readBoundedRestoreJson,
  RestoreHttpError,
  restoreOptionsSchema,
  validateRestoreManifest,
  type RestoreStagedMedia,
  type StoreRestoreTarget,
} from "@/lib/store-backup-restore";
import { assertNormalizedRestorePlanConstraints } from "@/lib/store-backup-restore-plan-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_BUCKET = "store-media";

function rows(data: Record<string, unknown>, key: string) {
  return Array.isArray(data[key]) ? data[key] as Array<Record<string, unknown>> : [];
}

function optionalUuid(value: unknown) {
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

function collectUserIds(
  manifest: ReturnType<typeof validateRestoreManifest>,
  options: z.infer<typeof restoreOptionsSchema>,
) {
  const ids = new Set<string>();
  if (options.includeOperationalData) {
    for (const key of ["orders", "customer_addresses", "store_customer_profiles"] as const) {
      for (const row of rows(manifest.data, key)) {
        const id = optionalUuid(row.user_id);
        if (id) ids.add(id);
      }
    }
  }
  if (options.accessImportMode === "memberships_and_invites") {
    for (const row of rows(manifest.data, "store_memberships")) {
      const id = optionalUuid(row.user_id);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

async function cleanupFailedRestore(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  operationId: string,
  staged: RestoreStagedMedia[],
  errorSummary: string | null,
) {
  if (staged.length === 0) return { cleanupRequired: false };
  const { error: cleanupError } = await admin.storage.from(MEDIA_BUCKET).remove(staged.map((item) => item.path));
  if (!cleanupError) return { cleanupRequired: false };

  const summary = `${errorSummary || "Restore failed"}; staged-media cleanup needs retry`.slice(0, 500);
  await admin.from("store_backup_events").update({
    status: "cleanup_required",
    error_summary: summary,
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }).eq("id", operationId).eq("lifecycle_managed", true);
  return { cleanupRequired: true };
}

async function failBeforeClaim(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  operationId: string,
  staged: RestoreStagedMedia[],
  message: string,
) {
  const summary = message.slice(0, 500);
  await admin.from("store_backup_events").update({
    status: "failed",
    error_summary: summary,
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }).eq("id", operationId).eq("lifecycle_managed", true).in("status", ["preflight", "staging"]);
  return cleanupFailedRestore(admin, operationId, staged, summary);
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limit = await rateLimit(`store_restore_commit:${user.id}`, { limit: 10, windowMs: 60 * 60_000 });
    if (!limit.success) return NextResponse.json({ error: "Too many restore commit attempts" }, { status: 429 });

    const body = await readBoundedRestoreJson(req) as { operationId?: unknown; manifest?: unknown; options?: unknown };
    const operationId = z.string().uuid().parse(body.operationId);
    const manifest = validateRestoreManifest(body.manifest);
    const options = restoreOptionsSchema.parse(body.options);
    const requestDigest = digestRestoreRequest(manifest, options);
    const admin = getSupabaseAdminClient();

    const { data: operation, error: operationError } = await admin
      .from("store_backup_events")
      .select("*")
      .eq("id", operationId)
      .eq("lifecycle_managed", true)
      .maybeSingle();
    if (operationError) throw operationError;
    if (!operation?.target_store_id) return NextResponse.json({ error: "Restore operation not found" }, { status: 404 });
    if (operation.actor_user_id !== user.id) return NextResponse.json({ error: "Restore actor mismatch" }, { status: 403 });
    if (operation.request_digest !== requestDigest) return NextResponse.json({ error: "Restore request changed after preflight" }, { status: 409 });
    if (operation.target_store_id !== options.targetStoreId) return NextResponse.json({ error: "Restore target changed after preflight" }, { status: 409 });

    const allowed = await canManageStore(admin, operation.target_store_id, user.id, ["owner", "admin"]);
    if (!allowed) return NextResponse.json({ error: "Store owner or admin access required" }, { status: 403 });

    const staged = Array.isArray((operation.metadata as any)?.staged_media)
      ? (operation.metadata as any).staged_media as RestoreStagedMedia[]
      : [];
    const mediaManifest = Array.isArray((operation.metadata as any)?.media_manifest)
      ? (operation.metadata as any).media_manifest as Array<Record<string, unknown>>
      : [];
    if (staged.length !== mediaManifest.length || staged.length !== manifest.mediaFiles.length) {
      return NextResponse.json({ error: "Restore media staging is incomplete" }, { status: 409 });
    }

    if (staged.length > 0) {
      const prefix = `stores/${operation.target_store_id}/restore/${operationId}`;
      const { data: files, error: listError } = await admin.storage.from(MEDIA_BUCKET).list(prefix, {
        limit: 200,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });
      if (listError) throw listError;
      const listed = new Map((files ?? []).map((file) => [file.name, file]));
      for (const item of staged) {
        const fileName = item.path.startsWith(`${prefix}/`) ? item.path.slice(prefix.length + 1) : "";
        const stored = listed.get(fileName);
        const storedBytes = Number((stored as any)?.metadata?.size ?? -1);
        if (!stored || !Number.isFinite(storedBytes) || storedBytes !== Number(item.declaredBytes)) {
          return NextResponse.json({ error: `Staged restore media is missing or incomplete: ${item.asset.originalFilename || fileName}` }, { status: 409 });
        }
      }
    }

    let plan: Record<string, unknown>;
    try {
      const [targetResult, membershipResult, existingSubscriptionResult, homepageResult] = await Promise.all([
        admin.from("stores").select("id,owner_id,name,slug,custom_domain,description,currency_code,locale,plan,store_type,logo_url,is_published").eq("id", operation.target_store_id).maybeSingle(),
        admin.from("store_memberships").select("role").eq("store_id", operation.target_store_id).eq("user_id", user.id).maybeSingle(),
        admin.from("store_subscriptions").select("id,provider,provider_subscription_id").eq("store_id", operation.target_store_id).maybeSingle(),
        admin.from("store_pages").select("id").eq("store_id", operation.target_store_id).eq("is_homepage", true).limit(1),
      ]);
      for (const result of [targetResult, membershipResult, existingSubscriptionResult, homepageResult]) {
        if (result.error) throw result.error;
      }
      if (!targetResult.data) throw new Error("Target store disappeared before restore.");

      const requestedUserIds = collectUserIds(manifest, options);
      const userResolution = requestedUserIds.length
        ? await (admin as any).rpc("resolve_store_restore_users", { p_user_ids: requestedUserIds })
        : { data: [], error: null };
      if (userResolution.error) throw userResolution.error;
      const authUserIds = new Set<string>((userResolution.data ?? []).map(String));

      const requestedThemeIds = Array.from(new Set(
        rows(manifest.data, "store_themes").map((row) => optionalUuid(row.theme_package_id)).filter(Boolean),
      )) as string[];
      const themeResult = requestedThemeIds.length
        ? await admin.from("theme_packages").select("id").in("id", requestedThemeIds)
        : { data: [], error: null };
      if (themeResult.error) throw themeResult.error;

      plan = normalizeStoreRestorePlan(manifest, options, {
        operationId,
        actorId: user.id,
        actorExistingRole: (membershipResult.data?.role as any) ?? null,
        target: targetResult.data as StoreRestoreTarget,
        authUserIds,
        validThemePackageIds: new Set((themeResult.data ?? []).map((row) => String(row.id))),
        existingSubscription: existingSubscriptionResult.data,
        targetHasHomepage: (homepageResult.data ?? []).length > 0,
        stagedMedia: staged,
      }) as Record<string, unknown>;
      assertNormalizedRestorePlanConstraints(plan);
    } catch (normalizationError) {
      const message = normalizationError instanceof Error ? normalizationError.message : "Restore normalization failed";
      const cleanup = await failBeforeClaim(admin, operationId, staged, message);
      return NextResponse.json({
        committed: false,
        status: cleanup.cleanupRequired ? "cleanup_required" : "failed",
        error: message.slice(0, 350),
      }, { status: 409 });
    }

    const claimResult = await (admin as any).rpc("claim_store_restore_operation", {
      p_operation_id: operationId,
      p_actor_id: user.id,
      p_request_digest: requestDigest,
    });
    if (claimResult.error) throw claimResult.error;
    const claim = Array.isArray(claimResult.data) ? claimResult.data[0] : claimResult.data;
    if (!claim?.operation_status) throw new Error("Restore claim returned no state.");

    if (["committed", "succeeded", "reconciliation_required"].includes(String(claim.operation_status))) {
      return NextResponse.json({
        committed: true,
        status: claim.operation_status,
        replayed: true,
        needsReconciliation: claim.operation_status !== "succeeded",
      });
    }
    if (claim.operation_status === "failed") {
      const cleanup = await cleanupFailedRestore(admin, operationId, staged, claim.error_summary ?? null);
      return NextResponse.json({
        committed: false,
        status: cleanup.cleanupRequired ? "cleanup_required" : "failed",
        error: claim.error_summary || "Restore preflight was invalidated before database mutation.",
      }, { status: 409 });
    }
    if (claim.operation_status !== "running" || !claim.attempt_token) {
      return NextResponse.json({ error: claim.error_summary || "Restore operation is not ready to commit" }, { status: 409 });
    }

    let transactionResult;
    try {
      transactionResult = await (admin as any).rpc("restore_store_backup_transactional", {
        p_operation_id: operationId,
        p_actor_id: user.id,
        p_attempt_token: claim.attempt_token,
        p_request_digest: requestDigest,
        p_plan: plan,
      });
    } catch (transportError) {
      console.error("Restore RPC transport failed with ambiguous outcome:", transportError);
      return NextResponse.json({
        error: "Restore outcome is being reconciled. Do not start another restore.",
        status: "running",
        ambiguous: true,
      }, { status: 503 });
    }

    if (transactionResult.error) {
      console.error("Restore RPC returned an ambiguous transport error:", transactionResult.error);
      return NextResponse.json({
        error: "Restore outcome is being reconciled. Do not start another restore.",
        status: "running",
        ambiguous: true,
      }, { status: 503 });
    }

    const outcome = Array.isArray(transactionResult.data) ? transactionResult.data[0] : transactionResult.data;
    if (!outcome?.committed) {
      const cleanup = await cleanupFailedRestore(admin, operationId, staged, outcome?.error_summary ?? null);
      return NextResponse.json({
        committed: false,
        status: cleanup.cleanupRequired ? "cleanup_required" : outcome?.operation_status || "failed",
        error: outcome?.error_summary || "Restore transaction rolled back.",
      }, { status: 409 });
    }

    return NextResponse.json({
      committed: true,
      status: outcome.operation_status || "committed",
      replayed: outcome.replayed === true,
      needsReconciliation: true,
    });
  } catch (error) {
    const status = error instanceof RestoreHttpError ? error.status : error instanceof z.ZodError ? 400 : 500;
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message || "Invalid restore commit request"
      : error instanceof Error ? error.message.slice(0, 350) : "Restore commit failed";
    console.error("Store restore commit failed:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
