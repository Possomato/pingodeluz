import { notFound } from 'next/navigation';
import GeneroClient from '@/components/GeneroClient';
import { fetchCatalog, fetchHomepageConfig, GENDER_DATA } from '@/lib/data';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = GENDER_DATA[id];
  if (!g) return {};
  return { title: `${g.label[0]} ${g.label[1]}`, description: g.intro };
}

export function generateStaticParams() {
  return Object.keys(GENDER_DATA).map((id) => ({ id }));
}

export default async function GeneroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const g = GENDER_DATA[id];
  if (!g) notFound();

  const [all, homepageConfig] = await Promise.all([fetchCatalog(), fetchHomepageConfig()]);

  const products = all.filter((p) => p.gender === id || p.gender === 'unissex');
  const heroImageUrl = homepageConfig[id as keyof typeof homepageConfig]?.imageUrls[0];

  return <GeneroClient g={g} products={products} heroImageUrl={heroImageUrl} />;
}
