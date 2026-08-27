import { describe, expect, it } from "@/test/test-utils";
import { readFileSync } from "node:fs";
import path from "node:path";

function readRouteSource(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("storefront shell route guardrails", () => {
  it("blocks the legacy platform order-success route from rendering an unscoped storefront", () => {
    const source = readRouteSource("src/app/order-success/page.tsx");

    expect(source.includes('from "next/navigation"')).toBe(true);
    expect(source.includes("notFound()")).toBe(true);
    expect(source.includes("@/views/OrderSuccess")).toBe(false);
  });

  it.each([
    "src/views/Checkout.tsx",
    "src/views/BkashCallback.tsx",
    "src/views/PaymentCallback.tsx",
  ])("keeps %s order-success navigation tenant-scoped", (file) => {
    const source = readRouteSource(file);

    expect(source.includes("storefrontPath(`/order-success?order=")).toBe(true);
  });

  it.each([
    {
      file: "src/app/stores/[storeSlug]/shop/page.tsx",
      expectedLoader: "getStoreShellBySlug",
    },
    {
      file: "src/app/stores/[storeSlug]/product/[slugId]/page.tsx",
      expectedLoader: "getStoreShellBySlug",
    },
    {
      file: "src/app/stores/[storeSlug]/checkout/page.tsx",
      expectedLoader: "getStoreShellBySlug",
    },
    {
      file: "src/app/stores/[storeSlug]/order-success/page.tsx",
      expectedLoader: "getStoreShellBySlug",
    },
    {
      file: "src/app/stores/[storeSlug]/(customer-pages)/layout.tsx",
      expectedLoader: "getStoreShellBySlug",
    },
    {
      file: "src/app/stores/[storeSlug]/blog/page.tsx",
      expectedLoader: "getStoreShellBySlug",
    },
    {
      file: "src/app/stores/[storeSlug]/blog/[slug]/page.tsx",
      expectedLoader: "getStoreShellBySlug",
    },
    {
      file: "src/app/blog/page.tsx",
      expectedLoader: "getRequestStoreShell",
    },
    {
      file: "src/app/blog/[slug]/page.tsx",
      expectedLoader: "getRequestStoreShell",
    },
  ])("keeps %s on the shell loader", ({ file, expectedLoader }) => {
    const source = readRouteSource(file);

    expect(source.includes(expectedLoader)).toBe(true);
  });
});
