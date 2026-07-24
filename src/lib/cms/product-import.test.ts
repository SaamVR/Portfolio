import { describe, expect, it } from "@/test/test-utils";
import {
  parseCsvText,
  validateImportRow,
  buildStoreBatchInsertPayload,
  SAMPLE_TEMPLATE_CSV,
} from "@/lib/cms/product-import";

describe("product import parsing and validation", () => {
  it("parses valid CSV text into raw records", () => {
    const records = parseCsvText(SAMPLE_TEMPLATE_CSV);
    expect(records).toHaveLength(2);
    expect(records[0].name).toBe("Premium Cotton T-Shirt");
    expect(records[0].price).toBe("1200");
    expect(records[1].name).toBe("Slim Fit Chino Pants");
  });

  it("validates valid product rows", () => {
    const raw = {
      name: "Graphic Hoodie",
      price: "2500",
      image_url: "https://example.com/hoodie.jpg",
      category: "Outerwear",
      type: "Hoodie",
      stock: "15",
      sizes: "M, L",
      colors: "Black",
    };

    const row = validateImportRow(raw, 1);
    expect(row.isValid).toBe(true);
    expect(row.name).toBe("Graphic Hoodie");
    expect(row.price).toBe(2500);
    expect(row.image_url).toBe("https://example.com/hoodie.jpg");
    expect(row.stock).toBe(15);
    expect(row.sizes).toEqual(["M", "L"]);
    expect(row.colors).toEqual(["Black"]);
    expect(row.errors).toHaveLength(0);
  });

  it("flags per-row validation errors for missing name, invalid price, and missing image", () => {
    const rawInvalid = {
      name: "",
      price: "-50",
      image_url: "",
    };

    const row = validateImportRow(rawInvalid, 2);
    expect(row.isValid).toBe(false);
    expect(row.errors).toEqual(["Missing name", "Invalid price", "Missing image"]);
  });

  it("enforces store scoping and attaches active store_id to every payload item", () => {
    const validRow1 = validateImportRow({
      name: "Item 1",
      price: "100",
      image_url: "https://example.com/1.jpg",
    }, 1);

    const validRow2 = validateImportRow({
      name: "Item 2",
      price: "200",
      image_url: "https://example.com/2.jpg",
    }, 2);

    const payload = buildStoreBatchInsertPayload([validRow1, validRow2], "store_123");

    expect(payload).toHaveLength(2);
    expect(payload[0].store_id).toBe("store_123");
    expect(payload[1].store_id).toBe("store_123");
  });

  it("throws error when trying to build batch insert payload without an active store_id", () => {
    const validRow = validateImportRow({
      name: "Item 1",
      price: "100",
      image_url: "https://example.com/1.jpg",
    }, 1);

    let thrownError: Error | null = null;
    try {
      buildStoreBatchInsertPayload([validRow], "");
    } catch (err) {
      thrownError = err as Error;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.message.includes("Store scoping violation")).toBe(true);
  });
});
