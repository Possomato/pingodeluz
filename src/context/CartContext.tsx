'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface CartItem {
  /** Id do produto. */
  pid: string;
  name: string;
  col: string;
  priceCentavos: number;
  tint: string;
  size: string;
  qty: number;
  imageUrl?: string;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  subtotalCentavos: number;
  /** Pronto quando o carrinho já foi lido do storage — evita piscar vazio. */
  hydrated: boolean;
  addToCart: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  updateQty: (pid: string, size: string, delta: number) => void;
  setQty: (pid: string, size: string, qty: number) => void;
  removeItem: (pid: string, size: string) => void;
  clearCart: () => void;

  /**
   * Cupom digitado na sacola. Fica junto do carrinho para a pessoa não
   * precisar digitar de novo no checkout — a validação de verdade é
   * sempre do servidor, aqui guardamos só o código.
   */
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;

  /** Mini-sacola que abre ao adicionar uma peça. */
  bagOpen: boolean;
  openBag: () => void;
  closeBag: () => void;
  /** Chave `pid-size` da última peça adicionada, para destacar na mini-sacola. */
  lastAddedKey: string | null;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'pdl_cart_v1';
const COUPON_KEY = 'pdl_coupon_v1';

/**
 * O carrinho vive no navegador até o checkout. Um pedido só existe no
 * banco depois que o cliente confirma — carrinho de visitante não
 * precisa de conta nem de round-trip ao servidor.
 */
function readStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Descarta itens de formatos antigos (quando preço era string).
    return parsed.filter(
      (i): i is CartItem =>
        i &&
        typeof i.pid === 'string' &&
        typeof i.size === 'string' &&
        typeof i.priceCentavos === 'number' &&
        typeof i.qty === 'number'
    );
  } catch {
    return [];
  }
}

function readStoredCoupon(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COUPON_KEY);
    return raw && raw.trim() ? raw.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [couponCode, setCouponState] = useState<string | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);

  // Ler no efeito, não no useState inicial: o servidor não tem
  // localStorage, e divergir entre servidor e cliente quebraria a
  // hidratação. É sincronização com um sistema externo na montagem —
  // exatamente o caso em que a regra abaixo gera falso positivo.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(readStoredCart());
    setCouponState(readStoredCoupon());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage cheio ou bloqueado: o carrinho segue funcionando na sessão.
    }
  }, [cart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (couponCode) window.localStorage.setItem(COUPON_KEY, couponCode);
      else window.localStorage.removeItem(COUPON_KEY);
    } catch {
      // idem
    }
  }, [couponCode, hydrated]);

  const cartCount = cart.reduce((n, it) => n + it.qty, 0);
  const subtotalCentavos = cart.reduce((n, it) => n + it.priceCentavos * it.qty, 0);

  const addToCart = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.pid === item.pid && p.size === item.size);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty }];
    });
    setLastAddedKey(`${item.pid}-${item.size}`);
  }, []);

  const setQty = useCallback((pid: string, size: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((it) => !(it.pid === pid && it.size === size))
        : prev.map((it) => (it.pid === pid && it.size === size ? { ...it, qty } : it))
    );
  }, []);

  const updateQty = useCallback((pid: string, size: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((it) => {
        if (it.pid !== pid || it.size !== size) return [it];
        const qty = it.qty + delta;
        return qty <= 0 ? [] : [{ ...it, qty }];
      })
    );
  }, []);

  const removeItem = useCallback((pid: string, size: string) => {
    setCart((prev) => prev.filter((it) => !(it.pid === pid && it.size === size)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCouponState(null);
  }, []);

  const setCouponCode = useCallback((code: string | null) => {
    setCouponState(code ? code.trim().toUpperCase() || null : null);
  }, []);

  const openBag = useCallback(() => setBagOpen(true), []);
  const closeBag = useCallback(() => setBagOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        subtotalCentavos,
        hydrated,
        addToCart,
        updateQty,
        setQty,
        removeItem,
        clearCart,
        couponCode,
        setCouponCode,
        bagOpen,
        openBag,
        closeBag,
        lastAddedKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de CartProvider');
  return ctx;
}
