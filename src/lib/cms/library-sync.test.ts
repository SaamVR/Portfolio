import { describe, expect, it } from "@/test/test-utils";
import {
  buildBlockRegistrySeedRows,
  buildPageBlueprintSeedRows,
  buildStoreBlueprintSeedRows,
  buildThemePackageSeedRows,
} from "@/lib/cms/library-sync";

describe("cms library sync seeds", () => {
  it("builds seed rows for every fallback blueprint", () => {
    const rows = buildStoreBlueprintSeedRows();

    expect(rows.some((row) => row.id === "electronics")).toBe(true);
    expect(rows.some((row) => row.id === "crafts")).toBe(true);
    expect(rows.some((row) => row.id === "single-product")).toBe(true);
    expect(rows.some((row) => row.id === "inquiry-catalog")).toBe(true);
  });

  it("builds seed rows for every fallback theme package", () => {
    const rows = buildThemePackageSeedRows();

    expect(rows.length).toBeGreaterThan(11);
    expect(rows.some((row) => row.slug === "default" && row.source_type === "system")).toBe(true);
    expect(rows.some((row) => row.slug === "royal-purple")).toBe(true);
  });

  it("builds page and block seed rows from fallback libraries", () => {
    const pageRows = buildPageBlueprintSeedRows();
    const blockRows = buildBlockRegistrySeedRows();

    expect(pageRows.some((row) => row.id === "landing")).toBe(true);
    expect(blockRows.some((row) => row.block_type === "hero")).toBe(true);
    expect(blockRows.some((row) => row.block_type === "featured-products")).toBe(true);
  });
});
