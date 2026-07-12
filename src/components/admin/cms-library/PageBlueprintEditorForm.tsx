"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { PageBlueprintBlockEditor } from "@/components/admin/cms-library/PageBlueprintBlockEditor";

type PageBlueprintEditorFormProps = {
  form: Record<string, string | boolean>;
  isEditing: boolean;
  businessFamilyOptions: readonly string[];
  catalogModeOptions: readonly string[];
  knownBlockTypes: string[];
  selectedCatalogModes: string[];
  pagePayload: {
    slug: string;
    title: string;
    seoTitle: string;
    seoDescription: string;
    isHomepage: boolean;
    blocks: Array<Record<string, unknown>>;
  };
  slugIsReserved: boolean;
  onUpdateField: (key: string, value: string | boolean) => void;
  onUpdateDelimitedStringArrayField: (key: string, raw: string) => void;
  onToggleStringArrayField: (key: string, value: string, checked: boolean) => void;
  onUpdatePagePayloadMeta: (key: "slug" | "title" | "seoTitle" | "seoDescription", value: string) => void;
  onUpdatePagePayloadHomepage: (checked: boolean) => void;
  onAddPagePayloadBlock: (type: string) => void;
  onRemovePagePayloadBlock: (index: number) => void;
  onMovePagePayloadBlock: (index: number, direction: -1 | 1) => void;
  onUpdatePagePayloadBlock: (index: number, patch: Record<string, unknown>) => void;
  onUpdatePagePayloadBlockProps: (index: number, patch: Record<string, unknown>) => void;
};

export function PageBlueprintEditorForm({
  form,
  isEditing,
  businessFamilyOptions,
  catalogModeOptions,
  knownBlockTypes,
  selectedCatalogModes,
  pagePayload,
  slugIsReserved,
  onUpdateField,
  onUpdateDelimitedStringArrayField,
  onToggleStringArrayField,
  onUpdatePagePayloadMeta,
  onUpdatePagePayloadHomepage,
  onAddPagePayloadBlock,
  onRemovePagePayloadBlock,
  onMovePagePayloadBlock,
  onUpdatePagePayloadBlock,
  onUpdatePagePayloadBlockProps,
}: PageBlueprintEditorFormProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Page Blueprint Id</Label>
          <Input value={String(form.id ?? "")} onChange={(event) => onUpdateField("id", event.target.value)} disabled={isEditing} />
        </div>
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input value={String(form.name ?? "")} onChange={(event) => onUpdateField("name", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Business Family</Label>
          <Select value={String(form.business_family ?? "commerce")} onValueChange={(value) => onUpdateField("business_family", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {businessFamilyOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea rows={3} value={String(form.description ?? "")} onChange={(event) => onUpdateField("description", event.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>Catalog Modes</Label>
        <Input
          value={selectedCatalogModes.join(", ")}
          onChange={(event) => onUpdateDelimitedStringArrayField("catalog_modes", event.target.value)}
          placeholder="single_product, multi_product"
        />
        <div className="flex flex-wrap gap-2 rounded-md border border-border p-2">
          {catalogModeOptions.map((mode) => (
            <label key={mode} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
              <Checkbox
                checked={selectedCatalogModes.includes(mode)}
                onCheckedChange={(checked) => onToggleStringArrayField("catalog_modes", mode, checked === true)}
              />
              <span>{mode.replace(/_/g, " ")}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Page Payload JSON</Label>
        <div className="grid gap-3 rounded-md border border-border p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input
                value={pagePayload.slug}
                onChange={(event) => onUpdatePagePayloadMeta("slug", event.target.value)}
                placeholder="/landing"
              />
              {slugIsReserved ? (
                <p className="text-xs text-amber-600">This slug is reserved for storefront routing. Use `/` only for a homepage or choose a different path.</p>
              ) : null}
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <Switch checked={pagePayload.isHomepage} onCheckedChange={onUpdatePagePayloadHomepage} />
                <Label>Homepage</Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={pagePayload.title} onChange={(event) => onUpdatePagePayloadMeta("title", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>SEO Title</Label>
              <Input value={pagePayload.seoTitle} onChange={(event) => onUpdatePagePayloadMeta("seoTitle", event.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>SEO Description</Label>
              <Textarea rows={3} value={pagePayload.seoDescription} onChange={(event) => onUpdatePagePayloadMeta("seoDescription", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {knownBlockTypes.map((blockType) => (
                <Button key={blockType} type="button" variant="outline" size="sm" onClick={() => onAddPagePayloadBlock(blockType)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {blockType}
                </Button>
              ))}
            </div>

            <div className="grid gap-3">
              {pagePayload.blocks.map((block, index) => (
                <PageBlueprintBlockEditor
                  key={`${String(block.id ?? block.type ?? "block")}-${index}`}
                  block={block}
                  index={index}
                  totalBlocks={pagePayload.blocks.length}
                  knownBlockTypes={knownBlockTypes}
                  onUpdateBlock={onUpdatePagePayloadBlock}
                  onUpdateBlockProps={onUpdatePagePayloadBlockProps}
                  onMoveBlock={onMovePagePayloadBlock}
                  onRemoveBlock={onRemovePagePayloadBlock}
                />
              ))}
              {pagePayload.blocks.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">No blocks yet. Add one from the menu above.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Textarea rows={16} value={String(form.page_payload ?? "")} onChange={(event) => onUpdateField("page_payload", event.target.value)} />

      <div className="flex items-center gap-3">
        <Switch checked={Boolean(form.is_active)} onCheckedChange={(checked) => onUpdateField("is_active", checked)} />
        <Label>Active</Label>
      </div>
    </div>
  );
}
