"use client";

import Link from "next/link";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { storefrontPath } from "@/lib/slug";

export function NeighborhoodGrid({
  items,
  storeSlug,
  fallbackSrc,
}: {
  items: Array<{ title: string; subtitle: string; image: string | null | undefined }>;
  storeSlug?: string | null;
  fallbackSrc?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.title}
          href={storefrontPath(`/shop?neighborhood=${encodeURIComponent(item.title)}`, storeSlug)}
          className="overflow-hidden rounded-[22px] border border-[#dce8dd] bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-card"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <SafeStorefrontImage
              src={item.image}
              fallbackSrc={fallbackSrc ?? null}
              fill
              sizes="(max-width: 768px) 92vw, (max-width: 1280px) 46vw, 22vw"
              alt={item.title}
              className="object-cover"
            />
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-base font-semibold text-slate-950 dark:text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">{item.subtitle}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
