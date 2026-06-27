import ProdutoClient from '@/components/ProdutoClient';
import { fetchProductById, fetchSizeTableById, fetchPaymentConfig } from '@/lib/data';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProductById(id);
  return { title: `${p.name} · ${p.col} | Pingo de Luz` };
}

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, paymentConfig] = await Promise.all([
    fetchProductById(id),
    fetchPaymentConfig(),
  ]);
  const sizeTable = await fetchSizeTableById(p.sizeTableId);
  return <ProdutoClient p={p} id={id} sizeTable={sizeTable} paymentConfig={paymentConfig} />;
}
