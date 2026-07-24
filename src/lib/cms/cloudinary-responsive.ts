/**
 * Applies Cloudinary transformation parameters (default: w_800,q_auto,f_webp) to an image URL.
 */
export function optimizeCloudinaryUrl(url: string, transformation = "w_800,q_auto,f_webp"): string {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com")) return url;

  // Don't add transformation if it already has explicit transformation parameters
  if (url.includes("/w_800") || url.includes("/q_auto") || url.includes("/f_webp")) {
    return url;
  }

  if (url.includes("/image/upload/")) {
    return url.replace("/image/upload/", `/image/upload/${transformation}/`);
  }

  if (url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/${transformation}/`);
  }

  return url;
}

/**
 * Generates a responsive srcset string for Cloudinary images (e.g., 400w, 800w, 1200w).
 * Returns undefined for non-Cloudinary image URLs.
 */
export function generateCloudinarySrcSet(url: string, widths: number[] = [400, 800, 1200]): string | undefined {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return undefined;
  }

  const baseOptimized = optimizeCloudinaryUrl(url);

  return widths
    .map((w) => {
      let sizedUrl = baseOptimized;

      if (baseOptimized.includes("w_800,q_auto,f_webp")) {
        sizedUrl = baseOptimized.replace("w_800,q_auto,f_webp", `w_${w},q_auto,f_webp`);
      } else if (baseOptimized.includes("/image/upload/")) {
        sizedUrl = baseOptimized.replace("/image/upload/", `/image/upload/w_${w},q_auto,f_webp/`);
      } else if (baseOptimized.includes("/upload/")) {
        sizedUrl = baseOptimized.replace("/upload/", `/upload/w_${w},q_auto,f_webp/`);
      }

      return `${sizedUrl} ${w}w`;
    })
    .join(", ");
}
