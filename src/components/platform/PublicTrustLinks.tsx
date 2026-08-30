import Link from "next/link";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

export function PublicTrustLinks({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`border-t border-border/70 bg-background px-5 text-sm text-muted-foreground lg:px-8 ${compact ? "py-7" : "py-9"}`} aria-label="Legal and support">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p>{PLATFORM_BRAND_NAME} public policies and platform support</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Public policy links">
          <Link href="/terms" className="font-medium hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="font-medium hover:text-foreground">Privacy</Link>
          <Link href="/billing-policy" className="font-medium hover:text-foreground">Billing policy</Link>
          <Link href="/support" className="font-medium hover:text-foreground">Platform support</Link>
        </nav>
      </div>
    </section>
  );
}
