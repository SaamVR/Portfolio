"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  aspectRatio?: "square" | "portrait" | "landscape";
}

const ProductImageGallery = ({
  images,
  alt,
}: ProductImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

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

  return (
    <div className="space-y-4">
      {/* Main Image Container */}
      <div className="group relative w-full overflow-hidden rounded-3xl border border-border/80 bg-slate-50 dark:bg-card/40 p-4 sm:p-6 flex items-center justify-center min-h-[320px] max-h-[460px] sm:max-h-[500px] aspect-square shadow-sm">
        {safeImages.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={cn(
              "absolute inset-0 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300",
              i === activeIndex ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
            )}
          >
            <img
              src={src}
              srcSet={src.startsWith("http") ? generateCloudinarySrcSet(src) : undefined}
              sizes="(max-width: 768px) 100vw, 50vw"
              alt={`${alt} - image ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className="max-h-full max-w-full h-auto w-auto object-contain rounded-2xl drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ))}

        {/* Carousel Controls */}
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 right-3 z-20 rounded-full border border-border/80 bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
              {activeIndex + 1} / {safeImages.length}
            </div>
          </>
        )}

        {/* Lightbox trigger */}
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          aria-label="Expand image"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground opacity-100 shadow-md backdrop-blur-sm transition-all hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Thumbnails list */}
      {safeImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto py-1.5 px-0.5 hide-scrollbar">
          {safeImages.map((src, i) => (
            <button
              key={`thumb-${src}-${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 p-1 transition-all motion-reduce:transition-none bg-secondary/20",
                i === activeIndex
                  ? "border-primary ring-2 ring-primary/20 scale-105 shadow-sm"
                  : "border-border/60 opacity-70 hover:opacity-100 hover:border-primary/50"
              )}
              aria-current={i === activeIndex ? "true" : undefined}
            >
              <img
                src={src}
                srcSet={src.startsWith("http") ? generateCloudinarySrcSet(src, [160, 240, 320]) : undefined}
                sizes="80px"
                alt={`${alt} thumbnail ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-contain rounded-xl"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
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
            <X className="h-4 w-4" /> Close
          </button>
          {safeImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white/20 motion-reduce:transition-none sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white/20 motion-reduce:transition-none sm:right-6"
              >
                <ChevronRight className="h-6 w-6" />
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
