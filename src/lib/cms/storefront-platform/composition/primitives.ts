import { z } from "zod";
import {
  COMPOSITION_LIMITS,
  compositionBindingFields,
  compositionDataSlotIds,
  type CompositionPrimitiveId,
} from "@/lib/cms/storefront-platform/composition/contracts";

const identifierSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const shortTextSchema = z.string().trim().min(1).max(240);
const bodyTextSchema = z.string().max(COMPOSITION_LIMITS.maxTextLength);

export const compositionBindingSchema = z.object({
  kind: z.literal("binding"),
  slotId: identifierSchema,
  field: z.enum(compositionBindingFields),
  fallback: z.string().max(500).optional(),
}).strict();

const safeHrefSchema = z.string().trim().min(1).max(2048).refine(
  (value) => value.startsWith("/")
    || value.startsWith("#")
    || value.startsWith("https://")
    || value.startsWith("mailto:")
    || value.startsWith("tel:"),
  "CTA href must be an internal path, fragment, HTTPS URL, mailto, or tel link",
);

const safeMediaSourceSchema = z.string().trim().min(1).max(2048).refine(
  (value) => value.startsWith("/") || value.startsWith("https://"),
  "Media source must be an internal path or HTTPS URL",
);

const boundTextSchema = z.union([shortTextSchema, compositionBindingSchema]);
const boundBodySchema = z.union([bodyTextSchema, compositionBindingSchema]);
const boundMediaSchema = z.union([safeMediaSourceSchema, compositionBindingSchema]);

const sectionPropsSchema = z.object({
  width: z.enum(["contained", "wide", "full"]).default("contained"),
  padding: z.enum(["none", "compact", "comfortable", "spacious"]).default("comfortable"),
  tone: z.enum(["default", "muted", "accent", "inverse"]).default("default"),
}).strict();

const containerPropsSchema = z.object({
  width: z.enum(["narrow", "content", "wide", "full"]).default("content"),
  align: z.enum(["start", "center", "end"]).default("center"),
}).strict();

const stackPropsSchema = z.object({
  gap: z.enum(["none", "xs", "sm", "md", "lg", "xl"]).default("md"),
  align: z.enum(["start", "center", "end", "stretch"]).default("stretch"),
}).strict();

const rowPropsSchema = z.object({
  gap: z.enum(["none", "xs", "sm", "md", "lg", "xl"]).default("md"),
  align: z.enum(["start", "center", "end", "stretch"]).default("center"),
  justify: z.enum(["start", "center", "end", "between"]).default("start"),
  wrap: z.boolean().default(true),
}).strict();

const gridPropsSchema = z.object({
  mobileColumns: z.number().int().min(1).max(2).default(1),
  tabletColumns: z.number().int().min(1).max(4).default(2),
  desktopColumns: z.number().int().min(1).max(6).default(3),
  gap: z.enum(["xs", "sm", "md", "lg", "xl"]).default("md"),
}).strict();

const columnsPropsSchema = z.object({
  ratio: z.enum(["1:1", "2:1", "1:2", "3:2", "2:3"]).default("1:1"),
  mobileOrder: z.enum(["source", "reverse"]).default("source"),
  gap: z.enum(["sm", "md", "lg", "xl"]).default("lg"),
}).strict();

const surfacePropsSchema = z.object({
  tone: z.enum(["default", "muted", "accent", "inverse"]).default("default"),
  border: z.enum(["none", "subtle", "strong"]).default("subtle"),
  radius: z.enum(["none", "sm", "md", "lg", "xl"]).default("md"),
  elevation: z.enum(["none", "soft", "raised"]).default("none"),
  padding: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
}).strict();

const headingPropsSchema = z.object({
  text: boundTextSchema,
  level: z.enum(["h2", "h3", "h4"]).default("h2"),
  align: z.enum(["left", "center", "right"]).default("left"),
  emphasis: z.enum(["normal", "display"]).default("normal"),
}).strict();

const textPropsSchema = z.object({
  text: boundBodySchema,
  style: z.enum(["body", "lead", "caption"]).default("body"),
  align: z.enum(["left", "center", "right"]).default("left"),
}).strict();

const richTextPropsSchema = z.object({
  paragraphs: z.array(z.string().max(1200)).min(1).max(COMPOSITION_LIMITS.maxRichTextParagraphs),
  align: z.enum(["left", "center"]).default("left"),
}).strict();

const badgePropsSchema = z.object({
  text: boundTextSchema,
  tone: z.enum(["neutral", "accent", "success", "warning"]).default("neutral"),
}).strict();

const dividerPropsSchema = z.object({
  strength: z.enum(["subtle", "standard", "strong"]).default("subtle"),
  spacing: z.enum(["sm", "md", "lg"]).default("md"),
}).strict();

const imagePropsSchema = z.object({
  src: boundMediaSchema,
  alt: z.union([z.string().max(300), compositionBindingSchema]).default(""),
  aspect: z.enum(["auto", "1:1", "4:5", "3:2", "16:9"]).default("auto"),
  fit: z.enum(["cover", "contain"]).default("cover"),
  focalPoint: z.enum(["center", "top", "bottom", "left", "right"]).default("center"),
}).strict();

const mediaPropsSchema = z.object({
  kind: z.enum(["image", "video"]),
  src: boundMediaSchema,
  alt: z.string().max(300).default(""),
  aspect: z.enum(["auto", "1:1", "4:5", "3:2", "16:9"]).default("auto"),
  fit: z.enum(["cover", "contain"]).default("cover"),
  autoplay: z.boolean().default(false),
}).strict();

const ctaGroupPropsSchema = z.object({
  align: z.enum(["left", "center", "right"]).default("left"),
  actions: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    href: safeHrefSchema,
    style: z.enum(["primary", "secondary", "ghost"]).default("primary"),
  }).strict()).min(1).max(COMPOSITION_LIMITS.maxActions),
}).strict();

const decorativeLayerPropsSchema = z.object({
  kind: z.enum(["shape", "gradient", "pattern", "line"]),
  placement: z.enum(["background", "top-left", "top-right", "bottom-left", "bottom-right"]).default("background"),
  tone: z.enum(["subtle", "accent", "contrast"]).default("subtle"),
  intensity: z.enum(["low", "medium"]).default("low"),
}).strict();

const dataSlotPropsSchema = z.object({
  slot: z.enum(compositionDataSlotIds),
  limit: z.number().int().min(1).max(COMPOSITION_LIMITS.maxDataSlotItems).default(6),
  source: z.enum(["default", "featured", "all", "newest", "category", "type", "manual"]).default("default"),
  category: z.string().max(120).optional(),
  productType: z.string().max(120).optional(),
}).strict();

export interface CompositionPrimitiveDefinition {
  id: CompositionPrimitiveId;
  label: string;
  category: "layout" | "content" | "media" | "action" | "decoration" | "data";
  allowsChildren: boolean;
  maxChildren: number;
  propsSchema: z.ZodTypeAny;
}

const primitiveDefinitions: CompositionPrimitiveDefinition[] = [
  { id: "section", label: "Section", category: "layout", allowsChildren: true, maxChildren: 6, propsSchema: sectionPropsSchema },
  { id: "container", label: "Container", category: "layout", allowsChildren: true, maxChildren: COMPOSITION_LIMITS.maxChildrenPerNode, propsSchema: containerPropsSchema },
  { id: "stack", label: "Stack", category: "layout", allowsChildren: true, maxChildren: COMPOSITION_LIMITS.maxChildrenPerNode, propsSchema: stackPropsSchema },
  { id: "row", label: "Row", category: "layout", allowsChildren: true, maxChildren: COMPOSITION_LIMITS.maxChildrenPerNode, propsSchema: rowPropsSchema },
  { id: "grid", label: "Grid", category: "layout", allowsChildren: true, maxChildren: COMPOSITION_LIMITS.maxChildrenPerNode, propsSchema: gridPropsSchema },
  { id: "columns", label: "Columns", category: "layout", allowsChildren: true, maxChildren: 4, propsSchema: columnsPropsSchema },
  { id: "surface", label: "Surface", category: "layout", allowsChildren: true, maxChildren: COMPOSITION_LIMITS.maxChildrenPerNode, propsSchema: surfacePropsSchema },
  { id: "card", label: "Card", category: "layout", allowsChildren: true, maxChildren: 8, propsSchema: surfacePropsSchema },
  { id: "panel", label: "Panel", category: "layout", allowsChildren: true, maxChildren: 8, propsSchema: surfacePropsSchema },
  { id: "heading", label: "Heading", category: "content", allowsChildren: false, maxChildren: 0, propsSchema: headingPropsSchema },
  { id: "text", label: "Text", category: "content", allowsChildren: false, maxChildren: 0, propsSchema: textPropsSchema },
  { id: "rich-text", label: "Rich text", category: "content", allowsChildren: false, maxChildren: 0, propsSchema: richTextPropsSchema },
  { id: "badge", label: "Badge", category: "content", allowsChildren: false, maxChildren: 0, propsSchema: badgePropsSchema },
  { id: "divider", label: "Divider", category: "content", allowsChildren: false, maxChildren: 0, propsSchema: dividerPropsSchema },
  { id: "image", label: "Image", category: "media", allowsChildren: false, maxChildren: 0, propsSchema: imagePropsSchema },
  { id: "media", label: "Media", category: "media", allowsChildren: false, maxChildren: 0, propsSchema: mediaPropsSchema },
  { id: "cta-group", label: "CTA group", category: "action", allowsChildren: false, maxChildren: 0, propsSchema: ctaGroupPropsSchema },
  { id: "decorative-layer", label: "Decorative layer", category: "decoration", allowsChildren: false, maxChildren: 0, propsSchema: decorativeLayerPropsSchema },
  { id: "data-slot", label: "Data slot", category: "data", allowsChildren: true, maxChildren: 6, propsSchema: dataSlotPropsSchema },
];

export const compositionPrimitiveRegistry: readonly CompositionPrimitiveDefinition[] = primitiveDefinitions;

export function getCompositionPrimitiveDefinition(id: CompositionPrimitiveId): CompositionPrimitiveDefinition {
  const definition = compositionPrimitiveRegistry.find((item) => item.id === id);
  if (!definition) {
    throw new Error(`Unknown composition primitive: ${id}`);
  }
  return definition;
}
