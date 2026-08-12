import { describe, expect, it } from "@/test/test-utils";
import { mapPersistedPageIdsByLocalId, mapPersistedBlockIdsByLocalId, persistStorefrontState } from "@/lib/cms/store-persistence";
import { fallbackStorefrontTemplateSeeds } from "@/lib/cms/storefront-template-seeds";
import { fallbackThemePackages } from "@/lib/theme-packages";
import type { Store } from "@/lib/cms/schema";

function createMockSupabaseClient() {
  const stores = new Map<string, any>();
  const storeThemes = new Map<string, any>();
  const storePages = new Map<string, any>();
  const storePageBlocks = new Map<string, any>();
  const storeBusinessProfiles = new Map<string, any>();

  const createQueryBuilder = (table: string) => {
    let currentFilter: { column?: string; value?: any; inValues?: any[] } = {};
    let isDeleteOp = false;

    const getTargetMap = () => {
      if (table === "stores") return stores;
      if (table === "store_themes") return storeThemes;
      if (table === "store_pages") return storePages;
      if (table === "store_page_blocks") return storePageBlocks;
      if (table === "store_business_profiles") return storeBusinessProfiles;
      return new Map<string, any>();
    };

    const getFilteredRows = () => {
      let rows = Array.from(getTargetMap().values());
      if (currentFilter.column && currentFilter.value !== undefined) {
        rows = rows.filter((r) => r[currentFilter.column!] === currentFilter.value);
      }
      return rows;
    };

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: any) {
        currentFilter = { column, value };
        return builder;
      },
      in(column: string, values: any[]) {
        currentFilter = { column, inValues: values };
        return builder;
      },
      maybeSingle() {
        const rows = getFilteredRows();
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      upsert(rows: any | any[]) {
        const rowList = Array.isArray(rows) ? rows : [rows];
        const targetMap = getTargetMap();
        for (const row of rowList) {
          const id = row.id ?? row.store_id ?? `${table}_${targetMap.size + 1}`;
          targetMap.set(id, { ...row, id });
        }
        return Promise.resolve({ data: rowList, error: null });
      },
      delete() {
        isDeleteOp = true;
        return builder;
      },
      then(onfulfilled?: (value: any) => any) {
        const targetMap = getTargetMap();
        if (isDeleteOp) {
          if (currentFilter.column && currentFilter.inValues) {
            const col = currentFilter.column;
            for (const [id, row] of Array.from(targetMap.entries())) {
              if (currentFilter.inValues.includes(row[col])) {
                targetMap.delete(id);
              }
            }
          }
          const res = { data: null, error: null };
          return Promise.resolve(res).then(onfulfilled);
        }

        const res = { data: getFilteredRows(), error: null };
        return Promise.resolve(res).then(onfulfilled);
      },
    };

    return builder;
  };

  const client = {
    from(table: string) {
      return createQueryBuilder(table);
    },
  };

  return { client: client as any, stores, storePages, storePageBlocks };
}

describe("storefront persistence", () => {
  it("reuses the existing page id when a draft page has the same slug", () => {
    const pageIds = mapPersistedPageIdsByLocalId(
      [
        { id: "draft-homepage-id", slug: "/" },
        { id: "draft-policy-id", slug: "/policy" },
      ],
      [
        { id: "persisted-homepage-id", slug: "/" },
      ],
    );

    expect(pageIds.get("draft-homepage-id")).toBe("persisted-homepage-id");
    expect(pageIds.get("draft-policy-id")).toBe("draft-policy-id");
  });

  it("reconciles block IDs by exact ID and block_type position", () => {
    const pages = [
      {
        id: "draft-page-1",
        slug: "/",
        blocks: [
          { id: "new-hero-id", type: "hero" },
          { id: "new-featured-id", type: "featured-products" },
        ],
      },
    ];
    const pageMap = new Map([["draft-page-1", "db-page-1"]]);
    const existingBlocks = [
      { id: "existing-hero-id", page_id: "db-page-1", block_type: "hero", sort_order: 0 },
      { id: "existing-featured-id", page_id: "db-page-1", block_type: "featured-products", sort_order: 1 },
    ];

    const blockIds = mapPersistedBlockIdsByLocalId(pages, pageMap, existingBlocks);

    expect(blockIds.get("new-hero-id")).toBe("existing-hero-id");
    expect(blockIds.get("new-featured-id")).toBe("existing-featured-id");
  });

  it("saves twice with a minor edit and asserts unrelated blocks keep their original IDs", async () => {
    const { client, storePageBlocks } = createMockSupabaseClient();
    const templateSeed = fallbackStorefrontTemplateSeeds[0];

    const initialStore: Store = {
      id: "store-123",
      name: "Test Store",
      slug: "test-store",
      description: "Initial description",
      currencyCode: "BDT",
      locale: "en-BD",
      isPublished: true,
      theme: {
        presetId: "preset-minimal",
        mode: "light",
        headingFont: "Inter",
        bodyFont: "Inter",
        borderRadius: "0.75rem",
        customCssVars: {},
      },
      pages: [
        {
          id: "page-home-local",
          slug: "/",
          title: "Home",
          isHomepage: true,
          blocks: [
            { id: "initial-hero-id", type: "hero", props: { title: "Welcome Hero" }, sortOrder: 0, isVisible: true, visible: true },
            { id: "initial-featured-id", type: "featured-products", props: { limit: 6 }, sortOrder: 1, isVisible: true, visible: true },
            { id: "initial-trust-id", type: "trust-badges", props: { badges: [] }, sortOrder: 2, isVisible: true, visible: true },
          ],
        },
      ],
    };

    // First save
    const firstSaveResult = await persistStorefrontState({
      client,
      store: initialStore,
      templateSeed,
      themePackages: fallbackThemePackages,
    });
    expect(firstSaveResult.error).toBeNull();

    const blocksAfterFirstSave = Array.from(storePageBlocks.values());
    expect(blocksAfterFirstSave.length).toBe(3);

    const savedHeroBlock = blocksAfterFirstSave.find((b: any) => b.block_type === "hero");
    const savedFeaturedBlock = blocksAfterFirstSave.find((b: any) => b.block_type === "featured-products");
    const savedTrustBlock = blocksAfterFirstSave.find((b: any) => b.block_type === "trust-badges");

    expect(savedHeroBlock).toBeDefined();
    expect(savedFeaturedBlock).toBeDefined();
    expect(savedTrustBlock).toBeDefined();

    const originalHeroId = savedHeroBlock.id;
    const originalFeaturedId = savedFeaturedBlock.id;
    const originalTrustId = savedTrustBlock.id;

    // Second save: simulate OnboardingWizard re-instantiating blocks with fresh IDs and making a minor edit to hero title
    const secondStore: Store = {
      ...initialStore,
      pages: [
        {
          id: "page-home-local-2", // fresh page ID (will be mapped via slug '/')
          slug: "/",
          title: "Home",
          isHomepage: true,
          blocks: [
            { id: "fresh-uuid-hero", type: "hero", props: { title: "Updated Welcome Hero" }, sortOrder: 0, isVisible: true, visible: true },
            { id: "fresh-uuid-featured", type: "featured-products", props: { limit: 6 }, sortOrder: 1, isVisible: true, visible: true },
            { id: "fresh-uuid-trust", type: "trust-badges", props: { badges: [] }, sortOrder: 2, isVisible: true, visible: true },
          ],
        },
      ],
    };

    const secondSaveResult = await persistStorefrontState({
      client,
      store: secondStore,
      templateSeed,
      themePackages: fallbackThemePackages,
    });
    expect(secondSaveResult.error).toBeNull();

    const blocksAfterSecondSave = Array.from(storePageBlocks.values());
    expect(blocksAfterSecondSave.length).toBe(3);

    const updatedHeroBlock = blocksAfterSecondSave.find((b: any) => b.id === originalHeroId);
    const untouchedFeaturedBlock = blocksAfterSecondSave.find((b: any) => b.id === originalFeaturedId);
    const untouchedTrustBlock = blocksAfterSecondSave.find((b: any) => b.id === originalTrustId);

    // Hero was updated with new title but kept its original ID
    expect(updatedHeroBlock).toBeDefined();
    expect(updatedHeroBlock.props.title).toBe("Updated Welcome Hero");

    // Unrelated blocks kept their exact original IDs!
    expect(untouchedFeaturedBlock).toBeDefined();
    expect(untouchedFeaturedBlock.id).toBe(originalFeaturedId);

    expect(untouchedTrustBlock).toBeDefined();
    expect(untouchedTrustBlock.id).toBe(originalTrustId);

    // Third save: simulate removing the trust-badges block from the draft
    const thirdStore: Store = {
      ...initialStore,
      pages: [
        {
          id: "page-home-local-3",
          slug: "/",
          title: "Home",
          isHomepage: true,
          blocks: [
            { id: "fresh-uuid-hero-3", type: "hero", props: { title: "Updated Welcome Hero" }, sortOrder: 0, isVisible: true, visible: true },
            { id: "fresh-uuid-featured-3", type: "featured-products", props: { limit: 6 }, sortOrder: 1, isVisible: true, visible: true },
          ],
        },
      ],
    };

    const thirdSaveResult = await persistStorefrontState({
      client,
      store: thirdStore,
      templateSeed,
      themePackages: fallbackThemePackages,
    });
    expect(thirdSaveResult.error).toBeNull();

    const blocksAfterThirdSave = Array.from(storePageBlocks.values());
    expect(blocksAfterThirdSave.length).toBe(2);

    expect(blocksAfterThirdSave.some((b: any) => b.id === originalHeroId)).toBe(true);
    expect(blocksAfterThirdSave.some((b: any) => b.id === originalFeaturedId)).toBe(true);
    expect(blocksAfterThirdSave.some((b: any) => b.id === originalTrustId)).toBe(false); // Only the removed block was deleted!
  });
});
