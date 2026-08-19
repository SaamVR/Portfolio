"use client";

import { BookOpenCheck, GitCompareArrows, PackagePlus, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { blogArticleTemplates, type BlogArticleTemplate, type BlogArticleTemplateId } from "@/lib/cms/blog-templates";

const templateIcons = {
  "buying-guide": BookOpenCheck,
  comparison: GitCompareArrows,
  "how-to-care": Wrench,
  "product-launch": PackagePlus,
  "collection-story": Sparkles,
} satisfies Record<BlogArticleTemplateId, typeof BookOpenCheck>;

export default function BlogArticleTemplateChooser({
  onApply,
  disabled = false,
}: {
  onApply: (template: BlogArticleTemplate) => void;
  disabled?: boolean;
}) {
  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Start from an ecommerce article template</CardTitle>
        </div>
        <CardDescription>
          Prefill a proven article structure, category, starter tags, product-section heading, and SEO prompts. The template is only a starting draft; after it is applied, the article remains ordinary editable Blog content.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {blogArticleTemplates.map((template) => {
          const Icon = templateIcons[template.id];
          return (
            <div key={template.id} className="flex flex-col rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{template.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{template.description}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-1">{template.category}</span>
                {template.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-1">{tag}</span>)}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <Button type="button" size="sm" variant="outline" onClick={() => onApply(template)} disabled={disabled}>
                  Use {template.title.toLowerCase()}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
