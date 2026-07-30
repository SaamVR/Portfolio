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
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import type { RichTextDoc, StorePageBlock } from "@/lib/cms/schema";
import { getBasicBlockCoach } from "@/lib/cms/storefront-editor-registry";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

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

function getProps(block: StorePageBlock): Record<string, unknown> {
  return block.props as Record<string, unknown>;
}

function getObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? "")) : [];
}

function renderCoach(tip: string) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Section Coach</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{tip}</p>
    </div>
  );
}

function renderPriorityCard(title: string, labels: string[]) {
  if (labels.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {labels.map((label) => (
          <span key={label} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            {label}
          </span>
        ))}
      </div>
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
  const { data: storefrontProfile } = useSiteSettings<Record<string, unknown>>("storefront_profile", storeId);
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    blueprintId: typeof storefrontProfile?.blueprint_id === "string" ? storefrontProfile.blueprint_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const blockCoach = getBasicBlockCoach(templateId, block.type);
  const productTypeOptions = useMemo(() => {
    return Array.from(new Set(products.map((product) => String(product.type ?? "")).filter(Boolean))).sort();
  }, [products]);
  const productCategoryOptions = useMemo(() => {
    const fromCategoryRows = productCategories.map((category) => String(category.name ?? "")).filter(Boolean);
    const fromProducts = products.map((product) => String(product.category ?? "")).filter(Boolean);
    return Array.from(new Set([...fromCategoryRows, ...fromProducts])).sort();
  }, [productCategories, products]);
  const fieldLabelMap = useMemo<Record<string, string>>(() => ({
    title: blockCoach.titleOverrides?.title ?? "Section Title",
    subtitle: blockCoach.titleOverrides?.subtitle ?? "Supporting Copy",
    tagline: blockCoach.titleOverrides?.tagline ?? "Small Label",
    ctaText: blockCoach.titleOverrides?.ctaText ?? "Main Button Text",
    source: block.type === "category-showcase" ? "Navigation Source" : "Product Source",
    limit: blockCoach.titleOverrides?.limit ?? "Items To Show",
    faqs: "Questions",
    badges: "Trust Badges",
    reviews: "Reviews",
  }), [block.type, blockCoach.titleOverrides]);
  const priorityLabels = (blockCoach.priorityFields ?? []).map((fieldKey) => fieldLabelMap[fieldKey] ?? fieldKey);

  const getFeaturedSourceOptions = () => {
    if (templateId === "food") {
      return [
        { label: "Popular dishes first", value: "featured-or-all" },
        { label: "Bestsellers only", value: "featured" },
        { label: "All live dishes", value: "all" },
        { label: "Newest dishes", value: "newest" },
        { label: "One menu category", value: "category" },
        { label: "One menu type", value: "type" },
      ];
    }

    if (templateId === "subscriptions") {
      return [
        { label: "Best plans first", value: "featured-or-all" },
        { label: "Featured plans only", value: "featured" },
        { label: "All live plans", value: "all" },
        { label: "Newest plans", value: "newest" },
        { label: "One plan category", value: "category" },
        { label: "One account type", value: "type" },
      ];
    }

    if (templateId === "hotel") {
      return [
        { label: "Best rooms first", value: "featured-or-all" },
        { label: "Featured rooms only", value: "featured" },
        { label: "All live rooms", value: "all" },
        { label: "Newest rooms", value: "newest" },
        { label: "One room category", value: "category" },
        { label: "One room type", value: "type" },
      ];
    }

    if (templateId === "real-estate") {
      return [
        { label: "Best listings first", value: "featured-or-all" },
        { label: "Featured listings only", value: "featured" },
        { label: "All live listings", value: "all" },
        { label: "Newest listings", value: "newest" },
        { label: "One property category", value: "category" },
        { label: "One listing type", value: "type" },
      ];
    }

    if (templateId === "inquiry-catalog") {
      return [
        { label: "Most requested items first", value: "featured-or-all" },
        { label: "Quote highlights only", value: "featured" },
        { label: "All live quote items", value: "all" },
        { label: "Newest quote items", value: "newest" },
        { label: "One buyer category", value: "category" },
        { label: "One product type", value: "type" },
      ];
    }

    return [
      { label: "Featured first, then all products", value: "featured-or-all" },
      { label: "Featured products only", value: "featured" },
      { label: "All available products", value: "all" },
      { label: "Newest products", value: "newest" },
      { label: "One category", value: "category" },
      { label: "One product type", value: "type" },
    ];
  };

  const getFeaturedSourceLabel = () => {
    if (templateId === "food") return "Show Dishes From";
    if (templateId === "subscriptions") return "Show Plans From";
    if (templateId === "hotel") return "Show Rooms From";
    if (templateId === "real-estate") return "Show Listings From";
    if (templateId === "inquiry-catalog") return "Show Quote Items From";
    if (templateId === "service") return "Show Services From";
    return "Show Products From";
  };

  const getCategorySourceLabel = () => {
    if (templateId === "food") return "Show Menu Navigation For";
    if (templateId === "beauty") return "Show Discovery Navigation For";
    if (templateId === "subscriptions") return "Show Plan Navigation For";
    if (templateId === "hotel") return "Show Room Navigation For";
    if (templateId === "real-estate") return "Show Listing Navigation For";
    return "Show Navigation For";
  };

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
              { key: "title", label: blockCoach.titleOverrides?.title ?? "Headline" },
              { key: "highlight", label: "Highlighted Word" },
              { key: "subtitle", label: blockCoach.titleOverrides?.subtitle ?? "Supporting Copy", multiline: true },
              { key: "ctaText", label: blockCoach.titleOverrides?.ctaText ?? "Main Button Text" },
            ])}
          </FieldGroup>
          <DetailsGroup title="Label, links and media" description="Useful when the hero needs a campaign label, second action, or custom image.">
            {renderFields([
              { key: "tagline", label: blockCoach.titleOverrides?.tagline ?? "Small Label", placeholder: "New season, Fresh today, Eid drop..." },
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
              { key: "title", label: blockCoach.titleOverrides?.title ?? "Section Title" },
              { key: "limit", label: blockCoach.titleOverrides?.limit ?? "Products To Show", type: "number" },
            ])}
          </FieldGroup>
          <DetailsGroup
            title={templateId === "food" ? "Dish source" : templateId === "subscriptions" ? "Plan source" : templateId === "hotel" ? "Room source" : templateId === "real-estate" ? "Listing source" : templateId === "inquiry-catalog" ? "Quote source" : templateId === "service" ? "Service source" : "Product source"}
            description={
              templateId === "food"
                ? "Choose which dishes this section should spotlight. If a menu category is empty, add dishes first."
                : templateId === "subscriptions"
                  ? "Choose which plans this section should compare or highlight first."
                  : templateId === "hotel"
                    ? "Choose which room group this section should guide guests toward first."
                    : templateId === "real-estate"
                      ? "Choose which listings this section should surface first for buyers or renters."
                      : templateId === "inquiry-catalog"
                        ? "Choose which quote-led items this section should push buyers toward first."
                        : templateId === "service"
                          ? "Choose which services or packages this section should highlight first."
                          : "Choose which products this section should pull from. If a category or type has no products yet, add products first."
            }
          >
            <div className="grid gap-3">
              {renderFields([
                {
                  key: "source",
                  label: getFeaturedSourceLabel(),
                  type: "select",
                  options: getFeaturedSourceOptions(),
                },
              ])}
              {props.source === "category" ? (
                <Field
                  blockId={block.id}
                  config={{
                    key: "category",
                    label: templateId === "food" ? "Menu Category" : templateId === "hotel" ? "Room Category" : templateId === "real-estate" ? "Property Category" : templateId === "subscriptions" ? "Plan Category" : templateId === "inquiry-catalog" ? "Buyer Category" : "Category",
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
                    label: templateId === "food" ? "Menu Type" : templateId === "subscriptions" ? "Account / Plan Type" : templateId === "hotel" ? "Room Type" : templateId === "real-estate" ? "Listing Type" : "Product Type",
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
            { key: "tagline", label: blockCoach.titleOverrides?.tagline ?? "Small Label" },
            { key: "title", label: blockCoach.titleOverrides?.title ?? "Section Title" },
          ])}
          <DetailsGroup
            title={templateId === "food" ? "Menu navigation" : templateId === "beauty" ? "Discovery navigation" : templateId === "subscriptions" ? "Plan navigation" : templateId === "hotel" ? "Room navigation" : templateId === "real-estate" ? "Listing navigation" : "Category source"}
            description={
              templateId === "food"
                ? "Pick the menu path guests should use first: categories, dish types, or an automatic blend."
                : templateId === "beauty"
                  ? "Pick whether shoppers should browse by category or product type first."
                  : templateId === "subscriptions"
                    ? "Pick the clearest plan discovery path for new buyers."
                    : templateId === "hotel"
                      ? "Pick the room discovery path guests should see first."
                      : templateId === "real-estate"
                        ? "Pick the listing navigation style that helps visitors scan faster."
                        : "Pick the navigation style shoppers should see in this section."
            }
          >
            {renderFields([
              {
                key: "source",
                label: getCategorySourceLabel(),
                type: "select",
                options: [
                  { label: "Auto choose best available", value: "auto" },
                  { label: "Product categories", value: "categories" },
                  { label: "Product types", value: "types" },
                ],
              },
              { key: "limit", label: blockCoach.titleOverrides?.limit ?? "Items To Show", type: "number" },
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
      const faqTitle = templateId === "hotel"
        ? "Guest questions"
        : templateId === "service"
          ? "Service questions"
          : templateId === "real-estate"
            ? "Buyer and renter questions"
            : templateId === "food"
              ? "Order questions"
              : "Questions";
      editor = (
        <div className="grid gap-4">
          {renderFields([
            { key: "title", label: "FAQ Title" },
            { key: "subtitle", label: "FAQ Intro", multiline: true },
          ])}
          <RepeatableListEditor
            title={faqTitle}
            description={templateId === "service" || templateId === "booking" || templateId === "hotel"
              ? "Add the questions that block inquiry, booking, or first contact."
              : templateId === "real-estate"
                ? "Add the questions that block viewings, contact, or listing trust."
                : "Add only the questions that block purchase decisions."}
            emptyText={templateId === "food"
              ? "Add the questions guests ask before ordering: delivery, payment, spice level, allergens, and support."
              : templateId === "hotel"
                ? "Add the questions guests ask before booking: location, check-in, room details, cancellation, and support."
                : templateId === "real-estate"
                  ? "Add the questions visitors ask before contacting: location, availability, pricing, visits, and support."
                  : "Add the questions shoppers ask before buying: delivery, payment, returns, sizing, and support."}
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
      const trustTitle = templateId === "food"
        ? "Service trust points"
        : templateId === "hotel"
          ? "Guest confidence points"
          : templateId === "real-estate"
            ? "Listing trust points"
            : templateId === "subscriptions"
              ? "Plan trust points"
              : "Trust badges";
      editor = (
        <div className="grid gap-4">
          {renderFields([{ key: "title", label: "Trust Section Title" }])}
          <RepeatableListEditor
            title={trustTitle}
            description={templateId === "real-estate"
              ? "Use practical reassurances about listings, response, support, and transparency."
              : templateId === "hotel"
                ? "Use practical reassurances about guest experience, support, and booking confidence."
                : "Use practical reassurances, not generic claims."}
            emptyText={templateId === "subscriptions"
              ? "Add practical reassurances: activation speed, account support, renewal clarity, or device compatibility."
              : templateId === "food"
                ? "Add practical reassurances: freshness, hygiene, delivery timing, payment, or support."
                : "Add practical reassurances: delivery, payment, exchange, support, or authenticity."}
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
      const reviewTitle = templateId === "hotel"
        ? "Guest reviews"
        : templateId === "service" || templateId === "booking"
          ? "Client reviews"
          : templateId === "real-estate"
            ? "Buyer and renter reviews"
            : templateId === "food"
              ? "Guest reviews"
              : "Reviews";
      editor = (
        <div className="grid gap-4">
          {renderFields([
            { key: "title", label: "Testimonials Title" },
            { key: "subtitle", label: "Short Intro", multiline: true },
          ])}
          <RepeatableListEditor
            title={reviewTitle}
            description={templateId === "service" || templateId === "booking"
              ? "Specific, believable quotes about results, support, or experience make this section stronger."
              : templateId === "hotel"
                ? "Specific guest comments about stay, location, comfort, or support make this section stronger."
                : "Specific, believable quotes make this section stronger."}
            emptyText={templateId === "real-estate"
              ? "Add specific reviews that mention trust, responsiveness, listing clarity, or viewing support."
              : templateId === "food"
                ? "Add specific reviews that mention taste, freshness, portion size, speed, or support."
                : "Add specific reviews that mention product quality, delivery, fit, taste, or support."}
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
      {renderCoach(blockCoach.tip)}
      {renderPriorityCard(blockCoach.priorityLabel ?? "Start with these fields", priorityLabels)}
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
