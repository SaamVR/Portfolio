import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageStore, getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import {
  countRestoreRows,
  digestRestoreRequest,
  normalizeStoreRestorePlan,
  readBoundedRestoreJson,
  RestoreHttpError,
  restoreOptionsSchema,
  validateRestoreManifest,
  type StoreRestoreTarget,
} from "@/lib/store-backup-restore";
import { assertNormalizedRestorePlanConstraints } from "@/lib/store-backup-restore-plan-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dataRows(data: Record<string, unknown>, key: string) {
  return Array.isArray(data[key]) ? data[key] as Array<Record<string, unknown>> : [];
}

function optionalUuid(value: unknown) {
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sourceUserIds(
  manifest: ReturnType<typeof validateRestoreManifest>,
  options: z.infer<typeof restoreOptionsSchema>,
) {
  const ids = new Set<string>();
  if (options.includeOperationalData) {
    for (const row of dataRows(manifest.data, "orders")) {
      const id = optionalUuid(row.user_id);
      if (id) ids.add(id);
    }
    for (const key of ["customer_addresses", "store_customer_profiles"] as const) {
      for (const row of dataRows(manifest.data, key)) {
        const id = optionalUuid(row.user_id);
        if (id) ids.add(id);
      }
    }
  }
  if (options.accessImportMode === "memberships_and_invites") {
    for (const row of dataRows(manifest.data, "store_memberships")) {
      const id = optionalUuid(row.user_id);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limit = await rateLimit(`store_restore_preflight:${user.id}`, { limit: 12, windowMs: 60 * 60_000 });
    if (!limit.success) return NextResponse.json({ error: "Too many restore preflight attempts" }, { status: 429 });

    const body = await readBoundedRestoreJson(req) as { manifest?: unknown; options?: unknown };
    const manifest = validateRestoreManifest(body.manifest);
    const options = restoreOptionsSchema.parse(body.options);

    const seenMediaUrls = new Set<string>();
    for (const media of manifest.mediaFiles) {
      if (seenMediaUrls.has(media.originalUrl)) {
        return NextResponse.json({ error: `Backup repeats packaged media URL: ${media.originalUrl}` }, { status: 400 });
      }
      seenMediaUrls.add(media.originalUrl);
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const authorized = await canManageStore(supabaseAdmin, options.targetStoreId, user.id, ["owner", "admin"]);
    if (!authorized) return NextResponse.json({ error: "Store owner or admin access required" }, { status: 403 });

    const [targetResult, membershipResult, platformRoleResult, domainResult, existingSubscriptionResult, homepageResult] = await Promise.all([
      supabaseAdmin.from("stores").select("id,owner_id,name,slug,custom_domain,description,currency_code,locale,plan,store_type,logo_url,is_published").eq("id", options.targetStoreId).maybeSingle(),
      supabaseAdmin.from("store_memberships").select("role").eq("store_id", options.targetStoreId).eq("user_id", user.id).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id),
      supabaseAdmin.from("store_domains").select("hostname,status,is_primary,vercel_verified,cloudflare_hostname_status,cloudflare_ssl_status").eq("store_id", options.targetStoreId),
      supabaseAdmin.from("store_subscriptions").select("id,plan_id,status,provider,provider_subscription_id").eq("store_id", options.targetStoreId).maybeSingle(),
      supabaseAdmin.from("store_pages").select("id").eq("store_id", options.targetStoreId).eq("is_homepage", true).limit(1),
    ]);
    for (const result of [targetResult, membershipResult, platformRoleResult, domainResult, existingSubscriptionResult, homepageResult]) {
      if (result.error) throw result.error;
    }
    if (!targetResult.data) return NextResponse.json({ error: "Target store not found" }, { status: 404 });

    const target = targetResult.data as StoreRestoreTarget;
    const platformRoles = (platformRoleResult.data ?? []).map((row) => String(row.role));
    const fullPlatformBackupAdmin = platformRoles.includes("admin") || platformRoles.includes("super_admin");
    if (options.replaceSubscription && !fullPlatformBackupAdmin) {
      return NextResponse.json({ error: "Only full platform backup administrators can replace subscription business state" }, { status: 403 });
    }

    const sourceStore = manifest.data.store as Record<string, unknown>;
    const incomingSlug = text(sourceStore.slug);
    const incomingDomain = text(sourceStore.custom_domain) || null;
    const activeDomains = (domainResult.data ?? []).filter((domain) =>
      domain.status === "active"
      || (domain.cloudflare_hostname_status === "active" && domain.cloudflare_ssl_status === "active")
      || domain.vercel_verified === true,
    );

    if (!options.preserveTargetSlug && activeDomains.length > 0) {
      return NextResponse.json({ error: "Detach or manage active custom domains before changing the target slug during restore." }, { status: 409 });
    }
    if (!options.preserveTargetDomain) {
      const primary = activeDomains.find((domain) => domain.is_primary);
      if (!incomingDomain || incomingDomain !== target.custom_domain || primary?.hostname !== incomingDomain) {
        return NextResponse.json({ error: "Custom-domain ownership is not portable through backups. Use Domains settings; restore may only keep the already verified primary target domain." }, { status: 409 });
      }
    }

    if (!options.preserveTargetSlug) {
      if (!incomingSlug) return NextResponse.json({ error: "Backup store slug is missing" }, { status: 400 });
      const slugResult = await supabaseAdmin.from("stores").select("id").eq("slug", incomingSlug).neq("id", target.id).limit(1);
      if (slugResult.error) throw slugResult.error;
      if ((slugResult.data ?? []).length > 0) return NextResponse.json({ error: `Store slug "${incomingSlug}" is already in use.` }, { status: 409 });
    }

    if (!options.replaceTargetContent) {
      const [pagesResult, blogsResult] = await Promise.all([
        supabaseAdmin.from("store_pages").select("slug").eq("store_id", target.id),
        supabaseAdmin.from("blog_posts").select("slug").eq("store_id", target.id),
      ]);
      if (pagesResult.error) throw pagesResult.error;
      if (blogsResult.error) throw blogsResult.error;
      const targetPageSlugs = new Set((pagesResult.data ?? []).map((row) => String(row.slug)));
      const targetBlogSlugs = new Set((blogsResult.data ?? []).map((row) => String(row.slug)));
      const pageCollision = dataRows(manifest.data, "store_pages").map((row) => text(row.slug)).find((slug) => targetPageSlugs.has(slug));
      const blogCollision = dataRows(manifest.data, "blog_posts").map((row) => text(row.slug)).find((slug) => targetBlogSlugs.has(slug));
      if (pageCollision) return NextResponse.json({ error: `Merge restore conflicts with existing page slug "${pageCollision}".` }, { status: 409 });
      if (blogCollision) return NextResponse.json({ error: `Merge restore conflicts with existing blog slug "${blogCollision}".` }, { status: 409 });
    }

    const requestedUserIds = sourceUserIds(manifest, options);
    const userResolution = requestedUserIds.length > 0
      ? await (supabaseAdmin as any).rpc("resolve_store_restore_users", { p_user_ids: requestedUserIds })
      : { data: [], error: null };
    if (userResolution.error) throw userResolution.error;
    const authUserIds = new Set<string>((userResolution.data ?? []).map(String));

    const requestedThemePackageIds = Array.from(new Set(
      dataRows(manifest.data, "store_themes").map((row) => optionalUuid(row.theme_package_id)).filter(Boolean),
    )) as string[];
    const themeResult = requestedThemePackageIds.length > 0
      ? await supabaseAdmin.from("theme_packages").select("id").in("id", requestedThemePackageIds)
      : { data: [], error: null };
    if (themeResult.error) throw themeResult.error;
    const validThemePackageIds = new Set((themeResult.data ?? []).map((row) => String(row.id)));

    if (options.replaceSubscription) {
      const sourceSubscription = dataRows(manifest.data, "store_subscriptions")[0];
      if (!sourceSubscription) return NextResponse.json({ error: "Subscription replacement was requested but the backup has no subscription business state." }, { status: 400 });
      const planId = text(sourceSubscription.plan_id);
      const planResult = await supabaseAdmin.from("cms_plans").select("id").eq("id", planId).maybeSingle();
      if (planResult.error) throw planResult.error;
      if (!planResult.data) return NextResponse.json({ error: `Backup subscription plan "${planId}" does not exist.` }, { status: 409 });
    }

    const dryPlan = normalizeStoreRestorePlan(manifest, options, {
      operationId: "00000000-0000-4000-8000-000000000169",
      actorId: user.id,
      actorExistingRole: (membershipResult.data?.role as any) ?? null,
      target,
      authUserIds,
      validThemePackageIds,
      existingSubscription: existingSubscriptionResult.data,
      targetHasHomepage: (homepageResult.data ?? []).length > 0,
      stagedMedia: [],
    });
    assertNormalizedRestorePlanConstraints(dryPlan as Record<string, unknown>);

    let sourceStoreId: string | null = optionalUuid(manifest.source.storeId);
    if (sourceStoreId) {
      const canAuditSource = await canManageStore(supabaseAdmin, sourceStoreId, user.id, ["owner", "admin"]);
      if (!canAuditSource) sourceStoreId = null;
    }

    const digest = digestRestoreRequest(manifest, options);
    const mediaBytes = manifest.mediaFiles.reduce((sum, media) => sum + media.declaredBytes, 0);
    let reviewCount = 0;
    let linkedAnalyticsCount = 0;
    if (options.replaceTargetContent) {
      const [reviews, analytics] = await Promise.all([
        supabaseAdmin.from("product_reviews").select("id", { count: "exact", head: true }).eq("store_id", target.id),
        supabaseAdmin.from("store_analytics_events").select("id", { count: "exact", head: true }).eq("store_id", target.id).not("product_id", "is", null),
      ]);
      if (reviews.error) throw reviews.error;
      if (analytics.error) throw analytics.error;
      reviewCount = reviews.count ?? 0;
      linkedAnalyticsCount = analytics.count ?? 0;
    }

    const operationResult = await (supabaseAdmin as any).rpc("create_store_restore_operation", {
      p_target_store_id: target.id,
      p_actor_id: user.id,
      p_request_digest: digest,
      p_format: options.format,
      p_source_store_id: sourceStoreId,
      p_source_metadata: {
        backupStoreId: manifest.source.storeId,
        sourceStoreName: manifest.source.storeName,
        sourceStoreSlug: manifest.source.storeSlug,
        exportedAt: manifest.exportedAt,
      },
      p_options: options,
      p_media_manifest: manifest.mediaFiles,
    });
    if (operationResult.error) throw operationResult.error;
    const operation = Array.isArray(operationResult.data) ? operationResult.data[0] : operationResult.data;
    if (!operation?.operation_id) throw new Error("Restore preflight did not create an operation.");

    const impacts = [
      options.replaceTargetContent
        ? "Replace the selected target content atomically; a database error rolls the target back."
        : "Merge imported rows into the target; page and blog slug collisions are rejected instead of renamed.",
      options.keepImportedStoreDraft ? "Leave the restored storefront unpublished." : "Allow the backup published state to be restored.",
      options.includeOperationalData ? "Restore the packaged operational history." : "Preserve target operational history except unavoidable product-reference detach/cascade behavior.",
      options.accessImportMode === "none"
        ? "Preserve all target staff access."
        : options.accessImportMode === "invites_only"
          ? "Recreate packaged pending invites with new invite codes."
          : "Merge packaged memberships/invites without changing target ownership or existing authority floors.",
      options.replaceSubscription ? "Replace subscription business state while retaining the target provider identity." : "Preserve the target subscription.",
    ];
    if (reviewCount > 0 && options.replaceTargetContent && !options.includeOperationalData) {
      impacts.push(`${reviewCount} current review row(s) are tied to products that will be replaced and may cascade away.`);
    }
    if (linkedAnalyticsCount > 0 && options.replaceTargetContent && !options.includeOperationalData) {
      impacts.push(`${linkedAnalyticsCount} analytics row(s) currently reference products that will be replaced; those product references may detach.`);
    }

    return NextResponse.json({
      operationId: operation.operation_id,
      status: operation.operation_status,
      requestDigest: digest,
      targetStateDigest: operation.target_state_digest,
      target: { id: target.id, name: target.name, slug: target.slug, isPublished: target.is_published === true },
      source: manifest.source,
      counts: { rows: countRestoreRows(manifest), mediaFiles: manifest.mediaFiles.length, mediaBytes },
      impacts,
      warning: target.is_published
        ? "This target is currently published. New target edits after confirmation invalidate this preflight instead of being silently overwritten."
        : null,
    });
  } catch (error) {
    const status = error instanceof RestoreHttpError ? error.status : error instanceof z.ZodError ? 400 : 400;
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message || "Invalid restore request"
      : error instanceof Error ? error.message.slice(0, 400) : "Restore preflight failed";
    console.error("Store restore preflight failed:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
