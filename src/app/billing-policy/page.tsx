import Link from "next/link";
import { PublicPolicyPage } from "@/components/platform/PublicPolicyPage";
import { loadPublicPlanCatalog } from "@/lib/billing/plans";
import { getPublicPolicyRuntime } from "@/lib/platform/public-policy-runtime";
import { buildBindingBillingSections } from "@/lib/platform/paid-beta-policy-copy";

export const revalidate = 300;

function money(value: number | null | undefined, currency: string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Free";
  return `${currency || "BDT"} ${amount.toLocaleString("en-US")}`;
}

export async function generateMetadata() {
  const policy = await getPublicPolicyRuntime();
  return {
    title: `Billing, Renewal, Cancellation & Refund Policy — ${policy.siteName}${policy.binding ? "" : " review version"}`,
    description: `${policy.binding ? "Billing, renewal, cancellation and refund policy" : "Published review-version billing disclosure"} for ${policy.siteName}.`,
  };
}

export default async function BillingPolicyPage() {
  const [plans, policy] = await Promise.all([loadPublicPlanCatalog(), getPublicPolicyRuntime()]);
  const policyMeta = { version: policy.version, effectiveDate: policy.effectiveDate, status: policy.status, notice: policy.notice };

  if (policy.binding && policy.legalOperatorName) {
    return (
      <PublicPolicyPage
        eyebrow="Billing disclosure"
        title="Billing, Renewal, Cancellation & Refund Policy"
        siteName={policy.siteName}
        policyMeta={policyMeta}
        intro={<p>This Policy applies to subscriptions for {policy.siteName}, operated by <strong>{policy.legalOperatorName}</strong>, and forms part of the {policy.siteName} Terms of Service.</p>}
        sections={buildBindingBillingSections({ siteName: policy.siteName, legalOperatorName: policy.legalOperatorName })}
      />
    );
  }

  return (
    <PublicPolicyPage
      eyebrow="Billing disclosure"
      title="Billing, trial, cancellation & refund policy — review version"
      siteName={policy.siteName}
      policyMeta={policyMeta}
      intro={<p>This review page connects public billing disclosures to the same live plan catalog used by the product. Final refund, proration, renewal, and cancellation rules still require explicit owner approval before paid beta.</p>}
      sections={[
        { title: "Current public plan catalog", body: <div className="grid gap-3 sm:grid-cols-2">{plans.map((plan) => { const trialDays = Math.max(0, Number(plan.trial_days ?? 0) || 0); const storeLimit = Math.max(0, Number(plan.store_limit ?? 0) || 0); return <article key={plan.id} className="rounded-2xl border border-border bg-card p-5 text-foreground"><h3 className="font-heading text-lg font-semibold">{plan.name}</h3><p className="mt-2 text-sm text-muted-foreground">{plan.description || "Plan details are maintained in the public billing catalog."}</p><dl className="mt-4 space-y-1 text-sm"><div className="flex justify-between gap-3"><dt>Monthly catalog amount</dt><dd className="font-semibold">{money(plan.monthly_price, plan.currency_code)}</dd></div><div className="flex justify-between gap-3"><dt>Trial configured</dt><dd className="font-semibold">{trialDays > 0 ? `${trialDays} days` : "None"}</dd></div><div className="flex justify-between gap-3"><dt>Store limit</dt><dd className="font-semibold">{storeLimit || "Catalog-defined"}</dd></div></dl></article>; })}</div> },
        { title: "Free and paid access", body: <><p>Free plans have a zero catalog amount. Paid plan amounts, trials, store limits, and active/contact-only state are read from the authoritative public plan catalog when displayed. Feature access is additionally enforced by subscription and entitlement state.</p><p>Selecting a paid plan does not by itself mean that an external payment, courier, domain, messaging, or other provider is connected or included.</p></> },
        { title: "Trials", body: <p>If a plan has a trial duration configured in the live catalog, that duration is shown for that plan. Plans without a configured trial do not receive a generic trial promise. Trial/subscription access remains subject to the product&apos;s subscription status and entitlement checks.</p> },
        { title: "External-provider charges", body: <p>{policy.siteName} plan pricing is separate from charges, fees, taxes, account requirements, or terms imposed by payment, courier, messaging, domain, authentication, media, or other external providers. Those costs are not represented as included unless the product and commercial policy explicitly say so.</p> },
        { title: "Cancellation, downgrade, refund, proration, and renewal", body: <><p>Final commercial rules for cancellation timing, downgrade effects, refunds, prorating, renewal behavior, and billing-dispute outcomes are owner-review pending. This review version makes no promise that a charge is refundable, prorated, automatically renewed, immediately cancelled, or eligible for a particular dispute result.</p><p>These rules must be explicitly approved and published before the paid-beta release gate is cleared. Until then, prospective merchants can raise billing questions through <Link href="/support" className="font-semibold text-primary">platform support</Link>.</p></> },
        { title: "Billing questions and disputes", body: <p>Use <Link href="/support" className="font-semibold text-primary">platform support</Link> and choose the billing/subscription topic. The support route records the request for platform-admin follow-up and returns a reference ID. This review version does not publish a response-time or resolution guarantee.</p> },
      ]}
    />
  );
}
