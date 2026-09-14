"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  aspectRatio?: "square" | "portrait" | "landscape";
  presentation?: "default" | "fashion";
}

const ProductImageGallery = ({
  images,
  alt,
  presentation = "default",
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

  const activeImage = safeImages[activeIndex];
  const isFashion = presentation === "fashion";

  return (
    <div className="space-y-4">
      <div className={cn(
        "group relative flex w-full items-center justify-center overflow-hidden border border-border/80",
        isFashion
          ? "aspect-[4/5] rounded-none bg-muted p-0 shadow-none"
          : "aspect-square min-h-[320px] max-h-[460px] rounded-3xl bg-slate-50 p-4 shadow-sm dark:bg-card/40 sm:max-h-[500px] sm:p-6",
      )}>
        {safeImages.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
              isFashion ? "p-0" : "p-4 sm:p-6",
              i === activeIndex ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
            )}
          >
            <img
              src={src}
              srcSet={src.startsWith("http") ? generateCloudinarySrcSet(src) : undefined}
              sizes="(max-width: 768px) 100vw, 50vw"
              alt={`${alt} - image ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className={cn(
                "transition-transform duration-300 group-hover:scale-[1.02]",
                isFashion ? "h-full w-full object-cover" : "h-auto max-h-full w-auto max-w-full rounded-2xl object-contain drop-shadow-sm",
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
              className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 right-3 z-20 rounded-full border border-border/80 bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
              {activeIndex + 1} / {safeImages.length}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          aria-label="Expand image"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground opacity-100 shadow-md backdrop-blur-sm transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {safeImages.length > 1 && (
        <div className="hide-scrollbar flex gap-3 overflow-x-auto px-0.5 py-1.5">
          {safeImages.map((src, i) => (
            <button
              key={`thumb-${src}-${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show image ${i + 1} of ${safeImages.length}`}
              aria-current={i === activeIndex ? "true" : undefined}
              className={cn(
                "relative h-16 w-16 flex-shrink-0 overflow-hidden border-2 bg-secondary/20 transition-all sm:h-20 sm:w-20",
                isFashion ? "rounded-none p-0" : "rounded-2xl p-1",
                i === activeIndex
                  ? "scale-105 border-primary shadow-sm ring-2 ring-primary/20"
                  : "border-border/60 opacity-70 hover:border-primary/50 hover:opacity-100",
              )}
            >
              <img
                src={src}
                srcSet={src.startsWith("http") ? generateCloudinarySrcSet(src, [160, 240, 320]) : undefined}
                sizes="80px"
                alt=""
                loading="lazy"
                className={cn("h-full w-full", isFashion ? "object-cover" : "rounded-xl object-contain")}
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent
          className="left-0 top-0 z-[120] flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-0 bg-black/90 p-4 text-white shadow-none sm:rounded-none"
          onKeyDown={(event) => {
            if (safeImages.length <= 1) return;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              handlePrev();
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              handleNext();
            }
          }}
        >
          <DialogTitle className="sr-only">{alt} image viewer</DialogTitle>
          <DialogDescription className="sr-only">
            Expanded product image {activeIndex + 1} of {safeImages.length}. Use Left and Right Arrow keys to move between images and Escape to close.
          </DialogDescription>

          {safeImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous fullscreen image"
                className="absolute left-4 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next fullscreen image"
                className="absolute right-4 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <img
            src={activeImage}
            srcSet={activeImage.startsWith("http") ? generateCloudinarySrcSet(activeImage, [800, 1200, 1600]) : undefined}
            sizes="90vw"
            alt={`${alt} - expanded image ${activeIndex + 1}`}
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductImageGallery;
