import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { CartContext, type CartItem } from "@/context/cart-context";

const CART_STORAGE_KEY_PREFIX = "threadbd-cart-";
const CART_TIME_KEY_PREFIX = "threadbd-cart-time-";
const DEFAULT_STORE_ID = "00000000-0000-4000-8000-000000000001";

function getStorageKey(storeId?: string) {
  return `${CART_STORAGE_KEY_PREFIX}${storeId || DEFAULT_STORE_ID}`;
}

function getTimeKey(storeId?: string) {
  return `${CART_TIME_KEY_PREFIX}${storeId || DEFAULT_STORE_ID}`;
}

function normalizeStoreId(storeId?: string) {
  return storeId ?? DEFAULT_STORE_ID;
}

function isSameCartLine(item: CartItem, productId: string, size: string, storeId?: string) {
  return (
    item.productId === productId &&
    item.size === size &&
    normalizeStoreId(item.storeId) === normalizeStoreId(storeId)
  );
}

function loadCart(storeId?: string): CartItem[] {
  try {
    const saved = localStorage.getItem(getStorageKey(storeId));
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[], storeId?: string) {
  localStorage.setItem(getStorageKey(storeId), JSON.stringify(items));
  localStorage.setItem(getTimeKey(storeId), Date.now().toString());
}

export const CartProvider: React.FC<{ children: React.ReactNode; storeId?: string }> = ({ children, storeId }) => {
  const [items, setItems] = useState<CartItem[]>(() => loadCart(storeId));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useAuth();
  const hasMerged = React.useRef(false);
  const itemsRef = React.useRef(items);
  const initialItemsRef = React.useRef(items);

  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        storeId: normalizeStoreId(item.storeId),
      })),
    );
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Cart Recovery check on mount
  useEffect(() => {
    const initialItems = initialItemsRef.current;

    if (initialItems.length > 0) {
      const lastTime = localStorage.getItem(getTimeKey(storeId));
      if (lastTime) {
        const hoursPassed = (Date.now() - parseInt(lastTime, 10)) / (1000 * 60 * 60);
        if (hoursPassed > 1 && hoursPassed < 72) {
          // If they return after 1 hour but before 3 days, remind them
          setTimeout(() => {
            toast("You left items in your cart!", {
              description: "We saved them for you. Don't miss out!",
              action: {
                label: "View Cart",
                onClick: () => setIsCartOpen(true),
              },
            });
          }, 3000); // Slight delay for better UX
        }
      }
    }
    // Update the timestamp on mount to prevent constant reminding
    if (initialItems.length > 0) {
      saveCart(initialItems, storeId);
    }
  }, [storeId]);

  // Sync on login / auth change
  useEffect(() => {
    if (!user) return;

    const loadAndMergeCart = async () => {
      try {
        // 1. Fetch DB cart items
        const { data: dbCart, error } = await (supabase as any)
          .from("cart_items")
          .select("product_id, size, quantity, store_id")
          .eq("user_id", user.id)
          .eq("store_id", normalizeStoreId(storeId));

        if (error) throw error;
        if (!dbCart || dbCart.length === 0) {
          // No items in DB, sync current local cart to DB
          if (itemsRef.current.length > 0) {
            const inserts = itemsRef.current.map(item => ({
              user_id: user.id,
              product_id: item.productId,
              size: item.size,
              quantity: item.quantity,
              store_id: normalizeStoreId(item.storeId)
            }));
            await (supabase as any).from("cart_items").upsert(inserts);
          }
          hasMerged.current = true;
          return;
        }

        // 2. Fetch product details for those items
        const productIds = dbCart.map(item => item.product_id);
        const { data: dbProducts } = await supabase
          .from("products")
          .select("id, name, price, image_url")
          .in("id", productIds);

        const productsMap = new Map(dbProducts?.map(p => [p.id, p]));

        // Convert dbCart to CartItem format
        const dbCartItems: CartItem[] = dbCart.map(item => {
          const prod = productsMap.get(item.product_id);
          return {
            productId: item.product_id,
            storeId: normalizeStoreId(item.store_id ?? undefined),
            name: prod?.name || "Product",
            price: prod?.price || 0,
            image: prod?.image_url || "",
            size: item.size,
            quantity: item.quantity
          };
        }).filter(item => item.price > 0);

        // 3. Merge local cart items and db cart items
        setItems(prev => {
          const merged = [...prev];
          dbCartItems.forEach(dbItem => {
            const existing = merged.find(i => isSameCartLine(i, dbItem.productId, dbItem.size, dbItem.storeId));
            if (existing) {
              // Keep the larger quantity
              existing.quantity = Math.max(existing.quantity, dbItem.quantity);
            } else {
              merged.push(dbItem);
            }
          });
          return merged;
        });

        hasMerged.current = true;
      } catch (err) {
        console.error("Failed to load and merge cart:", err);
        hasMerged.current = true;
      }
    };

    loadAndMergeCart();
  }, [storeId, user]);

  // Persist to localStorage and database whenever items change
  useEffect(() => {
    saveCart(items, storeId);

    if (!user || !hasMerged.current) return;

    const syncToDb = async () => {
      try {
        // Delete all and insert to sync
        await (supabase as any).from("cart_items").delete().eq("user_id", user.id).eq("store_id", normalizeStoreId(storeId));
        if (items.length > 0) {
          const inserts = items.map(item => ({
            user_id: user.id,
            product_id: item.productId,
            size: item.size,
            quantity: item.quantity,
            store_id: normalizeStoreId(item.storeId)
          }));
          const { error } = await (supabase as any).from("cart_items").insert(inserts);
          if (error) throw error;
        }
      } catch (err) {
        console.error("Failed to sync cart changes to db:", err);
      }
    };

    const timer = setTimeout(syncToDb, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [items, storeId, user]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => isSameCartLine(i, item.productId, item.size, item.storeId));
      if (existing) {
        return prev.map((i) =>
          isSameCartLine(i, item.productId, item.size, item.storeId)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, storeId: normalizeStoreId(item.storeId), quantity: 1 }];
    });
    setIsCartOpen(true); // Auto-open cart when adding items
  }, []);

  const removeItem = useCallback((productId: string, size: string, storeId?: string) => {
    setItems((prev) => prev.filter((i) => !isSameCartLine(i, productId, size, storeId)));
  }, []);

  const updateQuantity = useCallback((productId: string, size: string, quantity: number, storeId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, size, storeId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        isSameCartLine(i, productId, size, storeId) ? { ...i, quantity } : i
      )
    );
  }, [removeItem]);

  const clearCart = useCallback((storeId?: string) => {
    if (!storeId) {
      setItems([]);
      localStorage.removeItem(getStorageKey(storeId));
      localStorage.removeItem(getTimeKey(storeId));
      return;
    }

    const normalizedStoreId = normalizeStoreId(storeId);
    setItems((prev) => prev.filter((item) => normalizeStoreId(item.storeId) !== normalizedStoreId));
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

