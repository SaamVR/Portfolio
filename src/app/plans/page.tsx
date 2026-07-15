import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CmsPricing } from "@/components/marketing/CmsPricing";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              {PLATFORM_BRAND_NAME}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </header>
      <CmsPricing />
    </main>
  );
}
