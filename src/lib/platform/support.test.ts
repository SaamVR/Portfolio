import { describe, expect, it } from "@/test/test-utils";
import { getSupportUrl, isExternalSupportUrl } from "@/lib/platform/support";

describe("platform support helpers", () => {
  it("falls back to the local contact page when no support url is configured", () => {
    expect(getSupportUrl({})).toBe("/contact");
  });

  it("prefers NEXT_PUBLIC_SUPPORT_URL over SUPPORT_URL", () => {
    expect(getSupportUrl({
      NEXT_PUBLIC_SUPPORT_URL: "https://help.example.com",
      SUPPORT_URL: "https://internal.example.com",
    })).toBe("https://help.example.com");
  });

  it("uses SUPPORT_URL when the public support url is not configured", () => {
    expect(getSupportUrl({
      SUPPORT_URL: "mailto:support@example.com",
    })).toBe("mailto:support@example.com");
  });

  it("detects external support destinations", () => {
    expect(isExternalSupportUrl("https://help.example.com")).toBe(true);
    expect(isExternalSupportUrl("mailto:support@example.com")).toBe(true);
    expect(isExternalSupportUrl("tel:+123456789")).toBe(true);
    expect(isExternalSupportUrl("/contact")).toBe(false);
  });
});
