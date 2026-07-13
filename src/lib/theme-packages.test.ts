import { describe, expect, it } from "@/test/test-utils";
import assert from "node:assert/strict";
import {
  THEME_PACKAGE_COMPATIBILITY_VERSION,
  buildThemePackageExport,
  fallbackThemePackages,
  parseThemePackageImport,
  resolveThemePackageById,
} from "@/lib/theme-packages";

describe("theme package import/export", () => {
  it("exports a package with the current schema version", () => {
    const exported = buildThemePackageExport(fallbackThemePackages[0]);

    expect(exported.schemaVersion).toBe(1);
    expect(exported.id).toBe(fallbackThemePackages[0].id);
  });

  it("normalizes imported packages into merchant-private installs", () => {
    const raw = JSON.stringify({
      ...buildThemePackageExport(fallbackThemePackages[0]),
      sourceType: "admin_shared",
      ownerStoreId: "store-123",
    });

    const imported = parseThemePackageImport(raw);

    expect(imported.sourceType).toBe("merchant_private");
    expect(imported.ownerStoreId).toBeNull();
  });

  it("rejects packages from a newer compatibility version", () => {
    const raw = JSON.stringify({
      ...buildThemePackageExport(fallbackThemePackages[0]),
      compatibilityVersion: THEME_PACKAGE_COMPATIBILITY_VERSION + 1,
    });

    assert.throws(() => parseThemePackageImport(raw), /compatibility version/i);
  });

  it("rejects unsafe custom css during import", () => {
    const raw = JSON.stringify({
      ...buildThemePackageExport(fallbackThemePackages[0]),
      customCss: "@import url('https://example.com/evil.css');",
    });

    assert.throws(() => parseThemePackageImport(raw), /unsafe/i);
  });

  it("uses the explicit fallback package id before falling back to the first package", () => {
    const resolved = resolveThemePackageById("missing-private-theme", fallbackThemePackages, "warm-earth");
    expect(resolved.id).toBe("warm-earth");
  });
});
