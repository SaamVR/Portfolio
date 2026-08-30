import Link from "next/link";
import { CmsPricing } from "@/components/marketing/CmsPricing";
import { PublicTrustLinks } from "@/components/platform/PublicTrustLinks";
import { loadPublicPlanCatalog } from "@/lib/billing/plans";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

export const revalidate = 300;

const faqs = [
  ["Are the prices on this page current?", "The first server-rendered plan catalog is loaded from the same public cms_plans catalog used by the product. If the catalog cannot be read, EZComo falls back to the documented Free fallback instead of inventing paid prices."],
  ["Which payment providers are connected?", "A provider is only shown as connected after its configuration reaches the product's verified state. Availability and onboarding can depend on provider configuration, credentials, verification, and external-provider requirements."],
  ["Which courier providers are connected?", "Courier workflows are capability- and configuration-dependent. EZComo distinguishes not configured, configured, verified, and attention-needed states instead of treating a provider name as proof of a working connection."],
  ["Do plans include a custom domain?", "Custom-domain tools are entitlement-gated. An eligible plan does not by itself make a hostname live: DNS and domain verification still have to complete."],
  ["How long is the trial?", "Any trial duration shown on a plan card is read from the live plan catalog for that specific plan. Plans with no configured trial do not receive a generic trial promise."],
  ["Are external service charges included?", "The plan cards describe EZComo billing. Payment, courier, messaging, domain, or other external-provider charges and terms are separate when they apply."],
] as const;

export default async function PlansPage() {
  const planCatalog = await loadPublicPlanCatalog();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 px-5 py-14 text-center lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{PLATFORM_BRAND_NAME} plans</p>
        <h1 className="mx-auto mt-4 max-w-4xl font-heading text-4xl font-semibold tracking-tight md:text-6xl">Pricing sourced from the live public plan catalog.</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">Plan names, amounts, trial duration, store limits, and contact-only state begin on the server from authoritative billing data.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Back to overview</Link>
          <Link href="/billing-policy" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Billing policy</Link>
          <Link href="/support" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Platform support</Link>
          <Link href="/signup" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Create a store</Link>
        </div>
      </section>

      <CmsPricing planCatalog={planCatalog} />

      <section id="faq" className="border-t border-border/70 px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-5xl">Pricing & integration FAQ</h2>
          <div className="mt-9 divide-y divide-border rounded-[1.7rem] border border-border bg-card px-6 md:px-8">
            {faqs.map(([question, answer]) => (
              <article key={question} className="py-6">
                <h3 className="font-heading text-lg font-semibold">{question}</h3>
                <p className="mt-2 leading-7 text-muted-foreground">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <PublicTrustLinks compact />
    </main>
  );
}
