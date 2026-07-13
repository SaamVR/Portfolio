import { describe, expect, it } from "@/test/test-utils";
import { getLocalStoreSlugCandidates, shouldTryLocalStoreSlugFallback } from "@/lib/cms/request-store";

describe("request store helpers", () => {
  it("only tries local slug fallback for localhost requests that resolved to the default store", () => {
    expect(shouldTryLocalStoreSlugFallback("localhost:3000", "00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(shouldTryLocalStoreSlugFallback("127.0.0.1:3000", "00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(shouldTryLocalStoreSlugFallback("localhost:3000", null)).toBe(true);
    expect(shouldTryLocalStoreSlugFallback("shop.example.com", "00000000-0000-4000-8000-000000000001")).toBe(false);
    expect(shouldTryLocalStoreSlugFallback("localhost:3000", "store-2")).toBe(false);
  });

  it("uses only explicitly configured local store slugs", () => {
    const candidates = getLocalStoreSlugCandidates({
      CMS_LOCAL_STORE_SLUG: "configured-store",
      NEXT_PUBLIC_STORE_LOCAL_SLUG: "public-store",
    });

    expect(candidates[0]).toBe("configured-store");
    expect(candidates[1]).toBe("public-store");
    expect(candidates.includes("threadbd")).toBe(false);
  });
});
