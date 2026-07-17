import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
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
  const sectionLabels = blueprint.recommendedBlockSet
    .slice(0, 5)
    .map((value) => value.replace(/-/g, " "));

  if (!homepage) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link href="/templates" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to templates
            </Link>
            <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">{blueprint.name} preview</h1>
            <p className="mt-1 text-sm text-muted-foreground">{blueprint.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sectionLabels.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {item}
                </span>
              ))}
            </div>
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
