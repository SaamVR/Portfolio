import Link from "next/link";
import type { ReactNode } from "react";
import {
  PUBLIC_POLICY_EFFECTIVE_DATE,
  PUBLIC_POLICY_REVIEW_NOTICE,
  PUBLIC_POLICY_REVIEW_STATUS,
  PUBLIC_POLICY_VERSION,
} from "@/lib/platform/public-policy";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

type PolicySection = {
  title: string;
  body: ReactNode;
};

export function PublicPolicyPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: PolicySection[];
}) {
  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-primary">← {PLATFORM_BRAND_NAME}</Link>
          <Link href="/support" className="text-sm font-semibold text-primary">Platform support</Link>
        </div>

        <header className="mt-10 border-b border-border pb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
          <div className="mt-5 text-base leading-8 text-muted-foreground md:text-lg">{intro}</div>
          <dl className="mt-7 grid gap-3 rounded-2xl border border-border bg-card p-5 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Version</dt><dd className="mt-1 font-semibold">{PUBLIC_POLICY_VERSION}</dd></div>
            <div><dt className="text-muted-foreground">Effective / review date</dt><dd className="mt-1 font-semibold">{PUBLIC_POLICY_EFFECTIVE_DATE}</dd></div>
            <div><dt className="text-muted-foreground">Review status</dt><dd className="mt-1 font-semibold text-amber-700 dark:text-amber-300">{PUBLIC_POLICY_REVIEW_STATUS}</dd></div>
          </dl>
          <p className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm leading-6 text-amber-900 dark:text-amber-100">
            {PUBLIC_POLICY_REVIEW_NOTICE}
          </p>
        </header>

        <div className="divide-y divide-border">
          {sections.map((section) => (
            <section key={section.title} className="py-9">
              <h2 className="font-heading text-2xl font-semibold">{section.title}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-muted-foreground">{section.body}</div>
            </section>
          ))}
        </div>

        <footer className="border-t border-border pt-8 text-sm leading-6 text-muted-foreground">
          <p>Questions about these disclosures can be submitted through <Link href="/support" className="font-semibold text-primary">platform support</Link>.</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/billing-policy" className="hover:text-foreground">Billing policy</Link>
            <Link href="/support" className="hover:text-foreground">Support</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
