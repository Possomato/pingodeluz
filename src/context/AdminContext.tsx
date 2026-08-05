'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  type Product,
  type Collection,
  type HomepageSection,
  type HomepageSectionId,
  type SizeTable,
  type PaymentConfig,
  DEFAULT_HOMEPAGE_CONFIG,
  DEFAULT_PAYMENT_CONFIG,
  rowToProduct,
} from '@/lib/data';
import { DEFAULT_SHIPPING_CONFIG, type ShippingConfig } from '@/lib/pricing';
import {
  upsertProductAction,
  deleteProductAction,
  setProductActiveAction,
  listAllProductsAction,
  adjustStockAction,
  upsertCollectionAction,
  deleteCollectionAction,
  upsertHomepageSectionAction,
  upsertSizeTableAction,
  deleteSizeTableAction,
  upsertPaymentConfigAction,
  upsertShippingConfigAction,
} from '@/app/actions/admin';
import {
  fetchCollections,
  fetchHomepageConfig,
  fetchSizeTables,
  fetchPaymentConfig,
  fetchShippingConfig,
} from '@/lib/data';

/**
 * Estado do painel administrativo.
 *
 * Autenticação NÃO mora mais aqui. Antes havia uma senha constante
 * (`ADMIN_PASSWORD`) comparada no navegador e um sinalizador no
 * localStorage — qualquer pessoa lia a senha no bundle e qualquer
 * pessoa podia gravar a chave à mão. Hoje quem autoriza é o servidor:
 * `requireAdmin()` no layout de /admin e em toda Server Action.
 */

interface AdminContextType {
  products: Product[];
  collections: Record<string, Collection>;
  homepageConfig: Record<HomepageSectionId, HomepageSection>;
  sizeTables: SizeTable[];
  paymentConfig: PaymentConfig;
  shippingConfig: ShippingConfig;
  loading: boolean;
  /** Mensagem da última falha de gravação; null quando está tudo certo. */
  error: string | null;
  clearError: () => void;
  reload: () => Promise<void>;

  addProduct: (p: Omit<Product, 'id'>) => Promise<string | null>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  setProductActive: (id: string, active: boolean) => Promise<void>;
  adjustStock: (productId: string, size: string, qty: number) => Promise<void>;

  addCollection: (name: [string, string]) => Promise<string | null>;
  updateCollection: (id: string, c: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  updateHomepageSection: (id: HomepageSectionId, patch: Partial<HomepageSection>) => Promise<void>;

  addSizeTable: (t: Omit<SizeTable, 'id'>) => Promise<void>;
  updateSizeTable: (id: string, t: SizeTable) => Promise<void>;
  deleteSizeTable: (id: string) => Promise<void>;

  updatePaymentConfig: (config: PaymentConfig) => Promise<void>;
  updateShippingConfig: (config: ShippingConfig) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

function slugify(input: string, fallback: string): string {
  const base = (input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || fallback;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Record<string, Collection>>({});
  const [homepageConfig, setHomepageConfig] =
    useState<Record<HomepageSectionId, HomepageSection>>(DEFAULT_HOMEPAGE_CONFIG);
  const [sizeTables, setSizeTables] = useState<SizeTable[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [rows, cols, hp, tables, pay, ship] = await Promise.all([
        // Inclui produtos despublicados: o admin precisa vê-los.
        listAllProductsAction(),
        fetchCollections(),
        fetchHomepageConfig(),
        fetchSizeTables(),
        fetchPaymentConfig(),
        fetchShippingConfig(),
      ]);
      setProducts(rows.map(rowToProduct));
      setCollections(cols);
      setHomepageConfig(hp);
      setSizeTables(tables);
      setPaymentConfig(pay);
      setShippingConfig(ship);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial do painel. `reload` grava estado só depois do await,
  // mas a regra não distingue isso da gravação síncrona.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { reload(); }, [reload]);

  /**
   * Atualiza a tela na hora e persiste em seguida. Se a gravação falhar,
   * recarrega do banco em vez de deixar o painel mostrando uma mudança
   * que não aconteceu — o comportamento anterior era `.catch(console.error)`,
   * que escondia a falha do usuário.
   */
  const persist = useCallback(
    async (action: () => Promise<void>, rollbackMessage: string): Promise<boolean> => {
      try {
        await action();
        setError(null);
        return true;
      } catch (err) {
        setError(
          err instanceof Error && err.message === 'NAO_AUTORIZADO'
            ? 'Sua sessão de administrador expirou. Entre novamente.'
            : `${rollbackMessage} ${err instanceof Error ? err.message : ''}`.trim()
        );
        await reload();
        return false;
      }
    },
    [reload]
  );

  // ─── Produtos ──────────────────────────────────────────────

  const addProduct = async (p: Omit<Product, 'id'>): Promise<string | null> => {
    const slug = slugify(p.name, 'produto');
    const id = products.some((x) => x.id === slug) ? `${slug}-${Date.now()}` : slug;
    const newProduct: Product = { ...p, id, imageUrl: p.imageUrls?.[0] ?? p.imageUrl };

    setProducts((prev) => [...prev, newProduct]);
    const ok = await persist(
      () => upsertProductAction(newProduct),
      'Não foi possível salvar o produto.'
    );

    return ok ? id : null;
  };

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;

    const merged = { ...existing, ...patch };
    const updated: Product = { ...merged, imageUrl: merged.imageUrls?.[0] ?? merged.imageUrl };

    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    await persist(() => upsertProductAction(updated), 'Não foi possível salvar o produto.');
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    await persist(() => deleteProductAction(id), 'Não foi possível excluir o produto.');
  };

  const setProductActive = async (id: string, active: boolean) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
    await persist(
      () => setProductActiveAction(id, active),
      'Não foi possível alterar a visibilidade do produto.'
    );
  };

  const adjustStock = async (productId: string, size: string, qty: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stock: { ...(p.stock ?? {}), [size]: qty } } : p
      )
    );
    await persist(
      () => adjustStockAction(productId, size, qty),
      'Não foi possível ajustar o estoque.'
    );
  };

  // ─── Coleções ──────────────────────────────────────────────

  const addCollection = async (name: [string, string]): Promise<string | null> => {
    const slug = slugify(name.join(' '), 'colecao');
    const id = collections[slug] ? `${slug}-${Date.now()}` : slug;
    const newCol: Collection = {
      id, name, eyebrow: '', tint: 'rose', intro: '', count: 0, products: [],
    };

    setCollections((prev) => ({ ...prev, [id]: newCol }));
    const ok = await persist(() => upsertCollectionAction(newCol), 'Não foi possível criar a coleção.');
    return ok ? id : null;
  };

  const updateCollection = async (id: string, patch: Partial<Collection>) => {
    const existing = collections[id];
    if (!existing) return;

    const updated: Collection = { ...existing, ...patch };
    setCollections((prev) => ({ ...prev, [id]: updated }));
    await persist(() => upsertCollectionAction(updated), 'Não foi possível salvar a coleção.');
  };

  const deleteCollection = async (id: string) => {
    setCollections((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await persist(() => deleteCollectionAction(id), 'Não foi possível excluir a coleção.');
  };

  // ─── Vitrine e configurações ───────────────────────────────

  const updateHomepageSection = async (
    id: HomepageSectionId,
    patch: Partial<HomepageSection>
  ) => {
    const existing = homepageConfig[id];
    if (!existing) return;

    const updated: HomepageSection = { ...existing, ...patch };
    setHomepageConfig((prev) => ({ ...prev, [id]: updated }));
    await persist(
      () => upsertHomepageSectionAction(updated),
      'Não foi possível salvar a vitrine.'
    );
  };

  const addSizeTable = async (t: Omit<SizeTable, 'id'>) => {
    const slug = slugify(t.name, `tabela-${Date.now()}`);
    const id = sizeTables.some((x) => x.id === slug) ? `${slug}-${Date.now()}` : slug;
    const full: SizeTable = { ...t, id };

    setSizeTables((prev) => [...prev, full]);
    await persist(() => upsertSizeTableAction(full), 'Não foi possível salvar a tabela.');
  };

  const updateSizeTable = async (id: string, t: SizeTable) => {
    setSizeTables((prev) => prev.map((x) => (x.id === id ? t : x)));
    await persist(() => upsertSizeTableAction(t), 'Não foi possível salvar a tabela.');
  };

  const deleteSizeTable = async (id: string) => {
    setSizeTables((prev) => prev.filter((x) => x.id !== id));
    await persist(() => deleteSizeTableAction(id), 'Não foi possível excluir a tabela.');
  };

  const updatePaymentConfig = async (config: PaymentConfig) => {
    setPaymentConfig(config);
    await persist(
      () => upsertPaymentConfigAction(config),
      'Não foi possível salvar as configurações de pagamento.'
    );
  };

  const updateShippingConfig = async (config: ShippingConfig) => {
    setShippingConfig(config);
    await persist(
      () => upsertShippingConfigAction(config),
      'Não foi possível salvar as configurações de frete.'
    );
  };

  return (
    <AdminContext.Provider
      value={{
        products, collections, homepageConfig, sizeTables, paymentConfig, shippingConfig,
        loading, error, clearError: () => setError(null), reload,
        addProduct, updateProduct, deleteProduct, setProductActive, adjustStock,
        addCollection, updateCollection, deleteCollection,
        updateHomepageSection,
        addSizeTable, updateSizeTable, deleteSizeTable,
        updatePaymentConfig, updateShippingConfig,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin precisa estar dentro de AdminProvider');
  return ctx;
}
