import type { MetadataRoute } from 'next';
import { fetchCatalog, fetchCollections, GENDER_DATA } from '@/lib/data';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pingodeluz.com.br';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/sobre`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/trocas`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
    ...Object.keys(GENDER_DATA).map((id) => ({
      url: `${BASE}/genero/${id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];

  try {
    const [products, collections] = await Promise.all([fetchCatalog(), fetchCollections()]);

    return [
      ...staticRoutes,
      ...Object.keys(collections).map((id) => ({
        url: `${BASE}/colecao/${id}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...products.map((p) => ({
        url: `${BASE}/produto/${p.id}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // Banco fora do ar não deve derrubar o sitemap inteiro.
    return staticRoutes;
  }
}
