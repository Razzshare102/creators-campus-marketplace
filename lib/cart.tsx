'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Plan, Product } from './types';

export interface CartItem {
  productId: string;
  planId: string;
  productName: string;
  planName: string;
  price: number;
  durationMonths: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, plan: Plan) => void;
  removeItem: (planId: string) => void;
  updateQuantity: (planId: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'cc-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt cart
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      addItem: (product, plan) => {
        setItems((prev) => {
          const existing = prev.find((i) => i.planId === plan.id);
          if (existing) {
            return prev.map((i) =>
              i.planId === plan.id ? { ...i, quantity: i.quantity + 1 } : i,
            );
          }
          return [
            ...prev,
            {
              productId: product.id,
              planId: plan.id,
              productName: product.name,
              planName: plan.name,
              price: plan.price,
              durationMonths: plan.duration_months,
              quantity: 1,
            },
          ];
        });
      },
      removeItem: (planId) => setItems((prev) => prev.filter((i) => i.planId !== planId)),
      updateQuantity: (planId, quantity) =>
        setItems((prev) =>
          quantity <= 0
            ? prev.filter((i) => i.planId !== planId)
            : prev.map((i) => (i.planId === planId ? { ...i, quantity } : i)),
        ),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
