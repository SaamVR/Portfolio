import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
}

const ProductImageGallery = ({ images, alt }: ProductImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-secondary">
        <img src="/placeholder.svg" alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <>
      {/* Desktop: Vertical Stack with CSS Hover Zoom (Highly Performant) */}
      <div className="hidden lg:grid grid-cols-1 gap-6">
        {images.map((src, i) => (
          <div key={src} className="group relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-secondary">
            <img
              src={src}
              alt={`${alt} - view ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          </div>
        ))}
      </div>

      {/* Mobile: Standard Slider with Thumbnails */}
      <div className="space-y-3 lg:hidden">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
          {images.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`${alt} - ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                i === activeIndex ? "opacity-100" : "opacity-0"
              )}
            />
          ))}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {images.map((src, i) => (
              <button
                key={src}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all",
                  i === activeIndex ? "border-primary ring-1 ring-primary" : "border-border opacity-60 hover:opacity-100"
                )}
              >
                <img src={src} alt={`${alt} thumbnail ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ProductImageGallery;
