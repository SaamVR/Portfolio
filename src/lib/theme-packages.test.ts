import { describe, expect, it } from "@/test/test-utils";
import assert from "node:assert/strict";
import {
  THEME_PACKAGE_COMPATIBILITY_VERSION,
  buildThemePackageExport,
  fallbackThemePackages,
  loadThemePackages,
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

  it("does not resurrect inactive theme packages from fallback presets", async () => {
    const packages = await loadThemePackages({
      from() {
        return {
          select() {
            return {
              order() {
                return {
                  eq() {
                    return {
                      in() {
                        return Promise.resolve({
                          data: [
                            {
                              id: "default",
                              slug: "default",
                              name: "Emerald Dark",
                              description: "Inactive shared theme",
                              preview_metadata: { bg: "#101418", primary: "#2ea96b", accent: "#d4a534" },
                              source_type: "system",
                              version: 1,
                              compatibility_version: 1,
                              preset_id: "default",
                              mode: "dark",
                              tokens: fallbackThemePackages[0]?.tokens ?? {},
                              component_recipes: {},
                              custom_css: null,
                              owner_store_id: null,
                              is_active: false,
                            },
                          ],
                          error: null,
                        });
                      },
                    };
                  },
                  in() {
                    return Promise.resolve({
                      data: [
                        {
                          id: "default",
                          slug: "default",
                          name: "Emerald Dark",
                          description: "Inactive shared theme",
                          preview_metadata: { bg: "#101418", primary: "#2ea96b", accent: "#d4a534" },
                          source_type: "system",
                          version: 1,
                          compatibility_version: 1,
                          preset_id: "default",
                          mode: "dark",
                          tokens: fallbackThemePackages[0]?.tokens ?? {},
                          component_recipes: {},
                          custom_css: null,
                          owner_store_id: null,
                          is_active: false,
                        },
                      ],
                      error: null,
                    });
                  },
                };
              },
            };
          },
        };
      },
    } as any);

    expect(packages.some((item) => item.slug === "default")).toBe(false);
  });
});
