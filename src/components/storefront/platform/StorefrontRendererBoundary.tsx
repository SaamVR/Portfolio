"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import type { StorefrontRendererImplementationId } from "@/lib/cms/storefront-platform/rendering/renderer-registry";

type StorefrontRendererProps = {
  block: StorePageBlock;
  template: StorefrontTemplateDefinition;
};

const FashionV3BlockRenderer = dynamic<StorefrontRendererProps>(
  () => import("@/components/storefront/fashion-v3/FashionV3BlockRenderer").then((module) => module.FashionV3BlockRenderer),
);

const ThreadsBlockRenderer = dynamic<StorefrontRendererProps>(
  () => import("@/components/storefront/threads/ThreadsBlockRenderer").then((module) => module.ThreadsBlockRenderer),
);

const rendererComponents: Readonly<Record<StorefrontRendererImplementationId, ComponentType<StorefrontRendererProps>>> = {
  generic: StorefrontBlockRenderer,
  "fashion-v3": FashionV3BlockRenderer,
  "threads-earthy": ThreadsBlockRenderer,
};

export function StorefrontRendererBoundary({
  implementationId,
  block,
  template,
}: StorefrontRendererProps & { implementationId: StorefrontRendererImplementationId }) {
  const Renderer = rendererComponents[implementationId];
  return <Renderer block={block} template={template} />;
}
