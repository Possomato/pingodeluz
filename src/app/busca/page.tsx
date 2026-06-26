import { fetchCatalog, HOME_PRODUCTS } from '@/lib/data';
import { searchProducts } from '@/lib/search';
import BuscaClient from '@/components/BuscaClient';

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const raw = await fetchCatalog().catch(() => HOME_PRODUCTS);
  const catalog = raw.length > 0 ? raw : HOME_PRODUCTS;
  const results = q.trim() ? searchProducts(q, catalog) : [];
  return <BuscaClient query={q} results={results} />;
}
