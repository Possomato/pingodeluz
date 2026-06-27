import ColecaoClient from '@/components/ColecaoClient';
import { fetchCollections, AGE_GROUPS } from '@/lib/data';

export default async function ColecaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collections = await fetchCollections();
  const c = collections[id] ?? Object.values(collections)[0];
  const activeAgeGroups = AGE_GROUPS
    .filter(g => c.products.some(p => (p.sizes ?? []).some(s => g.sizes.includes(s))))
    .map(g => g.label);
  const activeTypes = Array.from(new Set(c.products.map(p => p.type).filter(Boolean))) as string[];
  const filters = ['todas', ...activeAgeGroups, ...activeTypes];
  return <ColecaoClient c={c} filters={filters} />;
}
