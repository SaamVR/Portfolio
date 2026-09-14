import { createContext } from "react";

export interface CartItem {
  storeId?: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  optionIds?: string[];
  fulfillmentType?: "physical" | "digital";
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  isCartReady: boolean;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, size: string, storeId?: string, optionIds?: string[]) => void;
  updateQuantity: (productId: string, size: string, quantity: number, storeId?: string, optionIds?: string[]) => void;
  clearCart: (storeId?: string) => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);