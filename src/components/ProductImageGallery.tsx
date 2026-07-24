"use client";

import { useState } from "react";
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

  const safeImages = Array.isArray(images) && images.length > 0 ? images : ["/placeholder.svg"];

  const handlePrev = () => {
    setActiveIndex((current) => (current === 0 ? safeImages.length - 1 : current - 1));
  };

  const handleNext = () => {
    setActiveIndex((current) => (current === safeImages.length - 1 ? 0 : current + 1));
  };

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
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/80 bg-background/90 p-2.5 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/80 bg-background/90 p-2.5 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
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
          className="absolute right-3 top-3 z-20 rounded-full border border-border/80 bg-background/90 p-2 text-foreground opacity-0 shadow-md backdrop-blur-sm transition-all group-hover:opacity-100 hover:scale-105"
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
                "relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 p-1 transition-all bg-secondary/20",
                i === activeIndex
                  ? "border-primary ring-2 ring-primary/20 scale-105 shadow-sm"
                  : "border-border/60 opacity-70 hover:opacity-100 hover:border-primary/50"
              )}
            >
              <img
                src={src}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-6 top-6 z-50 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" /> Close
          </button>
          {safeImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-6 top-1/2 z-50 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white transition hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-6 top-1/2 z-50 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white transition hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={safeImages[activeIndex]}
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
