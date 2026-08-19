import { describe, expect, it } from "@/test/test-utils";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";

describe("storefront media focal positioning", () => {
  it("keeps centered cropping as the backward-compatible default", () => {
    expect(resolveStorefrontImageObjectPosition()).toBe("50% 50%");
  });

  it("resolves preset positions", () => {
    expect(resolveStorefrontImageObjectPosition({ position: "top" })).toBe("50% 0%");
    expect(resolveStorefrontImageObjectPosition({ position: "bottom-right" })).toBe("100% 100%");
  });

  it("prefers merchant focal coordinates and clamps them safely", () => {
    expect(resolveStorefrontImageObjectPosition({ focalX: 24, focalY: 71 })).toBe("24% 71%");
    expect(resolveStorefrontImageObjectPosition({ focalX: "120", focalY: "-10" })).toBe("100% 0%");
  });

  it("falls back missing focal coordinates to center", () => {
    expect(resolveStorefrontImageObjectPosition({ focalX: "35" })).toBe("35% 50%");
  });
});
