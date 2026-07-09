import { describe, expect, it } from "@/test/test-utils";
import { inferMediaTypeFromUrl, normalizeMediaLibrary } from "@/lib/media-library";

describe("media library helpers", () => {
  it("sorts valid media assets newest first", () => {
    const assets = normalizeMediaLibrary([
      { id: "older", url: "https://example.com/older.jpg", resourceType: "image", folder: "cms", createdAt: "2026-07-01T10:00:00.000Z" },
      { id: "newer", url: "https://example.com/newer.mp4", resourceType: "video", folder: "hero", createdAt: "2026-07-02T10:00:00.000Z" },
    ]);

    expect(assets.map((asset) => asset.id)).toEqual(["newer", "older"]);
  });

  it("filters invalid media assets", () => {
    const assets = normalizeMediaLibrary([
      { id: "valid", url: "https://example.com/ok.jpg", resourceType: "image", folder: "cms", createdAt: "2026-07-02T10:00:00.000Z" },
      { nope: true },
    ]);

    expect(assets).toHaveLength(0);
  });

  it("infers media types from urls", () => {
    expect(inferMediaTypeFromUrl("https://res.cloudinary.com/demo/video/upload/v1/sample.mp4")).toBe("video");
    expect(inferMediaTypeFromUrl("https://res.cloudinary.com/demo/image/upload/v1/sample.jpg")).toBe("image");
  });
});
