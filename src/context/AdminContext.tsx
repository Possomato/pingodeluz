'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Collection, HOME_PRODUCTS, COLLECTIONS, fetchCatalog, fetchCollections, HomepageSection, HomepageSectionId, DEFAULT_HOMEPAGE_CONFIG, fetchHomepageConfig, SizeTable, DEFAULT_SIZE_TABLES, fetchSizeTables, PaymentConfig, DEFAULT_PAYMENT_CONFIG, fetchPaymentConfig } from '@/lib/data';
import { upsertProductAction, deleteProductAction, upsertCollectionAction, deleteCollectionAction, upsertHomepageSectionAction, upsertSizeTableAction, deleteSizeTableAction, upsertPaymentConfigAction } from '@/app/actions/admin';

const ADMIN_PASSWORD = 'pingo2024';
const AUTH_KEY = 'pdl_admin_auth';

interface AdminContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  products: Product[];
  collections: Record<string, Collection>;
  addProduct: (p: Omit<Product, 'id'>) => Promise<string>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCollection: (name: [string, string]) => Promise<string>;
  updateCollection: (id: string, c: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  homepageConfig: Record<HomepageSectionId, HomepageSection>;
  updateHomepageSection: (id: HomepageSectionId, patch: Partial<HomepageSection>) => Promise<void>;
  sizeTables: SizeTable[];
  addSizeTable: (t: Omit<SizeTable, 'id'>) => Promise<void>;
  updateSizeTable: (id: string, t: SizeTable) => Promise<void>;
  deleteSizeTable: (id: string) => Promise<void>;
  paymentConfig: PaymentConfig;
  updatePaymentConfig: (config: PaymentConfig) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>(HOME_PRODUCTS);
  const [collections, setCollections] = useState<Record<string, Collection>>(COLLECTIONS);
  const [homepageConfig, setHomepageConfig] = useState<Record<HomepageSectionId, HomepageSection>>(DEFAULT_HOMEPAGE_CONFIG);
  const [sizeTables, setSizeTables] = useState<SizeTable[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem(AUTH_KEY) === 'true');
    // Load live data from Supabase
    fetchCatalog().then(data => {
      if (data.length > 0) setProducts(data);
    }).catch(() => { /* keep defaults */ });
    fetchCollections().then(data => {
      if (Object.keys(data).length > 0) setCollections(data);
    }).catch(() => { /* keep defaults */ });
    fetchHomepageConfig().then(data => setHomepageConfig(data)).catch(() => {});
    fetchSizeTables().then(setSizeTables).catch(() => {});
    fetchPaymentConfig().then(data => setPaymentConfig(data)).catch(() => {});
  }, []);

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

  const addProduct = async (p: Omit<Product, 'id'>): Promise<string> => {
    const base = (p.name ?? '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = base || 'produto';
    const taken = products.some(x => x.id === slug);
    const id = taken ? `${slug}-${Date.now()}` : slug;
    const newProduct: Product = { ...p, id, imageUrl: p.imageUrls?.[0] ?? p.imageUrl };
    setProducts(prev => [...prev, newProduct]); // optimistic
    await upsertProductAction(newProduct).catch(console.error); // persist
    return id;
  };

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    const existing = products.find(p => p.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    const updated: Product = { ...merged, imageUrl: merged.imageUrls?.[0] ?? merged.imageUrl };
    setProducts(prev => prev.map(p => p.id === id ? updated : p)); // optimistic
    await upsertProductAction(updated).catch(console.error); // persist
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id)); // optimistic
    await deleteProductAction(id).catch(console.error); // persist
  };

  const updateHomepageSection = async (id: HomepageSectionId, patch: Partial<HomepageSection>) => {
    const existing = homepageConfig[id];
    if (!existing) return;
    const updated: HomepageSection = { ...existing, ...patch };
    setHomepageConfig(prev => ({ ...prev, [id]: updated }));
    await upsertHomepageSectionAction(updated).catch(console.error);
  };

  const addSizeTable = async (t: Omit<SizeTable, 'id'>) => {
    const base = t.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';
    const taken = sizeTables.some(x => x.id === base);
    const id = (!base || taken) ? `tabela-${Date.now()}` : base;
    const full: SizeTable = { ...t, id };
    setSizeTables(prev => [...prev, full]);
    await upsertSizeTableAction(full).catch(console.error);
  };

  const updateSizeTable = async (id: string, t: SizeTable) => {
    setSizeTables(prev => prev.map(x => x.id === id ? t : x));
    await upsertSizeTableAction(t).catch(console.error);
  };

  const deleteSizeTable = async (id: string) => {
    setSizeTables(prev => prev.filter(x => x.id !== id));
    await deleteSizeTableAction(id).catch(console.error);
  };

  const deleteCollection = async (id: string) => {
    setCollections(prev => { const next = { ...prev }; delete next[id]; return next; });
    await deleteCollectionAction(id).catch(console.error);
  };

  const updatePaymentConfig = async (config: PaymentConfig) => {
    setPaymentConfig(config);
    await upsertPaymentConfigAction(config).catch(console.error);
  };

  const addCollection = async (name: [string, string]): Promise<string> => {
    const base = name[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'colecao';
    const taken = Object.keys(collections).includes(base);
    const id = taken ? `${base}-${Date.now()}` : base;
    const newCol: Collection = { id, name, eyebrow: '', tint: 'rose', intro: '', count: 0, products: [] };
    setCollections(prev => ({ ...prev, [id]: newCol }));
    await upsertCollectionAction(newCol).catch(console.error);
    return id;
  };

  const updateCollection = async (id: string, patch: Partial<Collection>) => {
    const existing = collections[id];
    if (!existing) return;
    const updated: Collection = { ...existing, ...patch };
    setCollections(prev => ({ ...prev, [id]: updated })); // optimistic
    await upsertCollectionAction(updated).catch(console.error); // persist
  };

  return (
    <AdminContext.Provider value={{ isAuthenticated, login, logout, products, collections, addProduct, updateProduct, deleteProduct, addCollection, updateCollection, deleteCollection, homepageConfig, updateHomepageSection, sizeTables, addSizeTable, updateSizeTable, deleteSizeTable, paymentConfig, updatePaymentConfig }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
