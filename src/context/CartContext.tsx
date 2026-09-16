import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/auth-context";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { CartContext, type CartItem } from "@/context/cart-context";

import {
  MAX_CART_LINES,
  MAX_CART_QUANTITY,
  clampCartQuantity,
  normalizePersistedCartItems,
} from "@/lib/cart-state";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";
import {
  getCommercialSelectionPrice,
  normalizeCommercialOptions,
  normalizeFulfillmentType,
} from "@/lib/commerce/product-commercial-options";

const GLOBAL_CART_KEY = "global";

function getStorageKey(storeId?: string | null) {
  return getScopedStorefrontStorageKey("cart", storeId);
}

function getTimeKey(storeId?: string | null) {
  return getScopedStorefrontStorageKey("cart-time", storeId);
}

function getCouponStorageKey(storeId?: string | null) {
  return getScopedStorefrontStorageKey("cart-coupon", storeId);
}

function optionIdentity(optionIds: string[] | undefined) {
  return [...(optionIds ?? [])].map((id) => id.trim()).filter(Boolean).sort().join("\u001f");
}

function isSameCartLine(item: CartItem, productId: string, size: string, storeId?: string, optionIds?: string[]) {
  if (item.productId !== productId || (item.storeId ?? null) !== (storeId ?? null)) return false;
  const itemOptionIdentity = optionIdentity(item.optionIds);
  const requestedOptionIdentity = optionIdentity(optionIds);
  if (itemOptionIdentity || requestedOptionIdentity) {
    return itemOptionIdentity === requestedOptionIdentity;
  }
  return item.size === size;
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function loadCart(storeId?: string): CartItem[] {
  try {
    const saved = localStorage.getItem(getStorageKey(storeId));
    const parsed = saved ? JSON.parse(saved) : [];
    return normalizePersistedCartItems(parsed, storeId);
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[], storeId?: string) {
  try {
    const normalized = normalizePersistedCartItems(items, storeId);
    localStorage.setItem(getStorageKey(storeId), JSON.stringify(normalized));
    localStorage.setItem(getTimeKey(storeId), Date.now().toString());
  } catch {
    // Keep the in-memory cart usable when browser storage is unavailable/full.
  }
}

function getScopedItems(items: CartItem[], storeId?: string | null) {
  return items.filter((item) => (item.storeId ?? null) === (storeId ?? null));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = record.message;
    if (typeof message === "string" && message.trim()) return message;
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown cart sync error";
    }
  }
  return "Unknown cart sync error";
}

type CartItemRow = Pick<Tables<"cart_items">, "product_id" | "size" | "option_ids" | "quantity" | "store_id">;
type ProductLookupRow = Pick<Tables<"products">, "id" | "name" | "price" | "image_url" | "commercial_options" | "fulfillment_type">;

export const CartProvider: React.FC<{ children: React.ReactNode; storeId?: string }> = ({ children, storeId }) => {
  const expectedCartScope = storeId || GLOBAL_CART_KEY;
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartScope, setCartScope] = useState(expectedCartScope);
  const [readyCartScope, setReadyCartScope] = useState<string | null>(null);
  const isCartReady = readyCartScope === expectedCartScope;
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [couponCode, setCouponCodeState] = useState<string | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);
        const urlCoupon = searchParams.get("coupon") || searchParams.get("coupon_code");
        if (urlCoupon && urlCoupon.trim()) {
          return urlCoupon.trim().toUpperCase();
        }
        return localStorage.getItem(getCouponStorageKey(storeId));
      }
    } catch {
      // Ignore coupon parsing/storage issues and fall back to no coupon.
    }
    return null;
  });
  const { user } = useAuth();
  const { trackEvent } = useStorefrontAnalytics();
  const hasMerged = React.useRef(false);
  const itemsRef = React.useRef(items);
  const initialItemsRef = React.useRef<CartItem[]>(items);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlCoupon = searchParams.get("coupon") || searchParams.get("coupon_code");

      if (urlCoupon && urlCoupon.trim()) {
        const clean = urlCoupon.trim().toUpperCase();
        setCouponCodeState(clean);
        localStorage.setItem(getCouponStorageKey(storeId), clean);
      } else {
        const saved = localStorage.getItem(getCouponStorageKey(storeId));
        if (saved) setCouponCodeState(saved);
      }
    } catch {
      // Ignore coupon parsing/storage issues and leave current state unchanged.
    }
  }, [storeId]);

  const setCouponCode = useCallback((code: string | null) => {
    const clean = code ? code.trim().toUpperCase() : null;
    setCouponCodeState(clean);
    try {
      if (clean) {
        localStorage.setItem(getCouponStorageKey(storeId), clean);
      } else {
        localStorage.removeItem(getCouponStorageKey(storeId));
      }
    } catch {
      // Ignore localStorage write failures so cart interactions still work in-memory.
    }
  }, [storeId]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const nextItems = loadCart(storeId);
    hasMerged.current = false;
    initialItemsRef.current = nextItems;
    itemsRef.current = nextItems;
    setItems(nextItems);
    setCartScope(expectedCartScope);
    setReadyCartScope(expectedCartScope);
  }, [expectedCartScope, storeId]);

  useEffect(() => {
    if (cartScope === expectedCartScope) return;

    const nextItems = loadCart(storeId);
    hasMerged.current = false;
    initialItemsRef.current = nextItems;
    itemsRef.current = nextItems;
    setItems(nextItems);
    setCartScope(expectedCartScope);
    setReadyCartScope(expectedCartScope);
    setIsCartOpen(false);
  }, [cartScope, expectedCartScope, storeId]);

  // Cart Recovery check on mount
  useEffect(() => {
    if (!isCartReady || cartScope !== expectedCartScope) return;

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
  }, [cartScope, expectedCartScope, isCartReady, storeId]);

  // Sync on login / auth change
  useEffect(() => {
    if (!isCartReady || cartScope !== expectedCartScope) return;
    if (!user) return;

    const loadAndMergeCart = async () => {
      if (!storeId) {
        hasMerged.current = true;
        return;
      }

      if (storeId.startsWith("preview-") || !isValidUUID(storeId)) {
        hasMerged.current = true;
        return;
      }

      try {
        const localItems = normalizePersistedCartItems(itemsRef.current, storeId);
        const { data: dbCart, error } = await supabase
          .from("cart_items")
          .select("product_id, size, option_ids, quantity, store_id")
          .eq("user_id", user.id)
          .eq("store_id", storeId);

        if (error) throw error;

        const dbRows = (dbCart ?? []) as CartItemRow[];
        const candidateProductIds = Array.from(new Set([
          ...localItems.map((item) => item.productId),
          ...dbRows.map((item) => item.product_id),
        ]));

        if (candidateProductIds.length === 0) {
          hasMerged.current = true;
          return;
        }

        const { data: dbProducts, error: productsError } = await supabase
          .from("products")
          .select("id, name, price, image_url, commercial_options, fulfillment_type")
          .eq("store_id", storeId)
          .eq("is_available", true)
          .in("id", candidateProductIds);

        if (productsError) throw productsError;

        const productsMap = new Map((dbProducts as ProductLookupRow[] | null | undefined)?.map((p) => [p.id, p]));
        const validLocalItems = localItems.filter((item) => productsMap.has(item.productId));
        const dbCartItems: CartItem[] = dbRows.flatMap(item => {
          const prod = productsMap.get(item.product_id);
          if (!prod) return [];
          const commercialOptions = normalizeCommercialOptions(prod.commercial_options);
          const optionIds = item.option_ids ?? [];
          const authoritativePrice = commercialOptions.length > 0
            ? getCommercialSelectionPrice(prod.price, commercialOptions, optionIds)
            : Number(prod.price ?? 0);
          if (authoritativePrice === null || authoritativePrice < 0) return [];
          return [{
            productId: item.product_id,
            storeId: item.store_id ?? undefined,
            name: prod.name || "Product",
            price: authoritativePrice,
            image: prod.image_url || "",
            size: item.size,
            optionIds,
            fulfillmentType: normalizeFulfillmentType(prod.fulfillment_type),
            quantity: clampCartQuantity(item.quantity),
          }];
        });

        setItems(() => {
          const merged = [...validLocalItems];
          dbCartItems.forEach(dbItem => {
            const existing = merged.find(i => isSameCartLine(i, dbItem.productId, dbItem.size, dbItem.storeId, dbItem.optionIds));
            if (existing) {
              existing.quantity = clampCartQuantity(Math.max(existing.quantity, dbItem.quantity));
            } else {
              merged.push(dbItem);
            }
          });
          return normalizePersistedCartItems(merged, storeId);
        });

        hasMerged.current = true;
      } catch (err) {
        console.error("Failed to load and merge cart:", err);
        hasMerged.current = true;
      }
    };

    loadAndMergeCart();
  }, [cartScope, expectedCartScope, isCartReady, storeId, user]);

  // Persist to localStorage and database whenever items change
  useEffect(() => {
    if (!isCartReady || cartScope !== expectedCartScope) return;

    saveCart(items, storeId);

    if (!user || !hasMerged.current || !storeId) return;

    if (storeId.startsWith("preview-") || !isValidUUID(storeId)) return;

    const syncToDb = async () => {
      try {
        const scopedItems = normalizePersistedCartItems(getScopedItems(items, storeId), storeId);
        const scopedProductIds = Array.from(new Set(scopedItems.map((item) => item.productId)));
        let validProductIds = new Set(scopedProductIds);

        if (scopedProductIds.length > 0) {
          const { data: existingProducts, error: productsError } = await supabase
            .from("products")
            .select("id")
            .eq("store_id", storeId)
            .eq("is_available", true)
            .in("id", scopedProductIds);

          if (productsError) throw productsError;

          validProductIds = new Set((existingProducts ?? []).map((product) => product.id));
        }

        const validScopedItems = scopedItems.filter((item) => validProductIds.has(item.productId));
        if (validScopedItems.length !== scopedItems.length) {
          setItems((prev) => prev.filter((item) => (item.storeId ?? null) !== storeId || validProductIds.has(item.productId)));
        }

        const { error: deleteError } = await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .eq("store_id", storeId);
        if (deleteError) throw deleteError;

        if (validScopedItems.length > 0) {
          const inserts: TablesInsert<"cart_items">[] = validScopedItems.map(item => ({
            user_id: user.id,
            product_id: item.productId,
            size: item.size,
            option_ids: item.optionIds ?? [],
            quantity: item.quantity,
            store_id: item.storeId ?? storeId
          }));
          if (inserts.length > 0) {
            const { error } = await supabase.from("cart_items").upsert(inserts, {
              onConflict: "user_id,product_id,size,option_ids",
            });
            if (error) throw error;
          }
        }
      } catch (err) {
        console.error(`Failed to sync cart changes to db: ${getErrorMessage(err)}`, {
          storeId,
          userId: user.id,
          error: err,
        });
      }
    };

    const timer = setTimeout(syncToDb, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [cartScope, expectedCartScope, isCartReady, items, storeId, user]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    const scopedItem = { ...item, storeId: item.storeId ?? storeId };
    const existing = itemsRef.current.find((i) => isSameCartLine(i, scopedItem.productId, scopedItem.size, scopedItem.storeId, scopedItem.optionIds));

    if (!existing && getScopedItems(itemsRef.current, scopedItem.storeId).length >= MAX_CART_LINES) {
      setIsCartOpen(true);
      toast("Cart limit reached", { description: `A cart can contain up to ${MAX_CART_LINES} different items.` });
      return;
    }

    if (existing && existing.quantity >= MAX_CART_QUANTITY) {
      setIsCartOpen(true);
      toast("Maximum quantity reached", { description: `You can order up to ${MAX_CART_QUANTITY} of one cart item at a time.` });
      return;
    }

    setItems((prev) => {
      const existingLine = prev.find((i) => isSameCartLine(i, scopedItem.productId, scopedItem.size, scopedItem.storeId, scopedItem.optionIds));
      if (existingLine) {
        return prev.map((i) =>
          isSameCartLine(i, scopedItem.productId, scopedItem.size, scopedItem.storeId, scopedItem.optionIds)
            ? { ...i, quantity: clampCartQuantity(i.quantity + 1) }
            : i
        );
      }
      return [...prev, { ...scopedItem, quantity: 1 }];
    });
    setIsCartOpen(true); // Auto-open cart when adding items
    trackEvent({
      eventName: "add_to_cart",
      eventCategory: "commerce",
      productId: scopedItem.productId,
      quantity: 1,
      value: scopedItem.price,
      metadata: {
        productName: scopedItem.name,
        variant: scopedItem.size,
        previousQuantity: existing?.quantity ?? 0,
        storeId: scopedItem.storeId,
      },
    });
  }, [storeId, trackEvent]);

  const removeItem = useCallback((productId: string, size: string, storeId?: string, optionIds?: string[]) => {
    const removed = itemsRef.current.find((item) => isSameCartLine(item, productId, size, storeId, optionIds));
    setItems((prev) => prev.filter((i) => !isSameCartLine(i, productId, size, storeId, optionIds)));
    if (removed) {
      trackEvent({
        eventName: "remove_from_cart",
        eventCategory: "commerce",
        productId: removed.productId,
        quantity: removed.quantity,
        value: removed.price * removed.quantity,
        metadata: {
          productName: removed.name,
          variant: removed.size,
          storeId: removed.storeId,
        },
      });
    }
  }, [trackEvent]);

  const updateQuantity = useCallback((productId: string, size: string, quantity: number, storeId?: string, optionIds?: string[]) => {
    const existing = itemsRef.current.find((item) => isSameCartLine(item, productId, size, storeId, optionIds));
    if (quantity <= 0) {
      removeItem(productId, size, storeId, optionIds);
      return;
    }
    const nextQuantity = clampCartQuantity(quantity);
    if (quantity > MAX_CART_QUANTITY) {
      toast("Maximum quantity reached", { description: `You can order up to ${MAX_CART_QUANTITY} of one cart item at a time.` });
    }
    setItems((prev) =>
      prev.map((i) =>
        isSameCartLine(i, productId, size, storeId, optionIds) ? { ...i, quantity: nextQuantity } : i
      )
    );
    if (existing && existing.quantity !== nextQuantity) {
      trackEvent({
        eventName: "cart_quantity_changed",
        eventCategory: "commerce",
        productId: existing.productId,
        quantity: nextQuantity,
        value: existing.price * nextQuantity,
        metadata: {
          productName: existing.name,
          variant: existing.size,
          previousQuantity: existing.quantity,
          storeId: existing.storeId,
        },
      });
    }
  }, [removeItem, trackEvent]);

  const clearCart = useCallback((storeId?: string) => {
    const removedItems = storeId
      ? itemsRef.current.filter((item) => (item.storeId ?? null) === storeId)
      : [...itemsRef.current];
    if (!storeId) {
      setItems([]);
      localStorage.removeItem(getStorageKey(storeId));
      localStorage.removeItem(getTimeKey(storeId));
    } else {
      setItems((prev) => prev.filter((item) => (item.storeId ?? null) !== storeId));
    }
    if (removedItems.length > 0) {
      trackEvent({
        eventName: "clear_cart",
        eventCategory: "commerce",
        quantity: removedItems.reduce((sum, item) => sum + item.quantity, 0),
        value: removedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        metadata: {
          productIds: removedItems.map((item) => item.productId),
          clearedStoreId: storeId ?? null,
        },
      });
    }
  }, [trackEvent]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, isCartReady, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isCartOpen, setIsCartOpen, couponCode, setCouponCode }}>
      {children}
    </CartContext.Provider>
  );
};