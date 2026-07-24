import { createContext } from "react";

export interface CartItem {
  storeId?: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, size: string, storeId?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, storeId?: string) => void;
  clearCart: (storeId?: string) => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);
