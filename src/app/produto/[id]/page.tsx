import ProdutoClient from '@/components/ProdutoClient';
import { fetchProductById, fetchSizeTableById, fetchPaymentConfig, fetchCollections } from '@/lib/data';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProductById(id);
  return { title: `${p.name} · ${p.col} | Pingo de Luz` };
}

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, paymentConfig, collections] = await Promise.all([
    fetchProductById(id),
    fetchPaymentConfig(),
    fetchCollections().catch(() => ({})),
  ]);
  const sizeTable = await fetchSizeTableById(p.sizeTableId);
  const colIntro = Object.values(collections).find(c => c.name.join(' ') === p.col)?.intro ?? '';
  return <ProdutoClient p={p} id={id} sizeTable={sizeTable} paymentConfig={paymentConfig} colIntro={colIntro} />;
}
