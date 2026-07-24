"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import type { RichTextDoc } from "@/lib/cms/schema";

type PageBlueprintBlockEditorProps = {
  block: Record<string, unknown>;
  index: number;
  totalBlocks: number;
  knownBlockTypes: string[];
  onUpdateBlock: (index: number, patch: Record<string, unknown>) => void;
  onUpdateBlockProps: (index: number, patch: Record<string, unknown>) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onRemoveBlock: (index: number) => void;
};

export function PageBlueprintBlockEditor({
  block,
  index,
  totalBlocks,
  knownBlockTypes,
  onUpdateBlock,
  onUpdateBlockProps,
  onMoveBlock,
  onRemoveBlock,
}: PageBlueprintBlockEditorProps) {
  const type = String(block.type ?? "");
  const props = block.props && typeof block.props === "object" ? block.props as Record<string, unknown> : {};

  return (
    <div className="grid gap-3 rounded-md border border-border px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{type || "unknown"}</p>
          <p className="text-xs text-muted-foreground">Order {index + 1} | {block.isVisible === false ? "Hidden" : "Visible"}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
            <Switch
              checked={block.isVisible !== false}
              onCheckedChange={(checked) => onUpdateBlock(index, { isVisible: checked })}
            />
            <span className="text-xs text-muted-foreground">Visible</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onMoveBlock(index, -1)} disabled={index === 0}>Up</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onMoveBlock(index, 1)} disabled={index >= totalBlocks - 1}>Down</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onRemoveBlock(index)}>Remove</Button>
          </div>
        </div>
      </div>

      {type === "hero" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Tagline</Label>
            <Input value={String(props.tagline ?? "")} onChange={(event) => onUpdateBlockProps(index, { tagline: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Anchor Id</Label>
            <Input value={String(props.anchorId ?? "")} onChange={(event) => onUpdateBlockProps(index, { anchorId: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Highlight</Label>
            <Input value={String(props.highlight ?? "")} onChange={(event) => onUpdateBlockProps(index, { highlight: event.target.value })} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Subtitle</Label>
            <Textarea rows={3} value={String(props.subtitle ?? "")} onChange={(event) => onUpdateBlockProps(index, { subtitle: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Primary CTA Text</Label>
            <Input value={String(props.ctaText ?? "")} onChange={(event) => onUpdateBlockProps(index, { ctaText: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Primary CTA Link</Label>
            <Input value={String(props.ctaLink ?? "")} onChange={(event) => onUpdateBlockProps(index, { ctaLink: event.target.value })} />
          </div>
        </div>
      ) : null}

      {type === "featured-products" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Tagline</Label>
            <Input value={String(props.tagline ?? "")} onChange={(event) => onUpdateBlockProps(index, { tagline: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Limit</Label>
            <Input type="number" min={1} max={24} value={String(props.limit ?? 6)} onChange={(event) => onUpdateBlockProps(index, { limit: Number(event.target.value || 6) })} />
          </div>
        </div>
      ) : null}

      {type === "countdown" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label>Title</Label>
            <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Subtitle</Label>
            <Textarea rows={3} value={String(props.subtitle ?? "")} onChange={(event) => onUpdateBlockProps(index, { subtitle: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>End Date</Label>
            <Input value={String(props.endDate ?? "")} onChange={(event) => onUpdateBlockProps(index, { endDate: event.target.value })} placeholder="2026-12-31T23:59:59Z" />
          </div>
          <div className="grid gap-2">
            <Label>Background Gradient</Label>
            <Input value={String(props.bgGradient ?? "")} onChange={(event) => onUpdateBlockProps(index, { bgGradient: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>CTA Text</Label>
            <Input value={String(props.ctaText ?? "")} onChange={(event) => onUpdateBlockProps(index, { ctaText: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>CTA Link</Label>
            <Input value={String(props.ctaLink ?? "")} onChange={(event) => onUpdateBlockProps(index, { ctaLink: event.target.value })} />
          </div>
        </div>
      ) : null}

      {type === "promo-banner" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label>Title</Label>
            <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Subtitle</Label>
            <Textarea rows={3} value={String(props.subtitle ?? "")} onChange={(event) => onUpdateBlockProps(index, { subtitle: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Badge Text</Label>
            <Input value={String(props.badgeText ?? "")} onChange={(event) => onUpdateBlockProps(index, { badgeText: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Background Style</Label>
            <Select value={String(props.bgStyle ?? "gradient")} onValueChange={(value) => onUpdateBlockProps(index, { bgStyle: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gradient">gradient</SelectItem>
                <SelectItem value="dark">dark</SelectItem>
                <SelectItem value="accent">accent</SelectItem>
                <SelectItem value="luxury-gold">luxury-gold</SelectItem>
                <SelectItem value="indigo">indigo</SelectItem>
                <SelectItem value="rose">rose</SelectItem>
                <SelectItem value="aurora">aurora</SelectItem>
                <SelectItem value="luxury-dark">luxury-dark</SelectItem>
                <SelectItem value="confetti">confetti</SelectItem>
                <SelectItem value="mesh-gradient">mesh-gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>CTA Text</Label>
            <Input value={String(props.ctaText ?? "")} onChange={(event) => onUpdateBlockProps(index, { ctaText: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>CTA Link</Label>
            <Input value={String(props.ctaLink ?? "")} onChange={(event) => onUpdateBlockProps(index, { ctaLink: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Text Alignment</Label>
            <Select value={String(props.textAlignment ?? "center")} onValueChange={(value) => onUpdateBlockProps(index, { textAlignment: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">left</SelectItem>
                <SelectItem value="center">center</SelectItem>
                <SelectItem value="right">right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Padding Size</Label>
            <Select value={String(props.paddingSize ?? "cozy")} onValueChange={(value) => onUpdateBlockProps(index, { paddingSize: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">compact</SelectItem>
                <SelectItem value="cozy">cozy</SelectItem>
                <SelectItem value="large">large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Card Opacity</Label>
            <Input type="number" min={0} max={100} value={String(props.cardOpacity ?? 0)} onChange={(event) => onUpdateBlockProps(index, { cardOpacity: Number(event.target.value || 0) })} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label>Glow</Label>
            <Switch checked={Boolean(props.enableGlow)} onCheckedChange={(checked) => onUpdateBlockProps(index, { enableGlow: checked })} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label>Particles</Label>
            <Switch checked={props.enableParticles !== false} onCheckedChange={(checked) => onUpdateBlockProps(index, { enableParticles: checked })} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label>Orbs</Label>
            <Switch checked={props.enableOrbs !== false} onCheckedChange={(checked) => onUpdateBlockProps(index, { enableOrbs: checked })} />
          </div>
        </div>
      ) : null}

      {type === "category-showcase" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Tagline</Label>
            <Input value={String(props.tagline ?? "")} onChange={(event) => onUpdateBlockProps(index, { tagline: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
          </div>
        </div>
      ) : null}

      {type === "rich-text" ? (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Eyebrow</Label>
              <Input value={String(props.eyebrow ?? "")} onChange={(event) => onUpdateBlockProps(index, { eyebrow: event.target.value })} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Body</Label>
            <TiptapRichTextEditor
              value={props.body as RichTextDoc | string}
              onChange={(doc) => onUpdateBlockProps(index, { body: doc })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Alignment</Label>
            <Select value={String(props.align ?? "center")} onValueChange={(value) => onUpdateBlockProps(index, { align: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">left</SelectItem>
                <SelectItem value="center">center</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {type === "recently-viewed" ? (
        <div className="grid gap-2">
          <Label>Section Title</Label>
          <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
        </div>
      ) : null}

      {type === "social-feed" ? (
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Subtitle</Label>
            <Input value={String(props.subtitle ?? "")} onChange={(event) => onUpdateBlockProps(index, { subtitle: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Image URLs</Label>
            <Textarea
              rows={4}
              value={((props.images as string[] | undefined) ?? []).join(", ")}
              onChange={(event) => onUpdateBlockProps(index, {
                images: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
              })}
              placeholder="https://..., https://..."
            />
          </div>
        </div>
      ) : null}

      {type === "video-reel" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label>Title</Label>
            <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Video URL</Label>
            <Input value={String(props.videoUrl ?? "")} onChange={(event) => onUpdateBlockProps(index, { videoUrl: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>CTA Text</Label>
            <Input value={String(props.ctaText ?? "")} onChange={(event) => onUpdateBlockProps(index, { ctaText: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>CTA Link</Label>
            <Input value={String(props.ctaLink ?? "")} onChange={(event) => onUpdateBlockProps(index, { ctaLink: event.target.value })} />
          </div>
        </div>
      ) : null}

      {type === "faq-accordion" ? (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Input value={String(props.subtitle ?? "")} onChange={(event) => onUpdateBlockProps(index, { subtitle: event.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>FAQs JSON</Label>
            <Textarea
              rows={6}
              value={JSON.stringify(props.faqs ?? [], null, 2)}
              onChange={(event) => {
                try {
                  onUpdateBlockProps(index, { faqs: JSON.parse(event.target.value) });
                } catch {}
              }}
            />
          </div>
        </div>
      ) : null}

      {type === "trust-badges" ? (
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Badges JSON</Label>
            <Textarea
              rows={6}
              value={JSON.stringify(props.badges ?? [], null, 2)}
              onChange={(event) => {
                try {
                  onUpdateBlockProps(index, { badges: JSON.parse(event.target.value) });
                } catch {}
              }}
            />
          </div>
        </div>
      ) : null}

      {type === "testimonials" ? (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={String(props.title ?? "")} onChange={(event) => onUpdateBlockProps(index, { title: event.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Input value={String(props.subtitle ?? "")} onChange={(event) => onUpdateBlockProps(index, { subtitle: event.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Reviews JSON</Label>
            <Textarea
              rows={6}
              value={JSON.stringify(props.reviews ?? [], null, 2)}
              onChange={(event) => {
                try {
                  onUpdateBlockProps(index, { reviews: JSON.parse(event.target.value) });
                } catch {}
              }}
            />
          </div>
        </div>
      ) : null}

      {!["hero", "featured-products", "countdown", "promo-banner", "category-showcase", "rich-text", "recently-viewed", "social-feed", "video-reel", "faq-accordion", "trust-badges", "testimonials"].includes(type) ? (
        <div className="grid gap-2">
          <Label>Props JSON</Label>
          <Textarea
            rows={5}
            value={JSON.stringify(props ?? {}, null, 2)}
            onChange={(event) => {
              try {
                onUpdateBlock(index, { props: JSON.parse(event.target.value) });
              } catch {}
            }}
          />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label>Block Type</Label>
        <Select value={type} onValueChange={(value) => onUpdateBlock(index, { type: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {knownBlockTypes.map((blockType) => (
              <SelectItem key={blockType} value={blockType}>{blockType}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
