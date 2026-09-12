"use client";

import type { CSSProperties, ReactNode } from "react";
import Layout from "@/components/Layout";
import { ThreadsShell } from "@/components/storefront/threads/ThreadsShell";
import type { StorefrontTemplateDefinition, StorefrontTemplateId } from "@/lib/cms/storefront-templates";

function buildTemplateShellStyle(template: StorefrontTemplateDefinition): CSSProperties {
  return {
    ["--storefront-template-radius" as string]: template.presentation.borderRadius,
    ["--storefront-template-density" as string]: template.presentation.spacingDensity,
    ["--storefront-template-card-style" as string]: template.presentation.cardStyle,
    ["--storefront-template-image-ratio" as string]: template.presentation.imageRatio,
    ["--storefront-template-type-scale" as string]: template.presentation.typographyScale,
    ...template.presentation.colorTokens,
  };
}

export function StorefrontShell({
  children,
  templateId,
  template,
  embedded = false,
}: {
  children: ReactNode;
  templateId: StorefrontTemplateId;
  template: StorefrontTemplateDefinition;
  embedded?: boolean;
}) {
  if (templateId === "threads") {
    return <ThreadsShell embedded={embedded} contentAsMain={false}>{children}</ThreadsShell>;
  }

  const content = (
    <div
      data-storefront-template={templateId}
      data-storefront-card-style={template.presentation.cardStyle}
      data-storefront-density={template.presentation.spacingDensity}
      data-storefront-image-ratio={template.presentation.imageRatio}
      data-storefront-typography-scale={template.presentation.typographyScale}
      data-storefront-embedded-preview={embedded ? "true" : "false"}
      className={embedded ? "isolate overflow-hidden bg-background" : undefined}
      style={buildTemplateShellStyle(template)}
    >
      {children}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Layout>
      {content}
    </Layout>
  );
}
