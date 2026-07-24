import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
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
  aspectRatio = "portrait",
}: ProductImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const safeImages = images.length > 0 ? images : ["/placeholder.svg"];

  const handlePrev = () => {
    setActiveIndex((current) => (current === 0 ? safeImages.length - 1 : current - 1));
  };

  const handleNext = () => {
    setActiveIndex((current) => (current === safeImages.length - 1 ? 0 : current + 1));
  };

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "landscape"
        ? "aspect-[4/3]"
        : "aspect-[4/5]";

  return (
    <div className="space-y-4">
      {/* Main Image Stage */}
      <div className={cn("group relative w-full overflow-hidden rounded-2xl border border-border bg-secondary/30", aspectClass)}>
        {safeImages.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            srcSet={src.startsWith("http") ? generateCloudinarySrcSet(src) : undefined}
            sizes="(max-width: 768px) 100vw, 50vw"
            alt={`${alt} - view ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
              i === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          />
        ))}

        {/* Overlay Navigation Buttons */}
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background/80 p-2 text-foreground shadow-md backdrop-blur transition-all hover:bg-background hover:scale-110"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background/80 p-2 text-foreground shadow-md backdrop-blur transition-all hover:bg-background hover:scale-110"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Counter Badge */}
            <div className="absolute bottom-3 right-3 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur border border-border/50">
              {activeIndex + 1} / {safeImages.length}
            </div>
          </>
        )}

        {/* Zoom / Fullscreen Trigger */}
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          aria-label="Expand image"
          className="absolute right-3 top-3 rounded-full border border-border/60 bg-background/80 p-2 text-foreground opacity-0 shadow-md backdrop-blur transition-all group-hover:opacity-100 hover:bg-background"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Thumbnails Row */}
      {safeImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
          {safeImages.map((src, i) => (
            <button
              key={`thumb-${src}-${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                i === activeIndex
                  ? "border-primary ring-2 ring-primary/20 scale-105"
                  : "border-border opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={src}
                alt={`${alt} thumbnail ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-6 top-6 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Close ✕
          </button>
          <img
            src={safeImages[activeIndex]}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
