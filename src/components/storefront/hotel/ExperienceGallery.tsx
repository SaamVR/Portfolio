"use client";

import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";

export function ExperienceGallery({
  images,
  fallbackSrc,
}: {
  images: Array<{ src: string | null | undefined; alt: string }>;
  fallbackSrc?: string | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {images.map((image, index) => (
        <div key={`${image.alt}-${index}`} className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-[#dfe8e1] bg-white shadow-[0_16px_32px_-30px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card">
          <SafeStorefrontImage
            src={image.src}
            fallbackSrc={fallbackSrc ?? null}
            fill
            sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 22vw"
            alt={image.alt}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
