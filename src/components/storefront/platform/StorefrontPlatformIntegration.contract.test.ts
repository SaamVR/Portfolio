import { readFileSync } from "node:fs";
import { describe, expect, it } from "@/test/test-utils";

const storefrontPageSource = readFileSync("src/components/storefront/StorefrontPage.tsx", "utf8");
const compositionRendererSource = readFileSync("src/components/storefront/platform/StorefrontCompositionRenderer.tsx", "utf8");
const dataProviderSource = readFileSync("src/lib/storefront-platform/data/composition-data-slot-provider.ts", "utf8");

describe("Storefront Platform v1 integration contracts", () => {
  it("keeps StorefrontLiveEditor behind an authorized dynamic shopper boundary", () => {
    expect(storefrontPageSource).not.toContain('import { StorefrontLiveEditor } from "@/components/storefront/StorefrontLiveEditor"');
    expect(storefrontPageSource).toContain('import("@/components/storefront/StorefrontLiveEditor")');
    expect(storefrontPageSource).toContain("{ ssr: false }");
    expect(storefrontPageSource).toContain("{canManageStorefront ? (");
  });

  it("keeps Composition mobile-first and touch-safe without horizontal overflow primitives", () => {
    expect(compositionRendererSource).toContain('"grid grid-cols-1"');
    expect(compositionRendererSource).toContain("md:grid-cols-");
    expect(compositionRendererSource).toContain("min-h-11");
    expect(compositionRendererSource).toContain('"relative overflow-hidden"');
  });

  it("normalizes Composition data without introducing another network or Supabase client", () => {
    expect(dataProviderSource).not.toContain("fetch(");
    expect(dataProviderSource).not.toContain("supabase");
    expect(dataProviderSource).toContain("validateCompositionDataSlotPayload(payload)");
  });
});
const threadsHeaderSource = readFileSync("src/components/storefront/threads/ThreadsHeader.tsx", "utf8");
const threadsRendererSource = readFileSync("src/components/storefront/threads/ThreadsBlockRenderer.tsx", "utf8");
const threadsFooterSource = readFileSync("src/components/storefront/threads/ThreadsFooter.tsx", "utf8");

describe("Threads mobile stabilization", () => {
  it("keeps critical shopper controls at the 44px minimum after integration", () => {
    expect(threadsHeaderSource).toContain('h-11 w-11 place-items-center lg:hidden');
    expect(threadsHeaderSource).toContain('h-11 w-11 place-items-center" aria-label="Search"');
    expect(threadsHeaderSource).toContain('relative grid h-11 w-11 place-items-center');
    expect(threadsRendererSource).toContain('inline-flex min-h-11 items-center');
    expect(threadsRendererSource).toContain('flex min-h-12 overflow-hidden');
    expect(threadsFooterSource).toContain('flex min-h-11 overflow-hidden');
    expect(threadsFooterSource).toContain('grid min-w-11 place-items-center');
  });
});
