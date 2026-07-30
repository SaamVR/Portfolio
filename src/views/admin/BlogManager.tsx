"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, PencilLine, Plus, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { buildBlogExcerpt, buildBlogIndexUrl, buildBlogPostUrl, formatBlogDate, markdownToHtml, normalizeBlogSlug, resolveBlogPostStatus, type BlogPostRecord } from "@/lib/cms/blog";

type EditablePost = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published";
  published_at: string;
};

const emptyPost: EditablePost = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image: "",
  seo_title: "",
  seo_description: "",
  status: "draft",
  published_at: "",
};

export default function BlogManager() {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingPost, setEditingPost] = useState<EditablePost>(emptyPost);
  const [saving, setSaving] = useState(false);

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

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter((post) =>
      [post.title, post.slug, post.excerpt ?? "", post.seo_title ?? ""].some((value) => value.toLowerCase().includes(term)));
  }, [posts, search]);

  const publishedCount = posts.filter((post) => resolveBlogPostStatus(post) === "published").length;
  const scheduledCount = posts.filter((post) => resolveBlogPostStatus(post) === "scheduled").length;
  const draftCount = posts.filter((post) => resolveBlogPostStatus(post) === "draft").length;

  const previewHtml = useMemo(() => markdownToHtml(editingPost.content || "Write your first story, launch update, or product education post here."), [editingPost.content]);

  const savePost = async () => {
    if (!activeStoreId) {
      toast.error("Select a store first.");
      return;
    }
    if (!editingPost.title.trim()) {
      toast.error("Add a post title first.");
      return;
    }

    setSaving(true);
    try {
      const slug = normalizeBlogSlug(editingPost.slug, editingPost.title);
      const payload = {
        store_id: activeStoreId,
        title: editingPost.title.trim(),
        slug,
        excerpt: buildBlogExcerpt(editingPost.content, editingPost.excerpt),
        content: editingPost.content.trim(),
        featured_image: editingPost.featured_image.trim() || null,
        seo_title: editingPost.seo_title.trim() || editingPost.title.trim(),
        seo_description: editingPost.seo_description.trim() || buildBlogExcerpt(editingPost.content, editingPost.excerpt),
        status: editingPost.status,
        published_at: editingPost.status === "published"
          ? (editingPost.published_at || new Date().toISOString())
          : null,
      };

      if (editingPost.id) {
        const { error } = await (supabase as any)
          .from("blog_posts")
          .update(payload)
          .eq("id", editingPost.id)
          .eq("store_id", activeStoreId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("blog_posts")
          .insert(payload);
        if (error) throw error;
      }

      toast.success(editingPost.id ? "Blog post updated." : "Blog post created.");
      setEditingPost(emptyPost);
      await queryClient.invalidateQueries({ queryKey: ["blog-posts", activeStoreId] });
    } catch (saveError) {
      console.error(saveError);
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save the blog post.");
    } finally {
      setSaving(false);
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
      seo_title: post.seo_title ?? "",
      seo_description: post.seo_description ?? "",
      status: resolveBlogPostStatus(post) === "draft" ? "draft" : "published",
      published_at: post.published_at ? post.published_at.slice(0, 16) : "",
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
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading blog workspace...
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
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Published", value: publishedCount, helper: "Posts already live on the storefront." },
          { label: "Scheduled", value: scheduledCount, helper: "Future-dated stories waiting to go live." },
          { label: "Drafts", value: draftCount, helper: "Ideas still being refined before publishing." },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card/50">
            <CardHeader className="space-y-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
              <p className="text-xs text-muted-foreground">{item.helper}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border bg-card/50">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Post list</CardTitle>
                <CardDescription>Manage launch stories, SEO articles, product education, and updates from one place.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={() => setEditingPost(emptyPost)}>
                <Plus className="mr-2 h-4 w-4" />
                New post
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts, slugs, or SEO titles" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredPosts.length === 0 ? (
              <AdminEmptyState
                icon={PencilLine}
                title="No blog posts yet"
                description="This store has not published any blog content yet."
                helper="Start with buying guides, sizing help, product drops, or trust-building stories that help search traffic convert."
                actions={[{ label: "Start first post", onClick: () => setEditingPost(emptyPost) }]}
              />
            ) : (
              filteredPosts.map((post) => {
                const resolvedStatus = resolveBlogPostStatus(post);
                const postUrl = store ? buildBlogPostUrl(store.slug, post.slug) : "#";
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => loadPost(post)}
                    className="w-full rounded-2xl border border-border bg-background/80 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{post.title}</p>
                        <p className="text-xs text-muted-foreground">/{post.slug}</p>
                      </div>
                      <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                        {resolvedStatus}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{buildBlogExcerpt(post.content, post.excerpt)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatBlogDate(post.published_at)}</span>
                      {store ? (
                        <a href={postUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Preview live
                        </a>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>{editingPost.id ? "Edit post" : "Create post"}</CardTitle>
            <CardDescription>Markdown-first editing that stays practical on mobile and clear for merchants.</CardDescription>
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
                    setEditingPost((current) => ({
                      ...current,
                      title,
                      slug: current.id ? current.slug : normalizeBlogSlug("", title),
                    }));
                  }}
                  placeholder="Summer collection launch guide"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="blog-slug">Slug</Label>
                <Input id="blog-slug" value={editingPost.slug} onChange={(event) => setEditingPost((current) => ({ ...current, slug: normalizeBlogSlug(event.target.value, current.title) }))} placeholder="summer-collection-launch-guide" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="blog-cover">Featured image URL</Label>
                <Input id="blog-cover" value={editingPost.featured_image} onChange={(event) => setEditingPost((current) => ({ ...current, featured_image: event.target.value }))} placeholder="https://..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="blog-published-at">Publish time</Label>
                <Input id="blog-published-at" type="datetime-local" value={editingPost.published_at} onChange={(event) => setEditingPost((current) => ({ ...current, published_at: event.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="blog-excerpt">Excerpt</Label>
              <Textarea id="blog-excerpt" value={editingPost.excerpt} onChange={(event) => setEditingPost((current) => ({ ...current, excerpt: event.target.value }))} rows={3} placeholder="A short summary for cards, SEO, and social previews." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="blog-markdown">Markdown content</Label>
              <Textarea id="blog-markdown" value={editingPost.content} onChange={(event) => setEditingPost((current) => ({ ...current, content: event.target.value }))} rows={16} placeholder={"# Why this drop matters\n\n- What changed\n- Why shoppers care\n- How to order"} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="blog-seo-title">SEO title</Label>
                <Input id="blog-seo-title" value={editingPost.seo_title} onChange={(event) => setEditingPost((current) => ({ ...current, seo_title: event.target.value }))} placeholder="Optional: tighter title for search results" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="blog-seo-description">SEO description</Label>
                <Textarea id="blog-seo-description" value={editingPost.seo_description} onChange={(event) => setEditingPost((current) => ({ ...current, seo_description: event.target.value }))} rows={3} placeholder="Optional: tighter search description for this article" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={editingPost.status === "draft" ? "default" : "outline"} onClick={() => setEditingPost((current) => ({ ...current, status: "draft" }))}>
                Save as draft
              </Button>
              <Button type="button" variant={editingPost.status === "published" ? "default" : "outline"} onClick={() => setEditingPost((current) => ({ ...current, status: "published", published_at: current.published_at || new Date().toISOString().slice(0, 16) }))}>
                Publish
              </Button>
              <Button type="button" onClick={savePost} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingPost.id ? "Update post" : "Save post"}
              </Button>
              {store ? (
                <Button type="button" variant="outline" asChild>
                  <a href={buildBlogIndexUrl(store.slug)} target="_blank" rel="noreferrer">Open live blog</a>
                </Button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4 text-primary" />
                Live preview
              </div>
              {editingPost.featured_image ? (
                <img src={editingPost.featured_image} alt="" className="mb-4 h-48 w-full rounded-xl object-cover" />
              ) : null}
              <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:mb-3 prose-p:leading-7 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-muted prose-pre:p-4 prose-ul:list-disc prose-ol:list-decimal" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
