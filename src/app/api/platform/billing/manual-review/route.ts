import { NextResponse } from "next/server";
import { addMonths, getAuthenticatedUser, getSupabaseAdminClient, upsertStoreSubscription } from "@/lib/api/supabase-route";
import { logPlatformAuditAction } from "@/lib/platform/audit-logger";

export const manualBillingReviewRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  upsertStoreSubscription,
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
    ? await (roleQuery as any).in("role", ["admin", "co_admin"]).order("created_at", { ascending: true })
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

    const isManualInvoice = invoice.payment_method === "bkash_manual" || invoice.provider === "bkash_manual";
    if (!isManualInvoice) {
      return NextResponse.json({ error: "Only manual bKash invoices can be reviewed here" }, { status: 400 });
    }
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: "This invoice is no longer pending review" }, { status: 409 });
    }

    const now = manualBillingReviewRouteDeps.now();

    if (action === "approve") {
      const periodEnd = addMonths(now, invoice.billing_interval === "annual" ? 12 : 1);

      const { error: invoiceUpdateError } = await (supabaseAdmin as any)
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
        .eq("id", invoice.id);

      if (invoiceUpdateError) throw invoiceUpdateError;

      const { error: subscriptionError } = await manualBillingReviewRouteDeps.upsertStoreSubscription(supabaseAdmin, {
        storeId: invoice.store_id,
        planId: invoice.plan_id,
        status: "active",
        provider: "bkash_manual",
        providerSubscriptionId: invoice.provider_invoice_id,
        currentPeriodEndsAt: periodEnd.toISOString(),
        trialEndsAt: null,
      });

      if (subscriptionError) throw subscriptionError;

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

    const { error: invoiceRejectError } = await (supabaseAdmin as any)
      .from("store_invoices")
      .update({
        status: "failed",
        reviewed_at: now.toISOString(),
        reviewed_by: user.id,
        review_note: reviewNote,
      })
      .eq("id", invoice.id);

    if (invoiceRejectError) throw invoiceRejectError;

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
