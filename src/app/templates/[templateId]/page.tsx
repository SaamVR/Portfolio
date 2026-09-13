import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";
import { buildTemplatePreviewStore } from "@/lib/cms/storefront-preview";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
  isStorefrontTemplateId,
} from "@/lib/cms/storefront-templates";

function formatBlockLabel(value: string) {
  return value.replace(/-/g, " ");
}

function formatOnboardingMode(mode: "template" | "blank") {
  return mode === "blank" ? "Blank builder" : "Guided template";
}

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  if (!isStorefrontTemplateId(templateId)) {
    notFound();
  }

  const template = getStorefrontTemplateDefinition(templateId);
  const explicitPreviewMode = process.env.STOREFRONT_TEMPLATE_PREVIEW_MODE === "1";
  if (template.adminOnly && process.env.NODE_ENV !== "development" && !explicitPreviewMode) {
    notFound();
  }
  const seed = getStorefrontTemplateSeedDefinition(templateId);
  const previewStore = buildTemplatePreviewStore(templateId);
  const homepage = previewStore.pages.find((page) => page.isHomepage) ?? previewStore.pages[0];
  const sectionLabels = seed.defaultBlockSet
    .slice(0, 5)
    .map(formatBlockLabel);
  const recommendedNextLabels = seed.recommendedBlockSet
    .filter((block) => !seed.defaultBlockSet.includes(block))
    .slice(0, 5)
    .map(formatBlockLabel);

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
            <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">{template.label} preview</h1>
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatOnboardingMode(seed.onboardingMode)}
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                {seed.businessFamily}
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                {seed.defaultBlockSet.length} starter sections
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                {seed.compatibleBlockSet.length} compatible blocks
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              {seed.onboardingMode === "blank"
                ? "This preview shows the blank-builder starter shell. During onboarding, merchants can choose additional compatible sections and swap section styles before launch."
                : "This preview shows the guided launch structure. Merchants can keep the starter sections, enable optional homepage sections, and still edit everything later from onboarding and settings."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sectionLabels.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {item}
                </span>
              ))}
              {recommendedNextLabels.map((item) => (
                <span key={`recommended-${item}`} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium capitalize text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <Link href={`/signup?template=${encodeURIComponent(templateId)}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {seed.onboardingMode === "blank" ? "Start from blank" : "Use this template"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <StorefrontPage store={previewStore} page={homepage} />
    </main>
  );
}
