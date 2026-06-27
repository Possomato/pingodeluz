import GeneroClient from '@/components/GeneroClient';
import { fetchCatalog, fetchHomepageConfig, GENDER_DATA, HOME_PRODUCTS } from '@/lib/data';

export default async function GeneroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = GENDER_DATA[id as keyof typeof GENDER_DATA] ?? GENDER_DATA[Object.keys(GENDER_DATA)[0] as keyof typeof GENDER_DATA];
  const [all, homepageConfig] = await Promise.all([
    fetchCatalog().then(d => d.length > 0 ? d : HOME_PRODUCTS).catch(() => HOME_PRODUCTS),
    fetchHomepageConfig(),
  ]);
  const products = all.filter(p => p.gender === id || p.gender === 'unissex');
  const heroImageUrl = homepageConfig[id as keyof typeof homepageConfig]?.imageUrls[0];
  return <GeneroClient g={g} products={products} heroImageUrl={heroImageUrl} />;
}
