export type ProductCatalogDraft = {
  name: string;
  price: number;
  image_url: string;
  stock: number;
};

export type ProductCatalogField = "name" | "price" | "image_url" | "stock";
export type ProductCatalogErrors = Partial<Record<ProductCatalogField, string>>;

export function validateProductCatalogDraft(
  draft: ProductCatalogDraft,
  options: { isEditing: boolean },
): ProductCatalogErrors {
  const errors: ProductCatalogErrors = {};

  if (!draft.name.trim()) {
    errors.name = "Enter a product name.";
  }

  if (!Number.isFinite(draft.price) || draft.price <= 0) {
    errors.price = "Enter a price greater than 0.";
  }

  if (!draft.image_url.trim()) {
    errors.image_url = "Add a main product image or image URL.";
  }

  if (!Number.isFinite(draft.stock) || draft.stock < 0) {
    errors.stock = "Stock must be 0 or more.";
  } else if (!options.isEditing && draft.stock < 1) {
    errors.stock = "New products need at least 1 item in stock. You can mark the product sold out after it is created.";
  }

  return errors;
}

export function firstProductCatalogErrorField(errors: ProductCatalogErrors): ProductCatalogField | null {
  const order: ProductCatalogField[] = ["name", "price", "image_url", "stock"];
  return order.find((field) => Boolean(errors[field])) ?? null;
}

export function validateCatalogEntityName(name: string, entityLabel: "category" | "product type"): string | null {
  if (name.trim()) return null;
  return `Enter a ${entityLabel} name.`;
}
