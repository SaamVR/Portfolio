import { describe, expect, it } from "@/test/test-utils";

interface ProductRecord {
  id: string;
  store_id: string;
  name: string;
  price: number;
  stock: number;
  is_available: boolean;
}

interface OrderRecord {
  id: string;
  store_id: string;
  status: string;
  items: Array<{ productId: string; quantity: number }>;
}

class InventoryService {
  private products = new Map<string, ProductRecord>();
  private orders = new Map<string, OrderRecord>();
  private lock = Promise.resolve();

  constructor(initialProducts: ProductRecord[] = []) {
    for (const p of initialProducts) {
      this.products.set(p.id, { ...p });
    }
  }

  getProduct(id: string): ProductRecord | undefined {
    const p = this.products.get(id);
    return p ? { ...p } : undefined;
  }

  // Atomic order creation simulating DB transaction with FOR UPDATE lock & guarded update
  async createOrder(params: {
    store_id: string;
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<OrderRecord> {
    // Acquire mutex lock to simulate database table/row-level lock during transaction
    let releaseLock!: () => void;
    const previousLock = this.lock;
    this.lock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await previousLock;

    try {
      // Step 1: Validate stock & is_available for all line items
      for (const item of params.items) {
        const product = this.products.get(item.productId);
        if (!product || product.store_id !== params.store_id) {
          throw new Error("Product not found");
        }
        if (!product.is_available || product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }

      // Step 2: Guarded update (WHERE stock >= quantity) & set is_available = false if stock reaches 0
      for (const item of params.items) {
        const product = this.products.get(item.productId)!;
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const newStock = product.stock - item.quantity;
        product.stock = newStock;
        if (newStock <= 0) {
          product.is_available = false;
        }
      }

      const newOrder: OrderRecord = {
        id: `order_${Math.random().toString(36).slice(2)}`,
        store_id: params.store_id,
        status: "pending",
        items: params.items,
      };
      this.orders.set(newOrder.id, newOrder);
      return newOrder;
    } finally {
      releaseLock();
    }
  }

  // Atomic status update handling order cancellation stock restoration
  async updateOrderStatus(orderId: string, newStatus: string): Promise<OrderRecord> {
    let releaseLock!: () => void;
    const previousLock = this.lock;
    this.lock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await previousLock;

    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      const previousStatus = order.status;
      order.status = newStatus;

      // On order cancellation: restore stock and toggle is_available = true if stock > 0
      if (newStatus === "cancelled" && previousStatus !== "cancelled") {
        for (const item of order.items) {
          const product = this.products.get(item.productId);
          if (product) {
            product.stock += item.quantity;
            if (product.stock > 0) {
              product.is_available = true;
            }
          }
        }
      }

      return { ...order };
    } finally {
      releaseLock();
    }
  }
}

describe("atomic inventory handling", () => {
  it("decrements stock on order creation and sets is_available = false when stock hits 0", async () => {
    const service = new InventoryService([
      { id: "prod_1", store_id: "store_1", name: "Shirt", price: 500, stock: 2, is_available: true },
    ]);

    const order1 = await service.createOrder({
      store_id: "store_1",
      items: [{ productId: "prod_1", quantity: 2 }],
    });

    expect(order1.id).toBeDefined();
    const updatedProduct = service.getProduct("prod_1");
    expect(updatedProduct?.stock).toBe(0);
    expect(updatedProduct?.is_available).toBe(false);
  });

  it("prevents overselling when two concurrent orders attempt to purchase the last unit", async () => {
    const service = new InventoryService([
      { id: "prod_last", store_id: "store_1", name: "Limited Edition Jacket", price: 2000, stock: 1, is_available: true },
    ]);

    // Fire two concurrent order creation attempts for the last unit
    const results = await Promise.allSettled([
      service.createOrder({ store_id: "store_1", items: [{ productId: "prod_last", quantity: 1 }] }),
      service.createOrder({ store_id: "store_1", items: [{ productId: "prod_last", quantity: 1 }] }),
    ]);

    const fulfilled = results.filter((r): r is PromiseFulfilledResult<OrderRecord> => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    // Exactly one order must succeed and one order must be rejected
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0].reason as Error).message.includes("Insufficient stock")).toBe(true);

    // Product must have 0 stock and is_available = false
    const finalProduct = service.getProduct("prod_last");
    expect(finalProduct?.stock).toBe(0);
    expect(finalProduct?.is_available).toBe(false);
  });

  it("restores stock and re-enables availability when an order is cancelled", async () => {
    const service = new InventoryService([
      { id: "prod_cancel", store_id: "store_1", name: "Handmade Mug", price: 800, stock: 1, is_available: true },
    ]);

    // Create order to deplete stock to 0
    const order = await service.createOrder({
      store_id: "store_1",
      items: [{ productId: "prod_cancel", quantity: 1 }],
    });

    expect(service.getProduct("prod_cancel")?.stock).toBe(0);
    expect(service.getProduct("prod_cancel")?.is_available).toBe(false);

    // Cancel order
    await service.updateOrderStatus(order.id, "cancelled");

    // Stock should be restored to 1 and is_available restored to true
    const restoredProduct = service.getProduct("prod_cancel");
    expect(restoredProduct?.stock).toBe(1);
    expect(restoredProduct?.is_available).toBe(true);
  });
});
