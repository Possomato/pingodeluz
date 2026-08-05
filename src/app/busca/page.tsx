import { fetchCatalog } from '@/lib/data';
import { searchProducts } from '@/lib/search';
import BuscaClient from '@/components/BuscaClient';

export const metadata = { title: 'Busca' };

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;

  const catalog = await fetchCatalog();
  const results = q.trim() ? searchProducts(q, catalog) : [];

  return <BuscaClient query={q} results={results} />;
}
