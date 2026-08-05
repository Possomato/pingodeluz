import { notFound } from 'next/navigation';
import ProdutoClient from '@/components/ProdutoClient';
import {
  fetchProductById,
  fetchSizeTableById,
  fetchPaymentConfig,
  fetchCollections,
  fetchCatalog,
  fetchShippingConfig,
  isSoldOut,
} from '@/lib/data';
import { formatCentavos } from '@/lib/money';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProductById(id);
  if (!p) return { title: 'Produto não encontrado' };

  return {
    title: `${p.name} · ${p.col}`,
    description: p.desc ?? `${p.name} — ${formatCentavos(p.priceCentavos)}`,
    openGraph: {
      title: p.name,
      description: p.desc ?? '',
      images: p.imageUrl ? [p.imageUrl] : [],
      type: 'website',
    },
  };
}

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [p, paymentConfig, collections, catalog, shipping] = await Promise.all([
    fetchProductById(id),
    fetchPaymentConfig(),
    fetchCollections(),
    fetchCatalog(),
    fetchShippingConfig(),
  ]);

  if (!p || !p.active) notFound();

  const sizeTable = await fetchSizeTableById(p.sizeTableId);
  const collection = Object.values(collections).find(
    (c) => c.id === p.collectionId || c.name.join(' ') === p.col
  );

  // Sugestões: mesma coleção primeiro, completando com o resto do catálogo.
  const others = catalog.filter((r) => r.id !== id);
  const sameCollection = others.filter((r) => r.col === p.col);
  const related = [...sameCollection, ...others.filter((r) => r.col !== p.col)].slice(0, 4);

  // Dados estruturados para o Google entender preço e disponibilidade.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.desc ?? '',
    image: p.imageUrls?.length ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [],
    brand: { '@type': 'Brand', name: 'Pingo de Luz' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: (p.priceCentavos / 100).toFixed(2),
      availability: isSoldOut(p)
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProdutoClient
        p={p}
        id={id}
        sizeTable={sizeTable}
        paymentConfig={paymentConfig}
        colIntro={collection?.intro ?? ''}
        related={related}
        shippingInfo={shipping.shippingInfo}
      />
    </>
  );
}
