import { describe, expect, it } from "@/test/test-utils";
import { isBlogPostPublicNow } from "@/lib/cms/blog-server";

describe("blog public visibility", () => {
  const now = new Date("2026-08-19T14:00:00.000Z").getTime();

  it("keeps legacy published posts without a publish timestamp visible", () => {
    expect(isBlogPostPublicNow({ status: "published", published_at: null }, now)).toBe(true);
  });

  it("keeps future scheduled posts hidden", () => {
    expect(isBlogPostPublicNow({ status: "published", published_at: "2026-08-20T14:00:00.000Z" }, now)).toBe(false);
  });

  it("shows published posts whose publish time has arrived", () => {
    expect(isBlogPostPublicNow({ status: "published", published_at: "2026-08-19T13:59:59.000Z" }, now)).toBe(true);
  });

  it("never exposes drafts", () => {
    expect(isBlogPostPublicNow({ status: "draft", published_at: null }, now)).toBe(false);
  });
});
