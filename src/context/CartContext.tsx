'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  pid: string;
  id: string;
  name: string;
  col: string;
  price: string;
  tint: string;
  size: string;
  qty: number;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: Omit<CartItem, 'qty'>) => void;
  updateQty: (idx: number, delta: number) => void;
  removeItem: (idx: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const INITIAL_CART: CartItem[] = [
  { pid: 'p1', id: 'p1', name: 'Vestido Margarida', col: 'Jardim Encantado', price: 'R$ 189', tint: 'rose', size: '2', qty: 1 },
  { pid: 'p2', id: 'p2', name: 'Macacão Explorador', col: 'Doce Aventura', price: 'R$ 159', tint: 'ochre', size: '3', qty: 1 },
];

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART);

  const cartCount = cart.reduce((n, it) => n + it.qty, 0);

  const addToCart = (item: Omit<CartItem, 'qty'>) => {
    setCart(prev => {
      const existing = prev.findIndex(p => p.pid === item.pid && p.size === item.size);
      if (existing !== -1) {
        const next = [...prev];
        next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
        return next;
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], qty: Math.max(1, next[idx].qty + delta) };
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, cartCount, addToCart, updateQty, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
