"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";
import { useOptionalStore } from "@/components/storefront/store-context";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  aspectRatio?: "square" | "portrait" | "landscape";
}

function getTemplateGalleryAspect(templateId: ReturnType<typeof resolveStorefrontTemplateId>): ProductImageGalleryProps["aspectRatio"] {
  switch (templateId) {
    case "fashion":
    case "beauty":
    case "crafts":
      return "portrait";
    case "hotel":
    case "real-estate":
    case "booking":
    case "service":
      return "landscape";
    default:
      return "square";
  }
}

const ProductImageGallery = ({
  images,
  alt,
  aspectRatio,
}: ProductImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const currentStore = useOptionalStore();
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : currentStore?.slug ?? null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const resolvedAspect = aspectRatio ?? getTemplateGalleryAspect(templateId);
  const isEditorial = templateId === "fashion";
  const isBeauty = templateId === "beauty";
  const isTechnical = templateId === "electronics" || templateId === "digital-downloads";
  const isHospitality = templateId === "hotel" || templateId === "booking";
  const isProperty = templateId === "real-estate";
  const isArtisan = templateId === "crafts";

  const safeImages = Array.isArray(images) && images.length > 0 ? images : ["/placeholder.svg"];

  const handlePrev = () => {
    setActiveIndex((current) => (current === 0 ? safeImages.length - 1 : current - 1));
  };

  const handleNext = () => {
    setActiveIndex((current) => (current === safeImages.length - 1 ? 0 : current + 1));
  };

  useEffect(() => {
    if (!isFullscreen) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsFullscreen(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) => (current === 0 ? safeImages.length - 1 : current - 1));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => (current === safeImages.length - 1 ? 0 : current + 1));
        return;
      }
      if (event.key !== "Tab" || !lightboxRef.current) return;

      const focusable = Array.from(lightboxRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        lightboxRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === lightboxRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isFullscreen, safeImages.length]);

  const activeImage = safeImages[activeIndex];
  const aspectClass = resolvedAspect === "portrait"
    ? "aspect-[4/5] min-h-[400px] max-h-[680px]"
    : resolvedAspect === "landscape"
      ? "aspect-[4/3] min-h-[280px] max-h-[560px]"
      : "aspect-square min-h-[320px] max-h-[520px]";
  const frameClass = isEditorial
    ? "rounded-none border-foreground/15 bg-background p-2 shadow-none sm:p-3"
    : isBeauty
      ? "rounded-[2.5rem] border-primary/15 bg-primary/[0.035] p-4 shadow-[0_28px_80px_-48px_rgba(120,80,100,0.62)] sm:p-6"
      : isTechnical
        ? "rounded-xl border-foreground/20 bg-secondary/35 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.8)] sm:p-5"
        : isArtisan
          ? "rounded-[2rem_4rem_2rem_4rem] border-amber-900/15 bg-stone-50 p-4 shadow-[0_30px_80px_-52px_rgba(120,70,25,0.6)] dark:bg-stone-950/30 sm:p-6"
          : isHospitality || isProperty
            ? "rounded-2xl border-foreground/15 bg-secondary/20 p-2 shadow-[0_28px_75px_-48px_rgba(15,23,42,0.65)] sm:p-3"
            : "rounded-3xl border-border/80 bg-slate-50 p-4 shadow-sm dark:bg-card/40 sm:p-6";
  const thumbnailClass = isEditorial
    ? "rounded-none"
    : isTechnical
      ? "rounded-lg"
      : isArtisan
        ? "rounded-[1rem_1.75rem_1rem_1.75rem]"
        : "rounded-2xl";

  return (
    <div className="space-y-4" data-product-gallery data-gallery-aspect={resolvedAspect} data-gallery-template={templateId}>
      <div className={cn("group relative flex w-full items-center justify-center overflow-hidden border", aspectClass, frameClass)}>
        {safeImages.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={cn(
              "absolute inset-0 flex items-center justify-center p-3 transition-opacity duration-300 motion-reduce:transition-none sm:p-5",
              i === activeIndex ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
            )}
          >
            <img
              src={src}
              srcSet={src.startsWith("http") ? generateCloudinarySrcSet(src) : undefined}
              sizes="(max-width: 768px) 100vw, 50vw"
              alt={`${alt} - image ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className={cn(
                "h-auto max-h-full w-auto max-w-full object-contain drop-shadow-sm transition-transform duration-300 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none",
                isEditorial ? "rounded-none" : isTechnical ? "rounded-md" : "rounded-2xl",
              )}
            />
          </div>
        ))}

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous image"
              className={cn(
                "absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center border bg-background/92 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
                isEditorial ? "rounded-none border-foreground/20" : isTechnical ? "rounded-lg border-border" : "rounded-full border-border/80",
              )}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className={cn(
                "absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center border bg-background/92 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
                isEditorial ? "rounded-none border-foreground/20" : isTechnical ? "rounded-lg border-border" : "rounded-full border-border/80",
              )}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className={cn(
              "absolute bottom-3 right-3 z-20 border bg-background/92 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm",
              isEditorial ? "rounded-none border-foreground/20" : isTechnical ? "rounded-md border-border" : "rounded-full border-border/80",
            )}>
              {activeIndex + 1} / {safeImages.length}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          aria-label="Expand image"
          className={cn(
            "absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center border bg-background/92 text-foreground opacity-100 shadow-md backdrop-blur-sm transition-all hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
            isEditorial ? "rounded-none border-foreground/20" : isTechnical ? "rounded-lg border-border" : "rounded-full border-border/80",
          )}
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {safeImages.length > 1 && (
        <div className="hide-scrollbar flex gap-3 overflow-x-auto px-0.5 py-1.5" aria-label="Product image thumbnails">
          {safeImages.map((src, i) => (
            <button
              key={`thumb-${src}-${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative h-16 w-16 flex-shrink-0 overflow-hidden border-2 bg-secondary/20 p-1 transition-all motion-reduce:transition-none sm:h-20 sm:w-20",
                thumbnailClass,
                i === activeIndex
                  ? "scale-105 border-primary shadow-sm ring-2 ring-primary/20 motion-reduce:scale-100"
                  : "border-border/60 opacity-70 hover:border-primary/50 hover:opacity-100"
              )}
              aria-current={i === activeIndex ? "true" : undefined}
              aria-label={`Show image ${i + 1} of ${safeImages.length}`}
            >
              <img
                src={src}
                srcSet={src.startsWith("http") ? generateCloudinarySrcSet(src, [160, 240, 320]) : undefined}
                sizes="80px"
                alt=""
                loading="lazy"
                className={cn("h-full w-full object-contain", isEditorial ? "rounded-none" : "rounded-xl")}
              />
            </button>
          ))}
        </div>
      )}

      {isFullscreen && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} image viewer`}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-4 top-4 z-50 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 motion-reduce:transition-none sm:right-6 sm:top-6"
          >
            <X className="h-4 w-4" aria-hidden="true" /> Close
          </button>
          {safeImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white/20 motion-reduce:transition-none sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white/20 motion-reduce:transition-none sm:right-6"
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}
          <img
            src={activeImage}
            srcSet={activeImage.startsWith("http") ? generateCloudinarySrcSet(activeImage, [800, 1200, 1600]) : undefined}
            sizes="90vw"
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
