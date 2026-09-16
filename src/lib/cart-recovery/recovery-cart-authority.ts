const productIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RecoveryCartInputItem = {
  productId: string;
  quantity: number;
  variant: string;
};

export type RecoveryCartProduct = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
};

export type AuthoritativeRecoveryCartItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variant: string;
};

function readVariant(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function normalizeRecoveryCartInput(value: unknown): RecoveryCartInputItem[] | null {
  if (!Array.isArray(value)) return [];
  if (value.length > 30) return null;
  const normalizedByLine = new Map<string, RecoveryCartInputItem>();

  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const productId = typeof record.productId === "string" ? record.productId.trim() : "";
    const quantity = Number(record.quantity);
    const variant = readVariant(record.variant);
    if (!productIdPattern.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return null;
    }

    const key = `${productId}\u0000${variant}`;
    const existing = normalizedByLine.get(key);
    const aggregateQuantity = (existing?.quantity ?? 0) + quantity;
    if (aggregateQuantity > 99) return null;
    normalizedByLine.set(key, { productId, quantity: aggregateQuantity, variant });
  }

  return [...normalizedByLine.values()];
}

export function buildAuthoritativeRecoveryCart(
  items: RecoveryCartInputItem[],
  products: RecoveryCartProduct[],
) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const snapshot: AuthoritativeRecoveryCartItem[] = [];
  let cartValue = 0;
  let itemCount = 0;

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product || !product.is_available || !Number.isFinite(product.price) || product.price < 0) {
      return null;
    }
    const price = Math.round(product.price);
    snapshot.push({ ...item, name: product.name, price });
    itemCount += item.quantity;
    cartValue += price * item.quantity;
    if (!Number.isSafeInteger(cartValue)) return null;
  }

  return { snapshot, cartValue, itemCount };
}
