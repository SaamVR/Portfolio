"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  canUseNextImageOptimizer,
  resolveStorefrontImageSrc,
  shouldBypassNextImageOptimizer,
} from "@/lib/storefront-image";

type SafeStorefrontImageProps = {
  src?: string | null;
  alt?: string | null;
  fallbackSrc?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  onLoad?: () => void;
};

export function SafeStorefrontImage({
  src,
  alt,
  fallbackSrc,
  className,
  sizes,
  priority = false,
  fill = false,
  width,
  height,
  style,
  onLoad,
}: SafeStorefrontImageProps) {
  const normalizedFallback = useMemo(
    () => resolveStorefrontImageSrc(fallbackSrc ?? "/placeholder.svg"),
    [fallbackSrc],
  );
  const initialSrc = useMemo(
    () => resolveStorefrontImageSrc(src, normalizedFallback),
    [normalizedFallback, src],
  );
  const [currentSrc, setCurrentSrc] = useState(initialSrc);

  useEffect(() => {
    setCurrentSrc(initialSrc);
  }, [initialSrc]);

  const handleError = () => {
    setCurrentSrc((previous) => {
      if (previous !== normalizedFallback) {
        return normalizedFallback;
      }

      if (previous !== "/placeholder.svg") {
        return "/placeholder.svg";
      }

      return previous;
    });
  };

  const resolvedAlt = alt?.trim() || "Storefront image";
  const shouldUseNativeImage = shouldBypassNextImageOptimizer(currentSrc)
    || !canUseNextImageOptimizer(currentSrc)
    || (!fill && (!width || !height));
  const sharedClassName = cn(fill && "absolute inset-0 h-full w-full", className);

  if (shouldUseNativeImage) {
    return (
      <img
        src={currentSrc}
        alt={resolvedAlt}
        className={sharedClassName}
        loading={priority ? "eager" : "lazy"}
        style={style}
        onLoad={onLoad}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={resolvedAlt}
      className={sharedClassName}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      style={style}
      onLoad={onLoad}
      onError={handleError}
      unoptimized={shouldBypassNextImageOptimizer(currentSrc)}
    />
  );
}
