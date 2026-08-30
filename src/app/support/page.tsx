import Link from "next/link";
import { PlatformSupportForm } from "@/components/platform/PlatformSupportForm";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

export const metadata = {
  title: "Platform Support — EZComo",
  description: "Contact EZComo platform support for sales, billing, account, privacy, abuse, or security questions.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-primary">← {PLATFORM_BRAND_NAME}</Link>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/billing-policy" className="hover:text-foreground">Billing policy</Link>
          </div>
        </div>

        <header className="mt-12 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Platform support</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight md:text-6xl">Ask EZComo about the platform.</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">This channel is for prospective and active merchants with pre-sales, billing/subscription, account/access, privacy/data, abuse/security, or other platform questions. It does not replace a merchant storefront&apos;s customer contact form.</p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <aside className="space-y-4 rounded-[1.7rem] border border-border bg-muted/20 p-6 text-sm leading-6 text-muted-foreground">
            <h2 className="font-heading text-xl font-semibold text-foreground">What happens after submission</h2>
            <p>The request is recorded in EZComo&apos;s platform operational inbox and receives a reference ID. Platform administrators can review and resolve it separately from merchant storefront messages.</p>
            <p>No response-time, refund, billing-dispute, security-remediation, or other outcome guarantee is published by this review version.</p>
            <p>If your question is about an order placed with a merchant, use that merchant&apos;s storefront contact channel instead.</p>
          </aside>
          <PlatformSupportForm />
        </div>
      </div>
    </main>
  );
}
