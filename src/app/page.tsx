import { fetchCatalog, fetchHomepageConfig, HOME_PRODUCTS, DEFAULT_HOMEPAGE_CONFIG } from '@/lib/data';
import HomeClient from '@/components/HomeClient';

export default async function HomePage() {
  const [hpConfig, products] = await Promise.all([
    fetchHomepageConfig().catch(() => DEFAULT_HOMEPAGE_CONFIG),
    fetchCatalog().then(data => data.length > 0 ? data : HOME_PRODUCTS).catch(() => HOME_PRODUCTS),
  ]);

  return <HomeClient hpConfig={hpConfig} products={products} />;
}
