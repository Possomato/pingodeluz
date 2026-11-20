import { fetchCatalog, fetchCollections, fetchHomepageConfig, fetchPaymentConfig, fetchShippingConfig, fetchTestimonials } from '@/lib/data';
import { createServiceClient } from '@/lib/supabase-server';
import { countSales, pickFeatured } from '@/lib/featured';
import HomeClient from '@/components/HomeClient';

/**
 * Unidades vendidas por produto, só em pedidos pagos. Lido com o service
 * role porque pedidos são privados de cada cliente; daqui sai apenas a
 * contagem, nenhum dado pessoal. Se a consulta falhar, a home segue sem
 * ranking em vez de cair.
 */
async function fetchSales(): Promise<Record<string, number>> {
  try {
    const { data } = await createServiceClient()
      .from('orders')
      .select('items')
      .in('status', ['pago', 'enviado', 'entregue']);
    return countSales(data ?? []);
  } catch {
    return {};
  }
}

export default async function HomePage() {
  const [hpConfig, products, collections, testimonials, sales, paymentConfig, shipping] = await Promise.all([
    fetchHomepageConfig(),
    fetchCatalog(),
    fetchCollections(),
    fetchTestimonials(),
    fetchSales(),
    fetchPaymentConfig(),
    fetchShippingConfig(),
  ]);

  return (
    <HomeClient
      hpConfig={hpConfig}
      products={products}
      featured={pickFeatured(products, sales)}
      paymentConfig={paymentConfig}
      shipping={shipping}
      collections={collections}
      testimonials={testimonials}
    />
  );
}
