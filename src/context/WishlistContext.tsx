import React, { createContext, useContext, useState, useCallback } from "react";

interface WishlistContextType {
  items: string[];
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  toggleItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  totalItems: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("threadbd-wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const persist = (newItems: string[]) => {
    setItems(newItems);
    localStorage.setItem("threadbd-wishlist", JSON.stringify(newItems));
  };

  const addItem = useCallback((productId: string) => {
    setItems((prev) => {
      if (prev.includes(productId)) return prev;
      const next = [...prev, productId];
      localStorage.setItem("threadbd-wishlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((id) => id !== productId);
      localStorage.setItem("threadbd-wishlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem("threadbd-wishlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWishlist = useCallback((productId: string) => items.includes(productId), [items]);

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, toggleItem, isInWishlist, totalItems: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};
