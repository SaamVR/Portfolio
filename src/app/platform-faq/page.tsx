import Link from "next/link";

const faqs = [
  ["What can I build with EZComo?", "EZComo provides merchant storefront, content, catalog, order, customer-facing, and administration workflows. The exact feature set available to a store can depend on plan entitlement and business configuration."],
  ["Does EZComo guarantee a specific storefront response time?", "No fixed public latency guarantee is currently published. Performance is monitored and improved through the deployment and application stack, but real response time varies by route, region, cache state, data, and external dependencies."],
  ["Which payment providers are supported?", "Payment connections are capability- and configuration-dependent. Public marketing does not treat a provider as connected until the product's authoritative connection state is verified."],
  ["Which courier providers are supported?", "Courier availability depends on the provider implementation, merchant configuration, credentials, and the capabilities exposed by that integration. Individual actions are only offered where supported."],
  ["Can I use a custom domain?", "Custom-domain access is plan/feature gated. Eligible merchants still need the hostname, DNS, and verification workflow to complete before the domain becomes active."],
  ["Does EZComo charge a transaction percentage?", "Current EZComo subscription prices are shown on the Plans page. This FAQ does not publish a blanket transaction-fee claim; external payment, courier, messaging, domain, or other provider charges can apply separately."],
  ["How long is a paid-plan trial?", "Trial duration is plan-specific. The Plans page renders the value from the live public plan catalog, so a plan with no configured trial does not inherit a generic marketing promise."],
  ["Are payment or courier connections automatic?", "No. EZComo can provide configuration and operational workflows, but external services can require credentials, verification, provider approval, account state, or additional setup."],
  ["Are the example store stories real customer testimonials?", "No. The current Stories page contains illustrative store scenarios only. They are explicitly not presented as customer identities, reviews, ratings, or measured merchant outcomes."],
] as const;

export default function PlatformFaqPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Platform FAQ</p>
        <h1 className="mt-4 max-w-4xl font-heading text-4xl font-semibold tracking-tight md:text-6xl">Product answers without implied provider or performance guarantees.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">Commercial details that can change—such as plan price and trial duration—are delegated to the live plan catalog rather than duplicated here.</p>

        <section className="mt-12 divide-y divide-border rounded-[1.8rem] border border-border bg-card px-6 md:px-9">
          {faqs.map(([question, answer]) => (
            <article key={question} className="py-7">
              <h2 className="font-heading text-xl font-semibold">{question}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{answer}</p>
            </article>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/plans" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">View live pricing</Link>
          <Link href="/how-it-works" className="rounded-full border border-border px-6 py-3 font-semibold">How it works</Link>
          <Link href="/" className="rounded-full border border-border px-6 py-3 font-semibold">Back home</Link>
        </div>
      </div>
    </main>
  );
}
