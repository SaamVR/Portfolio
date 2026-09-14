import { readFileSync } from "node:fs";
import { describe, expect, it } from "@/test/test-utils";

const rendererSource = readFileSync(
  "src/components/storefront/threads/ThreadsEditorialBlockRenderer.tsx",
  "utf8",
);

describe("Threads homepage behavior contracts", () => {
  it("keeps category and featured rails loop-capable whenever multiple items exist", () => {
    expect(rendererSource).toContain('loop: items.length > 1');
    expect(rendererSource).toContain('loop: visible.length > 1');
    expect(rendererSource).not.toContain('loop: items.length > 3');
    expect(rendererSource).not.toContain('loop: visible.length > 3');
  });

  it("keeps autoplay disabled for reduced-motion shoppers", () => {
    expect(rendererSource).toContain(
      'window.matchMedia("(prefers-reduced-motion: reduce)").matches',
    );
  });
});
