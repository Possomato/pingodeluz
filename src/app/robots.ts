import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pingodeluz.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Áreas privadas ou sem valor de busca.
      disallow: ['/admin', '/api', '/checkout', '/carrinho', '/perfil', '/confirmacao', '/pedido'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
