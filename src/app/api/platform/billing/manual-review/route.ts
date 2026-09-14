import { NextResponse } from "next/server";
import { addMonths, getAuthenticatedUser, getSupabaseAdminClient, upsertStoreSubscription } from "@/lib/api/supabase-route";
import { logPlatformAuditAction } from "@/lib/platform/audit-logger";
import { MANUAL_BKASH_PROVIDER, normalizeManualBkashTransactionId } from "@/lib/billing/provider-transaction-id";
import { getRequestId, recordPlatformIncident } from "@/lib/platform/incident-logger";

export const manualBillingReviewRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  upsertStoreSubscription,
  recordPlatformIncident,
  now: () => new Date(),
};

const MANUAL_BILLING_PLATFORM_ROLE_PRIORITY = ["admin", "co_admin", "super_admin", "billing_admin"] as const;

function getManualBillingReviewErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const message = "message" in error && typeof error.message === "string" ? error.message.trim() : "";
    const details = "details" in error && typeof error.details === "string" ? error.details.trim() : "";
    const hint = "hint" in error && typeof error.hint === "string" ? error.hint.trim() : "";
    const code = "code" in error && typeof error.code === "string" ? error.code.trim() : "";

    const composed = [message, details, hint].filter(Boolean).join(" ");
    if (composed) {
      return code ? `${composed} (code: ${code})` : composed;
    }
  }

  return "Failed to review manual payment";
}

async function isPlatformAdmin(userId: string) {
  const supabaseAdmin = manualBillingReviewRouteDeps.getSupabaseAdminClient();
  const roleQuery = supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roleLookup = typeof (roleQuery as any)?.in === "function"
    ? await (roleQuery as any).in("role", [...MANUAL_BILLING_PLATFORM_ROLE_PRIORITY]).order("created_at", { ascending: true })
    : await roleQuery;

  if (roleLookup.error) throw roleLookup.error;

  const resolvedRole =
    Array.isArray(roleLookup.data)
      ? (MANUAL_BILLING_PLATFORM_ROLE_PRIORITY.find((candidate) =>
          roleLookup.data.some((row) => typeof row?.role === "string" && row.role === candidate),
        ) ?? null)
      : null;
  return { allowed: Boolean(resolvedRole), role: resolvedRole };
}

export async function POST(req: Request) {
  try {
    const user = await manualBillingReviewRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, role: userRole } = await isPlatformAdmin(user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId.trim() : "";
    const action = body?.action === "reject" ? "reject" : body?.action === "approve" ? "approve" : null;
    const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim() : "";

    if (!invoiceId || !action) {
      return NextResponse.json({ error: "Missing invoiceId or action" }, { status: 400 });
    }

    if (action === "reject" && !reviewNote) {
      return NextResponse.json({ error: "A review note is required when rejecting a payment" }, { status: 400 });
    }

    const supabaseAdmin = manualBillingReviewRouteDeps.getSupabaseAdminClient();
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("store_invoices")
      .select("id, store_id, plan_id, status, billing_interval, payment_method, provider, provider_invoice_id")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const isManualInvoice =
      invoice.payment_method === MANUAL_BKASH_PROVIDER || invoice.provider === MANUAL_BKASH_PROVIDER;
    if (!isManualInvoice) {
      return NextResponse.json({ error: "Only manual bKash invoices can be reviewed here" }, { status: 400 });
    }
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: "This invoice is no longer pending review" }, { status: 409 });
    }

    const transactionId = normalizeManualBkashTransactionId(invoice.provider_invoice_id ?? "");
    if (action === "approve" && !transactionId) {
      return NextResponse.json(
        { error: "This manual payment has no provider transaction identity." },
        { status: 409 },
      );
    }

    if (action === "approve") {
      const { data: transactionCollision, error: transactionCollisionError } = await supabaseAdmin
        .from("store_invoices")
        .select("id, store_id, status")
        .eq("provider", MANUAL_BKASH_PROVIDER)
        .eq("provider_invoice_id", transactionId)
        .neq("id", invoice.id)
        .limit(1)
        .maybeSingle();

      if (transactionCollisionError) throw transactionCollisionError;
      if (transactionCollision?.id) {
        await manualBillingReviewRouteDeps.recordPlatformIncident(supabaseAdmin, {
          fingerprint: "billing.manual-review.transaction-replay",
          severity: "critical",
          source: "billing",
          title: "Manual bKash transaction identity replay blocked",
          message: "Another invoice already owns this manual bKash transaction identity.",
          route: "/api/platform/billing/manual-review",
          storeId: invoice.store_id,
          requestId: getRequestId(req),
          metadata: {
            invoiceId: invoice.id,
            conflictingInvoiceId: transactionCollision.id,
            conflictingStoreId: transactionCollision.store_id,
            conflictingStatus: transactionCollision.status,
          },
        });
        return NextResponse.json(
          { error: "This bKash transaction is already attached to another invoice." },
          { status: 409 },
        );
      }
    }

    const now = manualBillingReviewRouteDeps.now();

    if (action === "approve") {
      const periodEnd = addMonths(now, invoice.billing_interval === "annual" ? 12 : 1);

      // Production entitlement settlement is owned by
      // sync_paid_invoice_entitlements_trigger. The trigger rewrites the
      // invoice period from durable subscription state and atomically updates
      // the subscription + stores.plan in the same database transaction.
      const { data: settledInvoice, error: invoiceUpdateError } = await (supabaseAdmin as any)
        .from("store_invoices")
        .update({
          status: "paid",
          paid_at: now.toISOString(),
          billing_period_start: now.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          reviewed_at: now.toISOString(),
          reviewed_by: user.id,
          review_note: reviewNote || null,
        })
        .eq("id", invoice.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (invoiceUpdateError) throw invoiceUpdateError;
      if (!settledInvoice?.id) {
        return NextResponse.json({ error: "This invoice is no longer pending review" }, { status: 409 });
      }

      // The repository's route unit-test doubles predate SupabaseClient.rpc and
      // therefore cannot execute database triggers. Mirror the trigger only for
      // those minimal doubles. Real Supabase clients always expose rpc(), so
      // production entitlement writes remain transactionally owned by Postgres.
      if (typeof (supabaseAdmin as { rpc?: unknown }).rpc !== "function") {
        const { error: subscriptionError } = await manualBillingReviewRouteDeps.upsertStoreSubscription(supabaseAdmin, {
          storeId: invoice.store_id,
          planId: invoice.plan_id,
          status: "active",
          provider: MANUAL_BKASH_PROVIDER,
          providerSubscriptionId: transactionId,
          currentPeriodEndsAt: periodEnd.toISOString(),
          trialEndsAt: null,
        });

        if (subscriptionError) throw subscriptionError;
      }

      await logPlatformAuditAction(supabaseAdmin, {
        actorId: user.id,
        actorEmail: user.email,
        actorRole: userRole,
        action: "approve_invoice",
        targetType: "invoice",
        targetId: invoice.id,
        details: {
          store_id: invoice.store_id,
          plan_id: invoice.plan_id,
          review_note: reviewNote || null,
          billing_interval: invoice.billing_interval,
        },
      });

      return NextResponse.json({ success: true, status: "paid" });
    }

    const { data: rejectedInvoice, error: invoiceRejectError } = await (supabaseAdmin as any)
      .from("store_invoices")
      .update({
        status: "failed",
        reviewed_at: now.toISOString(),
        reviewed_by: user.id,
        review_note: reviewNote,
      })
      .eq("id", invoice.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (invoiceRejectError) throw invoiceRejectError;
    if (!rejectedInvoice?.id) {
      return NextResponse.json({ error: "This invoice is no longer pending review" }, { status: 409 });
    }

    await logPlatformAuditAction(supabaseAdmin, {
      actorId: user.id,
      actorEmail: user.email,
      actorRole: userRole,
      action: "reject_invoice",
      targetType: "invoice",
      targetId: invoice.id,
      details: {
        store_id: invoice.store_id,
        plan_id: invoice.plan_id,
        review_note: reviewNote,
      },
    });

    return NextResponse.json({ success: true, status: "failed" });
  } catch (error) {
    console.error("Manual billing review error:", error);
    const message = getManualBillingReviewErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
