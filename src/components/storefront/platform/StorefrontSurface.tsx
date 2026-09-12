import type { HTMLAttributes } from "react";

export type StorefrontSurfaceTone = "default" | "muted" | "inverse" | "brand";

export function StorefrontSurface({
  tone = "default",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: StorefrontSurfaceTone;
  interactive?: boolean;
}) {
  return (
    <div
      {...props}
      data-store-surface="true"
      data-store-surface-tone={tone}
      data-store-motion={interactive ? "true" : undefined}
    />
  );
}
