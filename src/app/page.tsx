import { fetchCatalog, fetchCollections, fetchHomepageConfig, HOME_PRODUCTS, DEFAULT_HOMEPAGE_CONFIG, COLLECTIONS } from '@/lib/data';
import HomeClient from '@/components/HomeClient';

export default async function HomePage() {
  const [hpConfig, products, collections] = await Promise.all([
    fetchHomepageConfig().catch(() => DEFAULT_HOMEPAGE_CONFIG),
    fetchCatalog().then(data => data.length > 0 ? data : HOME_PRODUCTS).catch(() => HOME_PRODUCTS),
    fetchCollections().then(data => Object.keys(data).length > 0 ? data : COLLECTIONS).catch(() => COLLECTIONS),
  ]);

  return <HomeClient hpConfig={hpConfig} products={products} collections={collections} />;
}
