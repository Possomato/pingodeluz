import { notFound } from 'next/navigation';
import ColecaoClient from '@/components/ColecaoClient';
import { fetchCollections, AGE_GROUPS } from '@/lib/data';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collections = await fetchCollections();
  const c = collections[id];
  if (!c) return {};
  return {
    title: c.name.join(' '),
    description: c.intro,
    openGraph: c.imageUrl ? { images: [c.imageUrl] } : undefined,
  };
}

export default async function ColecaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const collections = await fetchCollections();
  const c = collections[id];
  if (!c) notFound();

  const activeAgeGroups = AGE_GROUPS
    .filter((g) => c.products.some((p) => (p.sizes ?? []).some((s) => g.sizes.includes(s))))
    .map((g) => g.label);
  const activeTypes = Array.from(new Set(c.products.map((p) => p.type).filter(Boolean))) as string[];

  return <ColecaoClient c={c} filters={['todas', ...activeAgeGroups, ...activeTypes]} />;
}
