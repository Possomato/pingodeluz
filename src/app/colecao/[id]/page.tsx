import ColecaoClient from '@/components/ColecaoClient';
import { fetchCollections } from '@/lib/data';

export default async function ColecaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collections = await fetchCollections();
  const c = collections[id] ?? Object.values(collections)[0];
  const filters = ['todas', '0–2 anos', '3–6 anos', '7–12 anos', 'vestidos', 'conjuntos', 'sob encomenda'];
  return <ColecaoClient c={c} filters={filters} />;
}
