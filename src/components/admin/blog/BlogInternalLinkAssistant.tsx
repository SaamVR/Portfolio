"use client";

import { useMemo } from "react";
import { BookOpen, Link2, Package, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildBlogInternalLinkSuggestions,
  type BlogLinkProduct,
  type BlogLinkSuggestion,
} from "@/lib/cms/blog-link-suggestions";
import type { BlogPostRecord } from "@/lib/cms/blog";

const kindIcon = {
  article: BookOpen,
  product: Package,
  store: Store,
} as const;

export default function BlogInternalLinkAssistant({
  storeSlug,
  currentPostId,
  title,
  category,
  tags,
  content,
  embeddedProductIds,
  posts,
  products,
  onInsert,
}: {
  storeSlug: string;
  currentPostId?: string;
  title: string;
  category: string;
  tags: string;
  content: string;
  embeddedProductIds: string[];
  posts: BlogPostRecord[];
  products: BlogLinkProduct[];
  onInsert: (suggestion: BlogLinkSuggestion) => void;
}) {
  const suggestions = useMemo(() => buildBlogInternalLinkSuggestions({
    storeSlug,
    currentPostId,
    title,
    category,
    tags,
    content,
    embeddedProductIds,
    posts,
    products,
    limit: 8,
  }), [storeSlug, currentPostId, title, category, tags, content, embeddedProductIds, posts, products]);

  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <CardTitle>Internal link assistant</CardTitle>
        </div>
        <CardDescription>
          Add useful links to related published articles and real products from this store. Suggestions are ranked from the current article topic, category, tags, and selected products.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const Icon = kindIcon[suggestion.kind];
          return (
            <div key={suggestion.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{suggestion.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground/80">{suggestion.url}</p>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => onInsert(suggestion)} className="shrink-0">
                <Link2 className="mr-2 h-3.5 w-3.5" /> Insert link
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
