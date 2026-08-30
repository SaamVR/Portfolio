import assert from "node:assert/strict";
import test from "node:test";

import {
  firstProductCatalogErrorField,
  validateCatalogEntityName,
  validateProductCatalogDraft,
} from "./catalog-dialog-validation";

test("product validation reports required fields in focus order", () => {
  const errors = validateProductCatalogDraft(
    { name: " ", price: 0, image_url: "", stock: 0 },
    { isEditing: false },
  );

  assert.equal(errors.name, "Enter a product name.");
  assert.equal(errors.price, "Enter a price greater than 0.");
  assert.equal(errors.image_url, "Add a main product image or image URL.");
  assert.match(errors.stock ?? "", /at least 1/i);
  assert.equal(firstProductCatalogErrorField(errors), "name");
});

test("editing allows zero stock but rejects negative or non-finite values", () => {
  assert.deepEqual(
    validateProductCatalogDraft(
      { name: "Shirt", price: 500, image_url: "https://example.test/shirt.jpg", stock: 0 },
      { isEditing: true },
    ),
    {},
  );

  assert.match(
    validateProductCatalogDraft(
      { name: "Shirt", price: 500, image_url: "https://example.test/shirt.jpg", stock: -1 },
      { isEditing: true },
    ).stock ?? "",
    /0 or more/i,
  );
});

test("category and product type names use persistent field messages", () => {
  assert.equal(validateCatalogEntityName("", "category"), "Enter a category name.");
  assert.equal(validateCatalogEntityName("  ", "product type"), "Enter a product type name.");
  assert.equal(validateCatalogEntityName("Accessories", "category"), null);
});
