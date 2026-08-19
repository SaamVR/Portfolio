"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bold,
  BookOpen,
  Clock3,
  Eye,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import BlogArticleTemplateChooser from "@/components/admin/blog/BlogArticleTemplateChooser";
import BlogInternalLinkAssistant from "@/components/admin/blog/BlogInternalLinkAssistant";
import BlogQualityPanel from "@/components/admin/blog/BlogQualityPanel";
import BlogStructuredArticleEditor from "@/components/admin/blog/BlogStructuredArticleEditor";
import {
  buildBlogExcerpt,
  buildBlogIndexUrl,
  buildBlogPostUrl,
  calculateBlogReadingTime,
  formatBlogDate,
  markdownToHtml,
  normalizeBlogSlug,
  normalizeBlogStringList,
  resolveBlogPostStatus,
  resolveBlogProductEmbedPosition,
  type BlogPostRecord,
  type BlogProductEmbedPosition,
} from "@/lib/cms/blog";
import { buildBlogQualityReport } from "@/lib/cms/blog-quality";
import {
  defaultBlogSettings,
  normalizeBlogSettings,
  type BlogHomepageWidgetLayout,
  type BlogIndexLayout,
  type BlogSettings,
} from "@/lib/cms/blog-settings";
import type { BlogArticleTemplate } from "@/lib/cms/blog-templates";
import { cn } from "@/lib/utils";

type EditablePost = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  featured_image_alt: string;
  category: string;
  tags: string;
  author_name: string;
  is_featured: boolean;
  embedded_product_ids: string[];
  product_embed_title: string;
  product_embed_position: BlogProductEmbedPosition;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  canonical_url: string;
  og_image: string;
  noindex: boolean;
  status: "draft" | "published";
  published_at: string;
};

type MerchantProduct = {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  is_available: boolean | null;
};

const emptyPost: EditablePost = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image: "",
  featured_image_alt: "",
  category: "",
  tags: "",
  author_name: "",
  is_featured: false,
  embedded_product_ids: [],
  product_embed_title: "Shop products from this story",
  product_embed_position: "after-content",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  canonical_url: "",
  og_image: "",
  noindex: false,
  status: "draft",
  published_at: "",
};

const widgetLayouts: Array<{ id: BlogHomepageWidgetLayout; title: string; description: string }> = [
  { id: "featured-grid", title: "Featured + list", description: "One lead article with supporting stories beside it." },
  { id: "cards", title: "Card grid", description: "Equal visual cards for a clean editorial section." },
  { id: "carousel", title: "Swipe carousel", description: "Mobile-first horizontal story rail." },
  { id: "compact", title: "Compact list", description: "Text-forward layout for practical guides and updates." },
];

const indexLayouts: Array<{ id: BlogIndexLayout; title: string; description: string }> = [
  { id: "magazine", title: "Magazine", description: "Lead story plus supporting cards." },
  { id: "grid", title: "Grid", description: "Consistent article cards for browsing." },
  { id: "compact", title: "Compact", description: "Dense list for larger article libraries." },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function isMissingBlogUpgradeSchemaError(error: unknown) {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const code = typeof record.code === "string" ? record.code : "";
  const text = [record.message, record.details, record.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return code === "PGRST204"
    || text.includes("schema cache")
    || (text.includes("column") && [
      "featured_image_alt",
      "category",
      "tags",
      "author_name",
      "is_featured",
      "embedded_product_ids",
      "product_embed_title",
      "product_embed_position",
      "seo_keywords",
      "canonical_url",
      "og_image",
      "noindex",
    ].some((column) => text.includes(column)));
}

function SettingSwitch({ checked, onCheckedChange, title, description }: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function BlogManager() {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [editingPost, setEditingPost] = useState<EditablePost>(emptyPost);
  const [contentEditorMode, setContentEditorMode] = useState<"structured" | "markdown">("structured");
  const [blogSettings, setBlogSettings] = useState<BlogSettings>(defaultBlogSettings);
  const [savingPost, setSavingPost] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const { data: store } = useQuery({
    queryKey: ["blog-store-meta", activeStoreId],
    enabled: Boolean(activeStoreId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug, custom_domain")
        .eq("id", activeStoreId as string)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; slug: string; custom_domain: string | null } | null;
    },
  });

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ["blog-posts", activeStoreId],
    enabled: Boolean(activeStoreId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("*")
        .eq("store_id", activeStoreId as string)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPostRecord[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["blog-merchant-products", activeStoreId],
    enabled: Boolean(activeStoreId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id,name,price,original_price,image_url,is_available")
        .eq("store_id", activeStoreId as string)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as MerchantProduct[];
    },
    staleTime: 120_000,
  });

  const { data: rawBlogSettings } = useQuery({
    queryKey: ["blog-settings", activeStoreId],
    enabled: Boolean(activeStoreId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("store_id", activeStoreId as string)
        .eq("key", "blog")
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
  });

  useEffect(() => {
    setBlogSettings(normalizeBlogSettings(rawBlogSettings));
  }, [rawBlogSettings]);

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter((post) =>
      [post.title, post.slug, post.excerpt ?? "", post.category ?? "", ...(post.tags ?? [])]
        .some((value) => String(value).toLowerCase().includes(term)));
  }, [posts, search]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => product.name.toLowerCase().includes(term));
  }, [products, productSearch]);

  const publishedCount = posts.filter((post) => resolveBlogPostStatus(post) === "published").length;
  const scheduledCount = posts.filter((post) => resolveBlogPostStatus(post) === "scheduled").length;
  const draftCount = posts.filter((post) => resolveBlogPostStatus(post) === "draft").length;
  const previewHtml = useMemo(() => {
    const source = editingPost.content || "Write useful buying advice, product education, comparisons, or brand stories here.";
    return markdownToHtml(source.replace(/\[\[products\]\]/gi, "\n\n> 🛍️ Selected product cards render here.\n\n"));
  }, [editingPost.content]);
  const readingMinutes = calculateBlogReadingTime(editingPost.content);
  const seoTitlePreview = editingPost.seo_title.trim() || editingPost.title.trim() || "Your article title";
  const seoDescriptionPreview = editingPost.seo_description.trim() || buildBlogExcerpt(editingPost.content, editingPost.excerpt) || "A useful description of this article.";
  const qualityReport = useMemo(() => buildBlogQualityReport({
    title: editingPost.title,
    slug: editingPost.slug,
    excerpt: editingPost.excerpt,
    content: editingPost.content,
    featuredImage: editingPost.featured_image,
    featuredImageAlt: editingPost.featured_image_alt,
    category: editingPost.category,
    tags: editingPost.tags,
    embeddedProductIds: editingPost.embedded_product_ids,
    seoTitle: editingPost.seo_title,
    seoDescription: editingPost.seo_description,
    canonicalUrl: editingPost.canonical_url,
    noindex: editingPost.noindex,
    status: editingPost.status,
  }), [editingPost]);

  const updateSettings = <K extends keyof BlogSettings>(key: K, value: BlogSettings[K]) => {
    setBlogSettings((current) => ({ ...current, [key]: value }));
  };

  const saveBlogSettings = async () => {
    if (!activeStoreId) return;
    setSavingSettings(true);
    try {
      const { error } = await (supabase as any)
        .from("site_settings")
        .upsert(
          {
            store_id: activeStoreId,
            key: "blog",
            value: blogSettings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id,key" },
        );
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["blog-settings", activeStoreId] }),
        queryClient.invalidateQueries({ queryKey: ["site_settings", activeStoreId] }),
      ]);
      toast.success("Blog settings saved.");
    } catch (settingsError) {
      console.error(settingsError);
      toast.error(settingsError instanceof Error ? settingsError.message : "Failed to save blog settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const savePost = async () => {
    if (!activeStoreId) {
      toast.error("Select a store first.");
      return;
    }
    if (!editingPost.title.trim()) {
      toast.error("Add a post title first.");
      return;
    }
    if (!editingPost.content.trim()) {
      toast.error("Add article content before saving.");
      return;
    }

    setSavingPost(true);
    try {
      const slug = normalizeBlogSlug(editingPost.slug, editingPost.title);
      const publishTime = editingPost.status === "published"
        ? (editingPost.published_at || new Date().toISOString())
        : null;
      const excerpt = buildBlogExcerpt(editingPost.content, editingPost.excerpt);
      const payload = {
        store_id: activeStoreId,
        title: editingPost.title.trim(),
        slug,
        excerpt,
        content: editingPost.content.trim(),
        featured_image: editingPost.featured_image.trim() || null,
        featured_image_alt: editingPost.featured_image_alt.trim() || null,
        category: editingPost.category.trim() || null,
        tags: normalizeBlogStringList(editingPost.tags),
        author_name: editingPost.author_name.trim() || null,
        is_featured: editingPost.is_featured,
        embedded_product_ids: editingPost.embedded_product_ids,
        product_embed_title: editingPost.product_embed_title.trim() || null,
        product_embed_position: editingPost.product_embed_position,
        seo_title: editingPost.seo_title.trim() || editingPost.title.trim(),
        seo_description: editingPost.seo_description.trim() || excerpt,
        seo_keywords: normalizeBlogStringList(editingPost.seo_keywords),
        canonical_url: editingPost.canonical_url.trim() || null,
        og_image: editingPost.og_image.trim() || editingPost.featured_image.trim() || null,
        noindex: editingPost.noindex,
        status: editingPost.status,
        published_at: publishTime,
      };
      const legacyPayload = {
        store_id: activeStoreId,
        title: editingPost.title.trim(),
        slug,
        excerpt,
        content: editingPost.content.trim(),
        featured_image: editingPost.featured_image.trim() || null,
        status: editingPost.status,
        seo_title: editingPost.seo_title.trim() || editingPost.title.trim(),
        seo_description: editingPost.seo_description.trim() || excerpt,
        published_at: publishTime,
      };

      const persist = async (values: Record<string, unknown>) => {
        if (editingPost.id) {
          return (supabase as any)
            .from("blog_posts")
            .update(values)
            .eq("id", editingPost.id)
            .eq("store_id", activeStoreId);
        }
        return (supabase as any).from("blog_posts").insert(values);
      };

      let { error: persistError } = await persist(payload);
      let usedLegacyFallback = false;
      if (persistError && isMissingBlogUpgradeSchemaError(persistError)) {
        const fallbackResult = await persist(legacyPayload);
        persistError = fallbackResult.error;
        usedLegacyFallback = !persistError;
      }
      if (persistError) throw persistError;

      if (usedLegacyFallback) {
        toast.warning("Article saved on the current Blog schema. Category, tags, product embeds, author, social image, and advanced SEO fields will persist after the pending Blog database upgrade is applied.");
      } else {
        toast.success(editingPost.id ? "Blog post updated." : "Blog post created.");
      }
      setEditingPost(emptyPost);
      await queryClient.invalidateQueries({ queryKey: ["blog-posts", activeStoreId] });
    } catch (saveError) {
      console.error(saveError);
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save the blog post.");
    } finally {
      setSavingPost(false);
    }
  };

  const deletePost = async () => {
    if (!editingPost.id || !activeStoreId) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this blog post? This cannot be undone.")) return;
    setDeletingPost(true);
    try {
      const { error } = await (supabase as any)
        .from("blog_posts")
        .delete()
        .eq("id", editingPost.id)
        .eq("store_id", activeStoreId);
      if (error) throw error;
      setEditingPost(emptyPost);
      await queryClient.invalidateQueries({ queryKey: ["blog-posts", activeStoreId] });
      toast.success("Blog post deleted.");
    } catch (deleteError) {
      console.error(deleteError);
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to delete the post.");
    } finally {
      setDeletingPost(false);
    }
  };

  const loadPost = (post: BlogPostRecord) => {
    setEditingPost({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content,
      featured_image: post.featured_image ?? "",
      featured_image_alt: post.featured_image_alt ?? "",
      category: post.category ?? "",
      tags: (post.tags ?? []).join(", "),
      author_name: post.author_name ?? "",
      is_featured: post.is_featured ?? false,
      embedded_product_ids: post.embedded_product_ids ?? [],
      product_embed_title: post.product_embed_title ?? "Shop products from this story",
      product_embed_position: resolveBlogProductEmbedPosition(post.product_embed_position),
      seo_title: post.seo_title ?? "",
      seo_description: post.seo_description ?? "",
      seo_keywords: (post.seo_keywords ?? []).join(", "),
      canonical_url: post.canonical_url ?? "",
      og_image: post.og_image ?? "",
      noindex: post.noindex ?? false,
      status: resolveBlogPostStatus(post) === "draft" ? "draft" : "published",
      published_at: post.published_at ? post.published_at.slice(0, 16) : "",
    });
    setActiveTab("posts");
  };

  const applyArticleTemplate = (template: BlogArticleTemplate) => {
    if (editingPost.id) return;
    const hasUnsavedDraft = Boolean(
      editingPost.title.trim()
      || editingPost.content.trim()
      || editingPost.excerpt.trim()
      || editingPost.featured_image.trim()
      || editingPost.category.trim()
      || editingPost.tags.trim()
      || editingPost.seo_title.trim()
      || editingPost.seo_description.trim()
      || editingPost.embedded_product_ids.length > 0,
    );
    if (hasUnsavedDraft && typeof window !== "undefined" && !window.confirm("Replace the current unsaved article draft with this template?")) return;

    setEditingPost({
      ...emptyPost,
      category: template.category,
      tags: template.tags.join(", "),
      content: template.content,
      product_embed_title: template.productEmbedTitle,
    });
    setProductSearch("");
    toast.success(`${template.title} template applied. Replace the prompts with your store's real content, products, and SEO copy.`);
  };

  const insertMarkdown = (prefix: string, suffix = "", placeholder = "text") => {
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? editingPost.content.length;
    const end = textarea?.selectionEnd ?? editingPost.content.length;
    const selected = editingPost.content.slice(start, end) || placeholder;
    const next = `${editingPost.content.slice(0, start)}${prefix}${selected}${suffix}${editingPost.content.slice(end)}`;
    setEditingPost((current) => ({ ...current, content: next }));
    requestAnimationFrame(() => {
      textarea?.focus();
      const caret = start + prefix.length + selected.length + suffix.length;
      textarea?.setSelectionRange(caret, caret);
    });
  };

  const insertProductSectionAtCursor = () => {
    if (editingPost.embedded_product_ids.length === 0) {
      toast.error("Select at least one product first.");
      return;
    }
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? editingPost.content.length;
    const end = textarea?.selectionEnd ?? start;
    const directive = "\n\n[[products]]\n\n";
    const next = `${editingPost.content.slice(0, start)}${directive}${editingPost.content.slice(end)}`;
    setEditingPost((current) => ({ ...current, content: next }));
    requestAnimationFrame(() => {
      textarea?.focus();
      const caret = start + directive.length;
      textarea?.setSelectionRange(caret, caret);
    });
    toast.success("Product cards inserted at the article cursor.");
  };

  const toggleProduct = (id: string) => {
    setEditingPost((current) => {
      const selected = current.embedded_product_ids.includes(id);
      if (!selected && current.embedded_product_ids.length >= 8) {
        toast.error("You can embed up to 8 products in one article.");
        return current;
      }
      return {
        ...current,
        embedded_product_ids: selected
          ? current.embedded_product_ids.filter((productId) => productId !== id)
          : [...current.embedded_product_ids, id],
      };
    });
  };

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Blog</CardTitle>
          <CardDescription>Select a store first to open its blog workspace.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading blog workspace...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Blog unavailable</CardTitle>
          <CardDescription>We could not load blog posts for this store right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-3xl font-bold text-foreground">Blog</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Publish SEO articles, buying guides, product education, launch stories, and shoppable content that can bring search traffic back into your catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Storefront blog</p>
            <p className="text-sm font-medium text-foreground">{blogSettings.enabled ? "Enabled" : "Disabled"}</p>
          </div>
          <Switch checked={blogSettings.enabled} onCheckedChange={(value) => updateSettings("enabled", value)} />
          <Button size="sm" onClick={saveBlogSettings} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
          {store && blogSettings.enabled ? (
            <Button size="sm" variant="outline" asChild>
              <a href={buildBlogIndexUrl(store.slug)} target="_blank" rel="noreferrer">
                View blog <ArrowUpRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {!blogSettings.enabled ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex gap-3 p-5">
            <Eye className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-foreground">Blog is hidden from shoppers</p>
              <p className="mt-1 text-sm text-muted-foreground">Your drafts and published articles stay saved, but storefront blog routes and the homepage widget remain unavailable until you enable the feature again.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Published", value: publishedCount, helper: "Live and searchable articles." },
          { label: "Scheduled", value: scheduledCount, helper: "Queued for a future publish time." },
          { label: "Drafts", value: draftCount, helper: "Ideas still being edited." },
          { label: "Homepage", value: blogSettings.homepageWidgetEnabled ? "On" : "Off", helper: "Latest-story widget on the homepage." },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card/50">
            <CardHeader className="space-y-2 p-5">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
              <p className="text-xs text-muted-foreground">{item.helper}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-secondary/40 p-1">
          <TabsTrigger value="posts">Posts & editor</TabsTrigger>
          <TabsTrigger value="homepage">Homepage widget</TabsTrigger>
          <TabsTrigger value="seo">Blog page & SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <Card className="border-border bg-card/50">
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Articles</CardTitle>
                    <CardDescription>Search, edit, schedule, and feature your content.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingPost(emptyPost)}>
                    <Plus className="mr-2 h-4 w-4" /> New
                  </Button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts, categories, tags..." className="pl-9" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredPosts.length === 0 ? (
                  <AdminEmptyState
                    icon={PencilLine}
                    title="No blog posts yet"
                    description="Start with content that answers a real buying question."
                    helper="Useful first posts include buying guides, sizing help, comparisons, product care, launches, and customer education."
                    actions={[{ label: "Create first post", onClick: () => setEditingPost(emptyPost) }]}
                  />
                ) : (
                  filteredPosts.map((post) => {
                    const resolvedStatus = resolveBlogPostStatus(post);
                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => loadPost(post)}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition",
                          editingPost.id === post.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-background/70 hover:border-primary/25 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold text-foreground">{post.title}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">/{post.slug}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{resolvedStatus}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          {post.category ? <span className="rounded-full bg-muted px-2 py-1">{post.category}</span> : null}
                          {post.is_featured ? <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">Featured</span> : null}
                          <span>{formatBlogDate(post.published_at)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {!editingPost.id ? <BlogArticleTemplateChooser onApply={applyArticleTemplate} /> : null}

              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle>{editingPost.id ? "Edit article" : "Create article"}</CardTitle>
                  <CardDescription>Write the useful content first, then attach products and search metadata.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="blog-title">Title</Label>
                      <Input
                        id="blog-title"
                        value={editingPost.title}
                        onChange={(event) => {
                          const title = event.target.value;
                          setEditingPost((current) => ({ ...current, title, slug: current.id ? current.slug : normalizeBlogSlug("", title) }));
                        }}
                        placeholder="How to choose the right everyday backpack"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="blog-slug">URL slug</Label>
                      <Input id="blog-slug" value={editingPost.slug} onChange={(event) => setEditingPost((current) => ({ ...current, slug: normalizeBlogSlug(event.target.value, current.title) }))} placeholder="choose-the-right-backpack" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2"><Label>Category</Label><Input value={editingPost.category} onChange={(event) => setEditingPost((current) => ({ ...current, category: event.target.value }))} placeholder="Buying Guides" /></div>
                    <div className="grid gap-2 md:col-span-2"><Label>Tags <span className="font-normal text-muted-foreground">(comma separated)</span></Label><Input value={editingPost.tags} onChange={(event) => setEditingPost((current) => ({ ...current, tags: event.target.value }))} placeholder="backpacks, travel, everyday carry" /></div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2"><Label>Author name</Label><Input value={editingPost.author_name} onChange={(event) => setEditingPost((current) => ({ ...current, author_name: event.target.value }))} placeholder={store?.name || "Store team"} /></div>
                    <SettingSwitch checked={editingPost.is_featured} onCheckedChange={(value) => setEditingPost((current) => ({ ...current, is_featured: value }))} title="Featured article" description="Give this post priority in magazine-style layouts." />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2"><Label>Featured image URL</Label><Input value={editingPost.featured_image} onChange={(event) => setEditingPost((current) => ({ ...current, featured_image: event.target.value }))} placeholder="https://..." /></div>
                    <div className="grid gap-2"><Label>Image alt text</Label><Input value={editingPost.featured_image_alt} onChange={(event) => setEditingPost((current) => ({ ...current, featured_image_alt: event.target.value }))} placeholder="Describe the image for accessibility and SEO" /></div>
                  </div>

                  <div className="grid gap-2"><Label>Excerpt</Label><Textarea value={editingPost.excerpt} onChange={(event) => setEditingPost((current) => ({ ...current, excerpt: event.target.value }))} rows={3} placeholder="A useful one- or two-sentence summary shown on cards and search previews." /></div>

                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Label htmlFor={contentEditorMode === "markdown" ? "blog-content" : undefined}>Article content</Label>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {readingMinutes} min read</p>
                      </div>
                      <div className="flex rounded-xl border border-border bg-muted/20 p-1">
                        <Button type="button" size="sm" variant={contentEditorMode === "structured" ? "default" : "ghost"} onClick={() => setContentEditorMode("structured")}>Structured</Button>
                        <Button type="button" size="sm" variant={contentEditorMode === "markdown" ? "default" : "ghost"} onClick={() => setContentEditorMode("markdown")}>Markdown</Button>
                      </div>
                    </div>

                    {contentEditorMode === "structured" ? (
                      <BlogStructuredArticleEditor
                        value={editingPost.content}
                        onChange={(content) => setEditingPost((current) => ({ ...current, content }))}
                        selectedProductCount={editingPost.embedded_product_ids.length}
                      />
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkdown("## ", "", "Section heading")} title="Heading"><Heading2 className="h-4 w-4" /></Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkdown("**", "**", "bold text")} title="Bold"><Bold className="h-4 w-4" /></Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkdown("*", "*", "italic text")} title="Italic"><Italic className="h-4 w-4" /></Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkdown("- ", "", "list item")} title="List"><List className="h-4 w-4" /></Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => insertMarkdown("[", "](https://example.com)", "link text")} title="Link — use /blog/... or /product/... for internal links"><Link2 className="h-4 w-4" /></Button>
                          <Button type="button" size="sm" variant="ghost" onClick={insertProductSectionAtCursor} disabled={editingPost.embedded_product_ids.length === 0} title="Insert selected product cards here"><ShoppingBag className="h-4 w-4" /></Button>
                          <span className="ml-auto px-2 py-1 text-xs text-muted-foreground">Markdown + commerce</span>
                        </div>
                        <Textarea
                          ref={contentRef}
                          id="blog-content"
                          value={editingPost.content}
                          onChange={(event) => setEditingPost((current) => ({ ...current, content: event.target.value }))}
                          rows={18}
                          placeholder={"## The short answer\n\nExplain what the shopper needs to know.\n\n## What to compare\n\n- Fit\n- Material\n- Price\n- Warranty\n\nLink to a related guide or product when it genuinely helps the shopper."}
                        />
                      </>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-background/60 p-5">
                    <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /><p className="text-sm font-semibold text-foreground">Article preview</p></div>
                    <div className="prose prose-sm mt-4 max-w-none dark:prose-invert prose-p:leading-7" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                </CardContent>
              </Card>

              <BlogQualityPanel report={qualityReport} />

              {store ? (
                <BlogInternalLinkAssistant
                  storeSlug={store.slug}
                  currentPostId={editingPost.id}
                  title={editingPost.title}
                  category={editingPost.category}
                  tags={editingPost.tags}
                  content={editingPost.content}
                  embeddedProductIds={editingPost.embedded_product_ids}
                  posts={posts}
                  products={products}
                  onInsert={(suggestion) => insertMarkdown("[", `](${suggestion.url})`, suggestion.label)}
                />
              ) : null}

              <Card className="border-border bg-card/50">
                <CardHeader>
                  <div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" /><CardTitle>Shoppable product section</CardTitle></div>
                  <CardDescription>Select up to eight real catalog products, then place their product cards exactly where they should appear in the article.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2"><Label>Section heading</Label><Input value={editingPost.product_embed_title} onChange={(event) => setEditingPost((current) => ({ ...current, product_embed_title: event.target.value }))} placeholder="Shop products from this guide" /></div>
                    <div className="grid gap-2">
                      <Label>Fallback placement</Label>
                      <Select value={editingPost.product_embed_position} onValueChange={(value) => setEditingPost((current) => ({ ...current, product_embed_position: value as BlogProductEmbedPosition }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before-content">Before article</SelectItem>
                          <SelectItem value="after-intro">After intro</SelectItem>
                          <SelectItem value="after-content">After article</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search your products" className="pl-9" /></div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{editingPost.embedded_product_ids.length}/8 products selected</p>
                      <p className="mt-1 text-xs text-muted-foreground">Place the cursor in Article content, then insert the cards there. If you do not insert them inline, fallback placement is used.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={insertProductSectionAtCursor} disabled={editingPost.embedded_product_ids.length === 0}><ShoppingBag className="mr-2 h-4 w-4" /> Insert selected products here</Button>
                  </div>
                  {editingPost.content.includes("[[products]]") ? <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">Inline product placement is active. The selected product cards will render where the product marker appears in the article preview.</div> : null}
                  {products.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Add products to your catalog first, then return here to make articles shoppable.</div>
                  ) : (
                    <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredProducts.map((product) => {
                        const selected = editingPost.embedded_product_ids.includes(product.id);
                        return (
                          <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} className={cn("overflow-hidden rounded-xl border text-left transition", selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background hover:border-primary/30")}>
                            {product.image_url ? <img src={product.image_url} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-muted"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>}
                            <div className="p-3">
                              <p className="line-clamp-2 text-sm font-semibold text-foreground">{product.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{formatMoney(product.price)}</p>
                              <p className={cn("mt-2 text-[11px] font-semibold", selected ? "text-primary" : "text-muted-foreground")}>{selected ? "Selected" : "Add to article"}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50">
                <CardHeader>
                  <div className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /><CardTitle>Search & social SEO</CardTitle></div>
                  <CardDescription>Control how this article appears in search results and when it is shared.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2"><div className="flex justify-between gap-2"><Label>SEO title</Label><span className="text-xs text-muted-foreground">{editingPost.seo_title.length}/60</span></div><Input value={editingPost.seo_title} onChange={(event) => setEditingPost((current) => ({ ...current, seo_title: event.target.value }))} placeholder="Optional search-specific title" /></div>
                    <div className="grid gap-2"><Label>SEO keywords <span className="font-normal text-muted-foreground">(comma separated)</span></Label><Input value={editingPost.seo_keywords} onChange={(event) => setEditingPost((current) => ({ ...current, seo_keywords: event.target.value }))} placeholder="travel backpack, carry-on backpack" /></div>
                  </div>
                  <div className="grid gap-2"><div className="flex justify-between gap-2"><Label>Meta description</Label><span className="text-xs text-muted-foreground">{editingPost.seo_description.length}/160</span></div><Textarea value={editingPost.seo_description} onChange={(event) => setEditingPost((current) => ({ ...current, seo_description: event.target.value }))} rows={3} placeholder="Describe why this article is useful and what the shopper will learn." /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2"><Label>Canonical URL</Label><Input value={editingPost.canonical_url} onChange={(event) => setEditingPost((current) => ({ ...current, canonical_url: event.target.value }))} placeholder="Leave blank to use this store's article URL" /></div>
                    <div className="grid gap-2"><Label>Social / OG image URL</Label><Input value={editingPost.og_image} onChange={(event) => setEditingPost((current) => ({ ...current, og_image: event.target.value }))} placeholder="Defaults to featured image" /></div>
                  </div>
                  <SettingSwitch checked={editingPost.noindex} onCheckedChange={(value) => setEditingPost((current) => ({ ...current, noindex: value }))} title="Hide this article from search engines" description="Adds noindex metadata. Useful for temporary, private-ish, or duplicate campaign content." />
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="truncate text-sm text-emerald-600">{editingPost.canonical_url || (store ? buildBlogPostUrl(store.slug, editingPost.slug || "article") : "/blog/article")}</p>
                    <p className="mt-1 line-clamp-2 text-lg font-medium text-blue-600">{seoTitlePreview}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{seoDescriptionPreview}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50">
                <CardContent className="space-y-4 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Publish state</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant={editingPost.status === "draft" ? "default" : "outline"} onClick={() => setEditingPost((current) => ({ ...current, status: "draft" }))}>Draft</Button>
                        <Button type="button" variant={editingPost.status === "published" ? "default" : "outline"} onClick={() => setEditingPost((current) => ({ ...current, status: "published", published_at: current.published_at || new Date().toISOString().slice(0, 16) }))}>Publish</Button>
                      </div>
                    </div>
                    <div className="grid gap-2"><Label>Publish date / schedule</Label><Input type="datetime-local" value={editingPost.published_at} onChange={(event) => setEditingPost((current) => ({ ...current, published_at: event.target.value }))} disabled={editingPost.status === "draft"} /></div>
                  </div>
                  <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
                    <div>{editingPost.id ? <Button type="button" variant="destructive" onClick={deletePost} disabled={deletingPost}>{deletingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete</Button> : null}</div>
                    <div className="flex flex-wrap gap-2">
                      {editingPost.id && store ? <Button type="button" variant="outline" asChild><a href={buildBlogPostUrl(store.slug, editingPost.slug)} target="_blank" rel="noreferrer">Preview live <ArrowUpRight className="ml-2 h-4 w-4" /></a></Button> : null}
                      <Button type="button" onClick={savePost} disabled={savingPost}>{savingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{editingPost.id ? "Update article" : "Save article"}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="homepage" className="space-y-6">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><CardTitle>Homepage blog widget</CardTitle></div>
              <CardDescription>Show recent articles near the end of the homepage without adding a second CMS block schema. This widget stays controlled from Blog and adapts across storefront templates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingSwitch checked={blogSettings.homepageWidgetEnabled} onCheckedChange={(value) => updateSettings("homepageWidgetEnabled", value)} title="Show blog on homepage" description="Displays the latest published stories only when the Blog feature itself is enabled." />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {widgetLayouts.map((layout) => (
                  <button key={layout.id} type="button" onClick={() => updateSettings("homepageWidgetLayout", layout.id)} className={cn("rounded-2xl border p-4 text-left transition", blogSettings.homepageWidgetLayout === layout.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background hover:border-primary/25")}>
                    <p className="text-sm font-semibold text-foreground">{layout.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{layout.description}</p>
                  </button>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2"><Label>Eyebrow</Label><Input value={blogSettings.homepageWidgetEyebrow} onChange={(event) => updateSettings("homepageWidgetEyebrow", event.target.value)} /></div>
                <div className="grid gap-2"><Label>Section title</Label><Input value={blogSettings.homepageWidgetTitle} onChange={(event) => updateSettings("homepageWidgetTitle", event.target.value)} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div className="grid gap-2"><Label>Subtitle</Label><Textarea rows={3} value={blogSettings.homepageWidgetSubtitle} onChange={(event) => updateSettings("homepageWidgetSubtitle", event.target.value)} /></div>
                <div className="grid gap-2"><Label>Number of posts</Label><Input type="number" min={2} max={8} value={blogSettings.homepageWidgetLimit} onChange={(event) => updateSettings("homepageWidgetLimit", Math.min(8, Math.max(2, Number(event.target.value) || 3)))} /></div>
              </div>
              <div className="flex justify-end"><Button onClick={saveBlogSettings} disabled={savingSettings}>{savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save homepage widget</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <Card className="border-border bg-card/50">
            <CardHeader><CardTitle>Blog index page</CardTitle><CardDescription>Choose how the main blog page reads, looks, and appears to search engines.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-3">
                {indexLayouts.map((layout) => (
                  <button key={layout.id} type="button" onClick={() => updateSettings("indexLayout", layout.id)} className={cn("rounded-2xl border p-4 text-left transition", blogSettings.indexLayout === layout.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background hover:border-primary/25")}>
                    <p className="text-sm font-semibold text-foreground">{layout.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{layout.description}</p>
                  </button>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2"><Label>Eyebrow</Label><Input value={blogSettings.indexEyebrow} onChange={(event) => updateSettings("indexEyebrow", event.target.value)} /></div>
                <div className="grid gap-2"><Label>Page title</Label><Input value={blogSettings.indexTitle} onChange={(event) => updateSettings("indexTitle", event.target.value)} placeholder={`${store?.name || "Store"} journal`} /></div>
              </div>
              <div className="grid gap-2"><Label>Page description</Label><Textarea rows={3} value={blogSettings.indexDescription} onChange={(event) => updateSettings("indexDescription", event.target.value)} /></div>
              <div className="grid gap-2 md:max-w-xs"><Label>Posts per page</Label><Input type="number" min={3} max={48} value={blogSettings.postsPerPage} onChange={(event) => updateSettings("postsPerPage", Math.min(48, Math.max(3, Number(event.target.value) || 12)))} /></div>
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Article card information</p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SettingSwitch checked={blogSettings.showAuthor} onCheckedChange={(value) => updateSettings("showAuthor", value)} title="Author" description="Show the article author when one is set." />
                  <SettingSwitch checked={blogSettings.showDate} onCheckedChange={(value) => updateSettings("showDate", value)} title="Publish date" description="Show when the article went live." />
                  <SettingSwitch checked={blogSettings.showReadingTime} onCheckedChange={(value) => updateSettings("showReadingTime", value)} title="Reading time" description="Estimate minutes from article length." />
                  <SettingSwitch checked={blogSettings.showCategory} onCheckedChange={(value) => updateSettings("showCategory", value)} title="Category" description="Show the main content category." />
                  <SettingSwitch checked={blogSettings.showTags} onCheckedChange={(value) => updateSettings("showTags", value)} title="Tags" description="Show useful topic tags on article pages." />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-5">
                <div className="mb-4 flex items-center gap-2"><Search className="h-4 w-4 text-primary" /><p className="text-sm font-semibold text-foreground">Blog-level SEO</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2"><Label>SEO title</Label><Input value={blogSettings.seoTitle} onChange={(event) => updateSettings("seoTitle", event.target.value)} placeholder={`${store?.name || "Store"} Blog | Guides & Stories`} /></div>
                  <div className="grid gap-2"><Label>Open Graph image</Label><Input value={blogSettings.ogImage} onChange={(event) => updateSettings("ogImage", event.target.value)} placeholder="https://..." /></div>
                </div>
                <div className="mt-4 grid gap-2"><Label>SEO description</Label><Textarea rows={3} value={blogSettings.seoDescription} onChange={(event) => updateSettings("seoDescription", event.target.value)} placeholder="What useful content can shoppers find in this blog?" /></div>
              </div>
              <div className="flex justify-end"><Button onClick={saveBlogSettings} disabled={savingSettings}>{savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save blog page</Button></div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader><div className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /><CardTitle>E-commerce content ideas</CardTitle></div><CardDescription>Strong blog content should move readers toward a confident purchase rather than exist only for traffic.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Buying guides", "Help shoppers choose by use case, budget, size, material, or compatibility."],
                ["Comparisons", "Compare products or options using real differences instead of generic claims."],
                ["How-to & care", "Teach setup, use, maintenance, styling, recipes, routines, or aftercare."],
                ["Launch stories", "Explain what is new, who it is for, and link the products directly inside the story."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-xl border border-border bg-background/60 p-4"><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
