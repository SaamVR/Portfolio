"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Code2,
  Heading2,
  List,
  Plus,
  Quote,
  ShoppingBag,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createBlogArticleBlock,
  insertBlogArticleContent,
  parseBlogArticleBlocks,
  serializeBlogArticleBlocks,
  type BlogArticleBlock,
  type BlogArticleInsertion,
} from "@/lib/cms/blog-article-blocks";
import { cn } from "@/lib/utils";

function blockLabel(block: BlogArticleBlock) {
  switch (block.type) {
    case "heading": return `H${block.level} heading`;
    case "paragraph": return "Text";
    case "list": return block.ordered ? "Numbered list" : "Bullet list";
    case "quote": return "Quote";
    case "table": return "Comparison table";
    case "products": return "Product cards";
    case "markdown": return "Raw Markdown";
  }
}

function blockIcon(block: BlogArticleBlock) {
  switch (block.type) {
    case "heading": return Heading2;
    case "paragraph": return Type;
    case "list": return List;
    case "quote": return Quote;
    case "table": return Table2;
    case "products": return ShoppingBag;
    case "markdown": return Code2;
  }
}

function insertionTargetIndex(
  blocks: BlogArticleBlock[],
  targetIndex: number | null,
  insertion: BlogArticleInsertion,
) {
  const validTarget = targetIndex !== null && targetIndex >= 0 && targetIndex < blocks.length
    ? targetIndex
    : null;
  if (insertion.type === "products") return validTarget === null ? blocks.length : validTarget + 1;
  if (validTarget === null) return blocks.length;
  const target = blocks[validTarget];
  return target.type === "paragraph" || target.type === "quote" || target.type === "markdown"
    ? validTarget
    : validTarget + 1;
}

function detectAppendedInsertion(currentMarkdown: string, nextMarkdown: string): BlogArticleInsertion | null {
  if (!nextMarkdown.startsWith(currentMarkdown)) return null;
  const appended = nextMarkdown.slice(currentMarkdown.length).trim();
  if (!appended) return null;
  if (appended.toLowerCase() === "[[products]]") return { type: "products" };
  if (/^\[[^\]\n]+\]\([^\n)]+\)$/.test(appended)) return { type: "markdown", markdown: appended };
  return null;
}

export default function BlogStructuredArticleEditor({
  value,
  onChange,
  selectedProductCount = 0,
}: {
  value: string;
  onChange: (value: string) => void;
  selectedProductCount?: number;
}) {
  const [blocks, setBlocks] = useState<BlogArticleBlock[]>(() => parseBlogArticleBlocks(value));
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const blocksRef = useRef(blocks);
  const activeBlockIndexRef = useRef<number | null>(null);

  const selectBlock = (index: number | null) => {
    activeBlockIndexRef.current = index;
    setActiveBlockIndex(index);
  };

  const commit = (next: BlogArticleBlock[]) => {
    blocksRef.current = next;
    setBlocks(next);
    onChange(serializeBlogArticleBlocks(next));
  };

  useEffect(() => {
    const current = blocksRef.current;
    const currentSerialized = serializeBlogArticleBlocks(current);
    const normalizedValue = value.trim();
    if (currentSerialized === normalizedValue) return;

    const appendedInsertion = detectAppendedInsertion(currentSerialized, normalizedValue);
    if (appendedInsertion) {
      const target = activeBlockIndexRef.current;
      const next = insertBlogArticleContent(current, target, appendedInsertion);
      if (next === current) {
        onChange(currentSerialized);
        return;
      }
      const nextTarget = Math.min(insertionTargetIndex(current, target, appendedInsertion), next.length - 1);
      blocksRef.current = next;
      setBlocks(next);
      selectBlock(next.length ? Math.max(0, nextTarget) : null);
      const relocated = serializeBlogArticleBlocks(next);
      if (relocated !== normalizedValue) onChange(relocated);
      return;
    }

    const next = parseBlogArticleBlocks(value);
    blocksRef.current = next;
    setBlocks(next);
    if (activeBlockIndexRef.current !== null && activeBlockIndexRef.current >= next.length) {
      selectBlock(next.length ? next.length - 1 : null);
    }
  }, [value, onChange]);

  const hasProductBlock = useMemo(() => blocks.some((block) => block.type === "products"), [blocks]);

  const updateBlock = (index: number, block: BlogArticleBlock) => {
    const next = [...blocks];
    next[index] = block;
    commit(next);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
    if (activeBlockIndexRef.current === index) selectBlock(target);
    else if (activeBlockIndexRef.current === target) selectBlock(index);
  };

  const removeBlock = (index: number) => {
    const next = blocks.filter((_, blockIndex) => blockIndex !== index);
    commit(next);
    if (activeBlockIndexRef.current === index) selectBlock(null);
    else if (activeBlockIndexRef.current !== null && activeBlockIndexRef.current > index) selectBlock(activeBlockIndexRef.current - 1);
  };

  const addBlock = (type: BlogArticleBlock["type"]) => {
    if (type === "products" && hasProductBlock) return;
    const next = [...blocks, createBlogArticleBlock(type)];
    commit(next);
    selectBlock(next.length - 1);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-5 text-muted-foreground">
        This editor saves back to the same Markdown article field. Click or focus a block to make it the insertion target for assistant links and product cards.
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">Start with a section</p>
          <p className="mt-1 text-xs text-muted-foreground">Add text, a heading, a list, or another article block below.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => {
            const Icon = blockIcon(block);
            const isActive = activeBlockIndex === index;
            return (
              <div
                key={`${block.type}-${index}`}
                onMouseDown={() => selectBlock(index)}
                onFocusCapture={() => selectBlock(index)}
                className={cn(
                  "rounded-2xl border bg-background/80 shadow-sm transition",
                  isActive ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
                    {blockLabel(block)}
                    {isActive ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Insertion target</span> : null}
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveBlock(index, -1)} disabled={index === 0} title="Move up"><ChevronUp className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} title="Move down"><ChevronDown className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeBlock(index)} title="Remove block"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="p-3">
                  {block.type === "heading" ? (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant={block.level === 2 ? "default" : "outline"} onClick={() => updateBlock(index, { ...block, level: 2 })}>H2</Button>
                      <Button type="button" size="sm" variant={block.level === 3 ? "default" : "outline"} onClick={() => updateBlock(index, { ...block, level: 3 })}>H3</Button>
                      <Input value={block.text} onChange={(event) => updateBlock(index, { ...block, text: event.target.value })} placeholder="Section heading" />
                    </div>
                  ) : null}

                  {block.type === "paragraph" ? (
                    <Textarea value={block.markdown} onChange={(event) => updateBlock(index, { ...block, markdown: event.target.value })} rows={4} placeholder="Write useful article text. Inline Markdown links, bold, emphasis, and code remain supported." />
                  ) : null}

                  {block.type === "list" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant={!block.ordered ? "default" : "outline"} onClick={() => updateBlock(index, { ...block, ordered: false })}>Bullets</Button>
                        <Button type="button" size="sm" variant={block.ordered ? "default" : "outline"} onClick={() => updateBlock(index, { ...block, ordered: true })}>Numbered</Button>
                      </div>
                      <Textarea
                        value={block.items.join("\n")}
                        onChange={(event) => updateBlock(index, { ...block, items: event.target.value.split("\n") })}
                        rows={Math.max(3, block.items.length)}
                        placeholder={"One item per line\nSecond item\nThird item"}
                      />
                    </div>
                  ) : null}

                  {block.type === "quote" ? (
                    <Textarea value={block.text} onChange={(event) => updateBlock(index, { ...block, text: event.target.value })} rows={3} placeholder="A useful callout, warning, or quoted insight." />
                  ) : null}

                  {block.type === "table" ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-5 text-muted-foreground">Edit the Markdown table directly here. It keeps the existing safe table renderer and mobile overflow behavior.</p>
                      <Textarea value={block.markdown} onChange={(event) => updateBlock(index, { ...block, markdown: event.target.value })} rows={5} className="font-mono text-xs" />
                    </div>
                  ) : null}

                  {block.type === "products" ? (
                    <div className={cn("rounded-xl border px-4 py-4", selectedProductCount > 0 ? "border-primary/20 bg-primary/5" : "border-amber-500/30 bg-amber-500/5")}>
                      <div className="flex items-start gap-3">
                        <ShoppingBag className="mt-0.5 h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Selected product cards render here</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {selectedProductCount > 0 ? `${selectedProductCount} selected product${selectedProductCount === 1 ? "" : "s"} will use this inline position.` : "Select products in the Shoppable product section below before publishing this inline block."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {block.type === "markdown" ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-5 text-muted-foreground">Preserved legacy/advanced Markdown. Edit it directly so unsupported syntax is never silently discarded.</p>
                      <Textarea value={block.markdown} onChange={(event) => updateBlock(index, { ...block, markdown: event.target.value })} rows={5} className="font-mono text-xs" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/20 p-3">
        <span className="flex items-center gap-1 pr-1 text-xs font-semibold text-muted-foreground"><Plus className="h-3.5 w-3.5" /> Add</span>
        <Button type="button" size="sm" variant="outline" onClick={() => addBlock("paragraph")}><Type className="mr-1.5 h-3.5 w-3.5" /> Text</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addBlock("heading")}><Heading2 className="mr-1.5 h-3.5 w-3.5" /> Heading</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addBlock("list")}><List className="mr-1.5 h-3.5 w-3.5" /> List</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addBlock("quote")}><Quote className="mr-1.5 h-3.5 w-3.5" /> Quote</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addBlock("table")}><Table2 className="mr-1.5 h-3.5 w-3.5" /> Table</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addBlock("products")} disabled={selectedProductCount === 0 || hasProductBlock}><ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Products</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => addBlock("markdown")}><Code2 className="mr-1.5 h-3.5 w-3.5" /> Raw</Button>
      </div>
    </div>
  );
}
