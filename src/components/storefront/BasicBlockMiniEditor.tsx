"use client";

import { useMemo, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProducts } from "@/hooks/useProducts";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import type { RichTextDoc, StorePageBlock } from "@/lib/cms/schema";

type FieldConfig = {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  type?: "text" | "number" | "select";
  options?: Array<{ label: string; value: string }>;
};

type BasicBlockMiniEditorProps = {
  block: StorePageBlock;
  storeId: string;
  updateBlockProps: (blockId: string, patch: Record<string, unknown>) => void;
  updateBlockMeta: (blockId: string, patch: Partial<StorePageBlock>) => void;
};

type RepeatableFieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "textarea" | "select";
  options?: Array<{ label: string; value: string }>;
};

const sectionCoachTips: Record<StorePageBlock["type"], string> = {
  hero: "Lead with one clear promise and one primary action. This section decides whether shoppers keep scrolling.",
  "promo-banner": "Use this for one timely offer only. Too many competing promos make the page feel noisy.",
  "featured-products": "Keep the product count focused. Fewer strong items often sell better than a crowded grid.",
  "category-showcase": "Use categories to reduce choice overload and help shoppers find the right path quickly.",
  "rich-text": "Use short paragraphs or bullets to explain why shoppers should trust this store.",
  countdown: "Use countdowns for real deadlines only. Fake urgency can hurt trust fast.",
  "social-feed": "Show real product-in-use or customer-style photos when possible, not generic decoration.",
  "video-reel": "Use video to demonstrate texture, scale, taste, motion, or proof that photos cannot carry alone.",
  "faq-accordion": "Answer the questions that block purchase: delivery, payment, returns, sizing, and support.",
  "trust-badges": "Put practical reassurance here: delivery, payment, exchange, support, and authenticity.",
  testimonials: "Specific reviews beat generic praise. Mention product quality, delivery, or support.",
  "recently-viewed": "This helps returning shoppers pick up where they left off. Keep the title simple.",
};

function getProps(block: StorePageBlock): Record<string, unknown> {
  return block.props as Record<string, unknown>;
}

function getObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? "")) : [];
}

function renderCoach(block: StorePageBlock) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Section Coach</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{sectionCoachTips[block.type]}</p>
    </div>
  );
}

function DetailsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-lg border border-border bg-muted/20 p-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">{title}</summary>
      {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </details>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      {title ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p> : null}
      {children}
    </div>
  );
}

function Field({
  blockId,
  config,
  value,
  updateBlockProps,
}: {
  blockId: string;
  config: FieldConfig;
  value: unknown;
  updateBlockProps: (blockId: string, patch: Record<string, unknown>) => void;
}) {
  const nextValue = String(value ?? "");

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{config.label}</Label>
      {config.type === "select" ? (
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          value={nextValue || config.options?.[0]?.value || ""}
          onChange={(event) => updateBlockProps(blockId, { [config.key]: event.target.value })}
        >
          {config.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : config.multiline ? (
        <Textarea
          rows={3}
          value={nextValue}
          placeholder={config.placeholder}
          onChange={(event) => updateBlockProps(blockId, { [config.key]: event.target.value })}
        />
      ) : (
        <Input
          type={config.type ?? "text"}
          value={nextValue}
          placeholder={config.placeholder}
          onChange={(event) => {
            updateBlockProps(blockId, {
              [config.key]: config.type === "number" ? Number(event.target.value || 0) : event.target.value,
            });
          }}
        />
      )}
    </div>
  );
}

function RepeatableListEditor({
  addLabel,
  description,
  emptyText,
  fields,
  items,
  onAdd,
  onMove,
  onRemove,
  onUpdate,
  title,
}: {
  addLabel: string;
  description: string;
  emptyText: string;
  fields: RepeatableFieldConfig[];
  items: Record<string, unknown>[];
  onAdd: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Record<string, unknown>) => void;
  title: string;
}) {
  return (
    <DetailsGroup title={`${title} (${items.length})`} description={description}>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            {emptyText}
          </p>
        ) : null}
        {items.map((item, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Item {index + 1}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === 0}
                  onClick={() => onMove(index, -1)}
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === items.length - 1}
                  onClick={() => onMove(index, 1)}
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onRemove(index)}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3">
              {fields.map((field) => {
                const value = item[field.key];

                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-sm">{field.label}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        rows={3}
                        value={String(value ?? "")}
                        placeholder={field.placeholder}
                        onChange={(event) => onUpdate(index, { [field.key]: event.target.value })}
                      />
                    ) : field.type === "select" ? (
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        value={String(value ?? field.options?.[0]?.value ?? "")}
                        onChange={(event) => onUpdate(index, { [field.key]: event.target.value })}
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={field.type === "number" ? "number" : "text"}
                        min={field.type === "number" ? 1 : undefined}
                        max={field.type === "number" ? 5 : undefined}
                        value={String(value ?? "")}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          onUpdate(index, {
                            [field.key]: field.type === "number" ? Number(event.target.value || 0) : event.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {addLabel}
        </Button>
      </div>
    </DetailsGroup>
  );
}

function MediaField({
  accept = "image/*",
  folder,
  label,
  onChange,
  resourceType = "image",
  storeId,
  value,
}: {
  accept?: string;
  folder: string;
  label: string;
  onChange: (url: string) => void;
  resourceType?: "image" | "video" | "auto";
  storeId: string;
  value: unknown;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <CloudinaryUpload
        value={String(value ?? "")}
        onChange={onChange}
        storeId={storeId}
        folder={folder}
        accept={accept}
        resourceType={resourceType}
        label={label}
      />
      <p className="text-xs leading-5 text-muted-foreground">
        Upload from your device, choose from the media library, or paste a URL.
      </p>
    </div>
  );
}

export function BasicBlockMiniEditor({ block, storeId, updateBlockProps, updateBlockMeta }: BasicBlockMiniEditorProps) {
  const props = getProps(block);
  const { data: products = [] } = useProducts(storeId);
  const { data: productCategories = [] } = useProductCategories(storeId);
  const productTypeOptions = useMemo(() => {
    return Array.from(new Set(products.map((product) => String(product.type ?? "")).filter(Boolean))).sort();
  }, [products]);
  const productCategoryOptions = useMemo(() => {
    const fromCategoryRows = productCategories.map((category) => String(category.name ?? "")).filter(Boolean);
    const fromProducts = products.map((product) => String(product.category ?? "")).filter(Boolean);
    return Array.from(new Set([...fromCategoryRows, ...fromProducts])).sort();
  }, [productCategories, products]);

  const updateArrayItem = (key: string, index: number, patch: Record<string, unknown>) => {
    const currentItems = getObjectArray(props[key]);
    updateBlockProps(block.id, {
      [key]: currentItems.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  };

  const removeArrayItem = (key: string, index: number) => {
    const currentItems = getObjectArray(props[key]);
    updateBlockProps(block.id, { [key]: currentItems.filter((_, itemIndex) => itemIndex !== index) });
  };

  const addArrayItem = (key: string, item: Record<string, unknown>) => {
    const currentItems = getObjectArray(props[key]);
    updateBlockProps(block.id, { [key]: [...currentItems, item] });
  };

  const moveArrayItem = (key: string, index: number, direction: -1 | 1) => {
    const currentItems = getObjectArray(props[key]);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= currentItems.length) return;

    const nextItems = [...currentItems];
    const [item] = nextItems.splice(index, 1);
    if (!item) return;
    nextItems.splice(nextIndex, 0, item);
    updateBlockProps(block.id, { [key]: nextItems });
  };

  const renderFields = (fields: FieldConfig[]) => (
    <div className="grid gap-3">
      {fields.map((field) => (
        <Field
          key={field.key}
          blockId={block.id}
          config={field}
          value={props[field.key]}
          updateBlockProps={updateBlockProps}
        />
      ))}
    </div>
  );

  let editor;

  switch (block.type) {
    case "hero":
      editor = (
        <div className="grid gap-4">
          <FieldGroup title="Essentials">
            {renderFields([
              { key: "title", label: "Headline" },
              { key: "highlight", label: "Highlighted Word" },
              { key: "subtitle", label: "Supporting Copy", multiline: true },
              { key: "ctaText", label: "Main Button Text" },
            ])}
          </FieldGroup>
          <DetailsGroup title="Label, links and media" description="Useful when the hero needs a campaign label, second action, or custom image.">
            {renderFields([
              { key: "tagline", label: "Small Label", placeholder: "New season, Fresh today, Eid drop..." },
              { key: "ctaLink", label: "Main Button Link" },
              { key: "secondaryCtaText", label: "Second Button Text" },
              { key: "secondaryCtaLink", label: "Second Button Link" },
            ])}
            <div className="mt-3">
              <MediaField
                label="Hero Image or Video"
                value={props.mediaUrl}
                onChange={(url) => updateBlockProps(block.id, { mediaUrl: url })}
                storeId={storeId}
                folder="cms/hero"
                accept="image/*,video/*"
                resourceType="auto"
              />
            </div>
          </DetailsGroup>
        </div>
      );
      break;
    case "promo-banner":
      editor = (
        <div className="grid gap-4">
          {renderFields([
            { key: "title", label: "Promo Title" },
            { key: "subtitle", label: "Promo Details", multiline: true },
            { key: "ctaText", label: "Button Text" },
          ])}
          <DetailsGroup title="Badge and link">
            {renderFields([
              { key: "badgeText", label: "Small Badge" },
              { key: "ctaLink", label: "Button Link" },
            ])}
          </DetailsGroup>
        </div>
      );
      break;
    case "featured-products":
      editor = (
        <div className="grid gap-4">
          <FieldGroup title="Essentials">
            {renderFields([
              { key: "title", label: "Section Title" },
              { key: "limit", label: "Products To Show", type: "number" },
            ])}
          </FieldGroup>
          <DetailsGroup title="Product source" description="Choose which products this section should pull from. If a category or type has no products yet, add products first.">
            <div className="grid gap-3">
              {renderFields([
                {
                  key: "source",
                  label: "Show Products From",
                  type: "select",
                  options: [
                    { label: "Featured first, then all products", value: "featured-or-all" },
                    { label: "Featured products only", value: "featured" },
                    { label: "All available products", value: "all" },
                    { label: "Newest products", value: "newest" },
                    { label: "One category", value: "category" },
                    { label: "One product type", value: "type" },
                  ],
                },
              ])}
              {props.source === "category" ? (
                <Field
                  blockId={block.id}
                  config={{
                    key: "category",
                    label: "Category",
                    type: "select",
                    options: productCategoryOptions.length > 0
                      ? productCategoryOptions.map((category) => ({ label: category, value: category }))
                      : [{ label: "No categories yet", value: "" }],
                  }}
                  value={props.category}
                  updateBlockProps={updateBlockProps}
                />
              ) : null}
              {props.source === "type" ? (
                <Field
                  blockId={block.id}
                  config={{
                    key: "productType",
                    label: "Product Type",
                    type: "select",
                    options: productTypeOptions.length > 0
                      ? productTypeOptions.map((type) => ({ label: type, value: type }))
                      : [{ label: "No product types yet", value: "" }],
                  }}
                  value={props.productType}
                  updateBlockProps={updateBlockProps}
                />
              ) : null}
            </div>
          </DetailsGroup>
          <DetailsGroup title="Small label">
            {renderFields([
              { key: "tagline", label: "Small Label" },
            ])}
          </DetailsGroup>
        </div>
      );
      break;
    case "category-showcase":
      editor = (
        <div className="grid gap-4">
          {renderFields([
            { key: "tagline", label: "Small Label" },
            { key: "title", label: "Section Title" },
          ])}
          <DetailsGroup title="Category source" description="Pick the navigation style shoppers should see in this section.">
            {renderFields([
              {
                key: "source",
                label: "Show Navigation For",
                type: "select",
                options: [
                  { label: "Auto choose best available", value: "auto" },
                  { label: "Product categories", value: "categories" },
                  { label: "Product types", value: "types" },
                ],
              },
              { key: "limit", label: "Items To Show", type: "number" },
            ])}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Found {productCategoryOptions.length} categor{productCategoryOptions.length === 1 ? "y" : "ies"} and {productTypeOptions.length} product type{productTypeOptions.length === 1 ? "" : "s"} in this store.
            </p>
          </DetailsGroup>
        </div>
      );
      break;
    case "recently-viewed":
      editor = renderFields([{ key: "title", label: "Section Title" }]);
      break;
    case "rich-text":
      editor = (
        <div className="grid gap-4">
          {renderFields([{ key: "title", label: "Heading" }])}
          <div className="space-y-1.5">
            <Label className="text-sm">Body Copy</Label>
            <TiptapRichTextEditor
              value={props.body as RichTextDoc | string}
              onChange={(doc) => updateBlockProps(block.id, { body: doc })}
            />
          </div>
          <DetailsGroup title="Label and alignment">
            {renderFields([
              { key: "eyebrow", label: "Small Label" },
              {
                key: "align",
                label: "Text Alignment",
                type: "select",
                options: [
                  { label: "Centered", value: "center" },
                  { label: "Left aligned", value: "left" },
                ],
              },
            ])}
          </DetailsGroup>
        </div>
      );
      break;
    case "countdown":
      editor = (
        <div className="grid gap-4">
          {renderFields([
            { key: "title", label: "Countdown Title" },
            { key: "subtitle", label: "Countdown Details", multiline: true },
          ])}
          <DetailsGroup title="Deadline and button">
            {renderFields([
              { key: "endDate", label: "End Date", placeholder: "2026-12-31T23:59:59" },
              { key: "ctaText", label: "Button Text" },
              { key: "ctaLink", label: "Button Link" },
            ])}
          </DetailsGroup>
        </div>
      );
      break;
    case "social-feed": {
      const images = getStringArray(props.images);
      editor = (
        <div className="grid gap-4">
          {renderFields([
            { key: "title", label: "Section Title" },
            { key: "subtitle", label: "Short Description", multiline: true },
          ])}
          <DetailsGroup title={`Social images (${images.length})`} description="Keep this short and real: product-in-use, customer-style, or behind-the-scenes images.">
            {images.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                Upload real product, customer, or behind-the-scenes images to make this section feel alive.
              </p>
            ) : null}
            {images.map((image, index) => (
              <div key={`${image}-${index}`} className="grid gap-2 rounded-lg border border-border bg-background/60 p-3">
                <MediaField
                  label={`Image ${index + 1}`}
                  value={image}
                  onChange={(url) => updateBlockProps(block.id, {
                    images: images.map((item, itemIndex) => (itemIndex === index ? url : item)),
                  })}
                  storeId={storeId}
                  folder="cms/social"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-self-start text-destructive hover:text-destructive"
                  onClick={() => updateBlockProps(block.id, { images: images.filter((_, itemIndex) => itemIndex !== index) })}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Image
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => updateBlockProps(block.id, { images: [...images, ""] })}>
              <Plus className="mr-2 h-4 w-4" />
              Add Image
            </Button>
          </DetailsGroup>
        </div>
      );
      break;
    }
    case "video-reel":
      editor = (
        <div className="grid gap-4">
          {renderFields([{ key: "title", label: "Video Headline" }])}
          <DetailsGroup title="Video and button">
            <div className="grid gap-3">
              <MediaField
                label="Video"
                value={props.videoUrl}
                onChange={(url) => updateBlockProps(block.id, { videoUrl: url })}
                storeId={storeId}
                folder="cms/video"
                accept="video/*"
                resourceType="video"
              />
              {renderFields([
                { key: "ctaText", label: "Button Text" },
                { key: "ctaLink", label: "Button Link" },
              ])}
            </div>
          </DetailsGroup>
        </div>
      );
      break;
    case "faq-accordion": {
      const faqs = getObjectArray(props.faqs);
      editor = (
        <div className="grid gap-4">
          {renderFields([
            { key: "title", label: "FAQ Title" },
            { key: "subtitle", label: "FAQ Intro", multiline: true },
          ])}
          <RepeatableListEditor
            title="Questions"
            description="Add only the questions that block purchase decisions."
            emptyText="Add the questions shoppers ask before buying: delivery, payment, returns, sizing, and support."
            addLabel="Add Question"
            fields={[
              { key: "q", label: "Question", placeholder: "Do you offer cash on delivery?" },
              { key: "a", label: "Answer", type: "textarea", placeholder: "Yes, available in selected areas..." },
            ]}
            items={faqs}
            onAdd={() => addArrayItem("faqs", { q: "", a: "" })}
            onMove={(index, direction) => moveArrayItem("faqs", index, direction)}
            onRemove={(index) => removeArrayItem("faqs", index)}
            onUpdate={(index, patch) => updateArrayItem("faqs", index, patch)}
          />
        </div>
      );
      break;
    }
    case "trust-badges": {
      const badges = getObjectArray(props.badges);
      editor = (
        <div className="grid gap-4">
          {renderFields([{ key: "title", label: "Trust Section Title" }])}
          <RepeatableListEditor
            title="Trust badges"
            description="Use practical reassurances, not generic claims."
            emptyText="Add practical reassurances: delivery, payment, exchange, support, or authenticity."
            addLabel="Add Badge"
            fields={[
              { key: "label", label: "Badge Label", placeholder: "7-Day Return" },
              { key: "description", label: "Short Reassurance", type: "textarea", placeholder: "Easy exchange on unworn items." },
              {
                key: "icon",
                label: "Icon",
                type: "select",
                options: [
                  { label: "Shield", value: "shield" },
                  { label: "Delivery Truck", value: "truck" },
                  { label: "Payment", value: "payment" },
                  { label: "Returns", value: "returns" },
                  { label: "Support", value: "support" },
                ],
              },
            ]}
            items={badges}
            onAdd={() => addArrayItem("badges", { label: "", description: "", icon: "shield" })}
            onMove={(index, direction) => moveArrayItem("badges", index, direction)}
            onRemove={(index) => removeArrayItem("badges", index)}
            onUpdate={(index, patch) => updateArrayItem("badges", index, patch)}
          />
        </div>
      );
      break;
    }
    case "testimonials": {
      const reviews = getObjectArray(props.reviews);
      editor = (
        <div className="grid gap-4">
          {renderFields([
            { key: "title", label: "Testimonials Title" },
            { key: "subtitle", label: "Short Intro", multiline: true },
          ])}
          <RepeatableListEditor
            title="Reviews"
            description="Specific, believable quotes make this section stronger."
            emptyText="Add specific reviews that mention product quality, delivery, fit, taste, or support."
            addLabel="Add Review"
            fields={[
              { key: "name", label: "Customer Name", placeholder: "Ayesha Rahman" },
              { key: "rating", label: "Rating", type: "number" },
              { key: "comment", label: "Quote", type: "textarea", placeholder: "Delivery was fast and the fabric felt premium." },
            ]}
            items={reviews}
            onAdd={() => addArrayItem("reviews", { name: "", rating: 5, comment: "" })}
            onMove={(index, direction) => moveArrayItem("reviews", index, direction)}
            onRemove={(index) => removeArrayItem("reviews", index)}
            onUpdate={(index, patch) => updateArrayItem("reviews", index, patch)}
          />
        </div>
      );
      break;
    }
    default:
      editor = renderFields([
        { key: "title", label: "Title" },
        { key: "subtitle", label: "Description", multiline: true },
        { key: "ctaText", label: "Button Text" },
        { key: "ctaLink", label: "Button Link" },
      ].filter((field) => props[field.key] !== undefined));
  }

  return (
    <div className="space-y-4 pt-2">
      {renderCoach(block)}
      {editor}
      <div className="mt-4 space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Override Global Effects</Label>
          <Switch
            checked={block.effectOverride === true}
            onCheckedChange={(checked) => updateBlockMeta(block.id, { effectOverride: checked })}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Let this section use its own animation and hover behavior instead of the global effect defaults.
        </p>
      </div>
    </div>
  );
}
