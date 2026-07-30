import Link from "next/link";
import { ShoppingBag, Store, ArrowLeft, Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface StoreNotFoundViewProps {
  storeSlug?: string | null;
  hostname?: string | null;
  reason?: "not_found" | "unpublished" | "suspended" | "error";
  title?: string;
  description?: string;
}

export function StoreNotFoundView({
  storeSlug,
  hostname,
  reason = "not_found",
  title,
  description,
}: StoreNotFoundViewProps) {
  const displayTarget = storeSlug || hostname || "This store";

  const defaultTitle =
    reason === "unpublished"
      ? "Store Currently Under Maintenance"
      : reason === "suspended"
      ? "Store Temporarily Unavailable"
      : "Store Not Found";

  const defaultDescription =
    reason === "unpublished"
      ? `${displayTarget} is currently taking a short break or updating its catalog. Please check back soon!`
      : reason === "suspended"
      ? `${displayTarget} is temporarily unavailable. If you are the store owner, please sign in to your admin panel.`
      : `${displayTarget} could not be located. The link may be misspelled, renamed, or no longer active on EZComo.`;

  return (
    <main className="relative flex min-h-[85vh] w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Background Glow Overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
        <div className="h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-primary/30 via-indigo-500/20 to-purple-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-6 rounded-2xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 md:p-10">
        {/* Status Badge & Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-8 ring-primary/5 transition-transform duration-500 hover:scale-105">
            <Store className="h-8 w-8 text-primary" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{reason === "unpublished" ? "Maintenance Mode" : "Store Unavailable"}</span>
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title || defaultTitle}
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {description || defaultDescription}
          </p>
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-border/50 bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span>Looking for something specific?</span>
          </div>
          <p>
            If you entered a custom domain or subdomain, double-check the web address. Merchant storefronts update in real-time when published.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Button asChild variant="default" size="lg" className="gap-2 font-medium">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Return to EZComo
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="gap-2 font-medium">
            <Link href="/signup">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Create Your Store
            </Link>
          </Button>
        </div>

        {/* Footer brand branding */}
        <div className="pt-2 text-center text-[11px] text-muted-foreground/70">
          Powered by <span className="font-semibold text-foreground">EZComo Commerce Engine</span>
        </div>
      </div>
    </main>
  );
}
