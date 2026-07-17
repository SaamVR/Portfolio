import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { buildBlueprintPreviewStore } from "@/lib/cms/storefront-preview";
import { fallbackStoreBlueprints } from "@/lib/cms/store-blueprints";

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ blueprintId: string }>;
}) {
  const { blueprintId } = await params;
  const blueprint = fallbackStoreBlueprints.find((item) => item.id === blueprintId);

  if (!blueprint) {
    notFound();
  }

  const previewStore = buildBlueprintPreviewStore(blueprint);
  const homepage = previewStore.pages.find((page) => page.isHomepage) ?? previewStore.pages[0];

  if (!homepage) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <Link href="/templates" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to templates
            </Link>
            <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">{blueprint.name} preview</h1>
            <p className="mt-1 text-sm text-muted-foreground">{blueprint.description}</p>
          </div>
          <Link href={`/signup?blueprint=${encodeURIComponent(blueprint.id)}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Use this template
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <StorefrontPage store={previewStore} page={homepage} />
    </main>
  );
}
