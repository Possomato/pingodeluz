'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Collection, HOME_PRODUCTS, COLLECTIONS } from '@/lib/data';

const ADMIN_PASSWORD = 'pingo2024';
const AUTH_KEY = 'pdl_admin_auth';
const CATALOG_KEY = 'pdl_admin_catalog';
const COLLECTIONS_KEY = 'pdl_admin_collections';

interface AdminContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  products: Product[];
  collections: Record<string, Collection>;
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateCollection: (id: string, c: Partial<Collection>) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>(HOME_PRODUCTS);
  const [collections, setCollections] = useState<Record<string, Collection>>(COLLECTIONS);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem(AUTH_KEY) === 'true');
    try {
      const cat = localStorage.getItem(CATALOG_KEY);
      if (cat) setProducts(JSON.parse(cat));
      const cols = localStorage.getItem(COLLECTIONS_KEY);
      if (cols) setCollections(JSON.parse(cols));
    } catch { /* use defaults */ }
  }, []);

  const persist = (next: Product[], nextCols: Record<string, Collection>) => {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(next));
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(nextCols));
  };

  const login = (password: string) => {
    if (password !== ADMIN_PASSWORD) return false;
    localStorage.setItem(AUTH_KEY, 'true');
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  };

  const addProduct = (p: Omit<Product, 'id'>) => {
    const id = 'adm-' + Date.now();
    const next = [...products, { ...p, id }];
    setProducts(next);
    persist(next, collections);
  };

  const updateProduct = (id: string, patch: Partial<Product>) => {
    const next = products.map(p => p.id === id ? { ...p, ...patch } : p);
    setProducts(next);
    persist(next, collections);
  };

  const deleteProduct = (id: string) => {
    const next = products.filter(p => p.id !== id);
    setProducts(next);
    persist(next, collections);
  };

  const updateCollection = (id: string, patch: Partial<Collection>) => {
    const next = { ...collections, [id]: { ...collections[id], ...patch } };
    setCollections(next);
    persist(products, next);
  };

  return (
    <AdminContext.Provider value={{ isAuthenticated, login, logout, products, collections, addProduct, updateProduct, deleteProduct, updateCollection }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
