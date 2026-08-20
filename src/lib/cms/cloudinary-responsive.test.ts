import { describe, expect, it } from "@/test/test-utils";
import { generateCloudinarySrcSet, optimizeCloudinaryUrl } from "./cloudinary-responsive";

describe("Cloudinary URL optimization and responsive srcset helpers", () => {
  it("injects w_800,q_auto,f_webp transformations into Cloudinary upload URLs", () => {
    const rawCloudinaryUrl = "https://res.cloudinary.com/demo/image/upload/v1721612345/stores/products/panjabi.jpg";
    const optimized = optimizeCloudinaryUrl(rawCloudinaryUrl);

    expect(optimized).toBe("https://res.cloudinary.com/demo/image/upload/w_800,q_auto,f_webp/v1721612345/stores/products/panjabi.jpg");
  });

  it("does not duplicate transformations if already present", () => {
    const transformedUrl = "https://res.cloudinary.com/demo/image/upload/w_800,q_auto,f_webp/v1721612345/stores/products/panjabi.jpg";
    const result = optimizeCloudinaryUrl(transformedUrl);

    expect(result).toBe(transformedUrl);
  });

  it("leaves non-Cloudinary URLs untouched", () => {
    const supabaseUrl = "https://xyz.supabase.co/storage/v1/object/public/products/item.png";
    const result = optimizeCloudinaryUrl(supabaseUrl);

    expect(result).toBe(supabaseUrl);
  });

  it("generates responsive srcset strings for Cloudinary image URLs", () => {
    const cloudinaryUrl = "https://res.cloudinary.com/demo/image/upload/v1721612345/stores/products/panjabi.jpg";
    const srcSet = generateCloudinarySrcSet(cloudinaryUrl);

    expect(srcSet).toBeDefined();
    if (srcSet) {
      expect(srcSet.includes("w_400,q_auto,f_webp")).toBe(true);
      expect(srcSet.includes("w_800,q_auto,f_webp")).toBe(true);
      expect(srcSet.includes("w_1200,q_auto,f_webp")).toBe(true);
    }
  });

  it("respects custom responsive widths for compact thumbnails and large lightboxes", () => {
    const cloudinaryUrl = "https://res.cloudinary.com/demo/image/upload/w_800,q_auto,f_webp/v1721612345/stores/products/panjabi.jpg";
    const thumbnailSrcSet = generateCloudinarySrcSet(cloudinaryUrl, [160, 240, 320]);
    const lightboxSrcSet = generateCloudinarySrcSet(cloudinaryUrl, [800, 1200, 1600]);

    expect(thumbnailSrcSet?.includes("w_160,q_auto,f_webp")).toBe(true);
    expect(thumbnailSrcSet?.includes("w_240,q_auto,f_webp")).toBe(true);
    expect(thumbnailSrcSet?.includes("w_320,q_auto,f_webp")).toBe(true);
    expect(lightboxSrcSet?.includes("w_800,q_auto,f_webp")).toBe(true);
    expect(lightboxSrcSet?.includes("w_1200,q_auto,f_webp")).toBe(true);
    expect(lightboxSrcSet?.includes("w_1600,q_auto,f_webp")).toBe(true);
  });

  it("returns undefined for non-Cloudinary URLs in generateCloudinarySrcSet", () => {
    const nonCloudinaryUrl = "/placeholder.svg";
    const srcSet = generateCloudinarySrcSet(nonCloudinaryUrl);

    expect(srcSet).toBe(undefined);
  });
});
