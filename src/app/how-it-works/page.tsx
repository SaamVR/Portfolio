import Link from "next/link";
import { BadgeCheck, CreditCard, Globe2, LayoutTemplate, PackageSearch, Settings2, Truck } from "lucide-react";

const steps = [
  { icon: LayoutTemplate, title: "1. Create the store", body: "Choose a storefront structure, create the merchant store, and continue into the dashboard. Store creation is subject to the active/selectable plan catalog." },
  { icon: PackageSearch, title: "2. Add the selling details", body: "Set up products or business content, navigation, storefront sections, checkout-facing information, and the settings needed for your business model." },
  { icon: Settings2, title: "3. Configure operations", body: "Configure payment, courier, notification, domain, and other operational settings that are available to the store. External connections keep an explicit readiness state." },
] as const;

const operationalTruth = [
  { icon: CreditCard, title: "Payment connections", body: "EZComo distinguishes not configured, configured, verified, and needs-attention states. A provider is not called connected just because credentials or display settings exist." },
  { icon: Truck, title: "Courier workflows", body: "Booking, status, label, notification, or other courier behavior is used only where the enabled provider and its implemented capabilities support that action." },
  { icon: Globe2, title: "Custom domains", body: "Domain tooling is plan/feature gated and still requires hostname, DNS, and verification steps before a custom hostname can serve the storefront." },
  { icon: BadgeCheck, title: "Background operations", body: "Notification and background-job processing are handled by product workflows; their delivery still depends on the configured channel or external service." },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Product workflow</p>
        <h1 className="mt-4 max-w-4xl font-heading text-4xl font-semibold tracking-tight md:text-6xl">A clear path from store creation to configured operations.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">The workflow below describes what EZComo controls directly and where an external provider, merchant configuration, entitlement, DNS, or verification step still matters.</p>

        <section className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-[1.8rem] border border-border bg-card p-7">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-5 font-heading text-xl font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 border-t border-border pt-14">
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-5xl">How external capabilities are represented</h2>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {operationalTruth.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-[1.7rem] border border-border bg-muted/25 p-6">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-heading text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link href="/plans" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">View current plans</Link>
          <Link href="/platform-faq" className="rounded-full border border-border px-6 py-3 font-semibold">Read platform FAQ</Link>
          <Link href="/signup" className="rounded-full border border-border px-6 py-3 font-semibold">Create a store</Link>
        </div>
      </div>
    </main>
  );
}
