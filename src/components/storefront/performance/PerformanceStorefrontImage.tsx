import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import {
  resolveStorefrontMediaPolicy,
  resolveStorefrontObjectPosition,
  type StorefrontMediaRole,
} from "@/lib/storefront-platform/media/media-policy";

export function PerformanceStorefrontImage({
  role,
  isLcp = false,
  focalPoint,
  style,
  ...props
}: React.ComponentProps<typeof SafeStorefrontImage> & {
  role: StorefrontMediaRole;
  isLcp?: boolean;
  focalPoint?: { x?: number | null; y?: number | null } | null;
}) {
  const policy = resolveStorefrontMediaPolicy({ role, isLcp });
  return (
    <SafeStorefrontImage
      {...props}
      priority={policy.priority}
      sizes={props.sizes ?? policy.sizes}
      style={{ objectPosition: resolveStorefrontObjectPosition(focalPoint), ...style }}
    />
  );
}
