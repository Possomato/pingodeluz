import ProdutoClient from '@/components/ProdutoClient';
import { fetchProductById, fetchSizeTableById, fetchPaymentConfig } from '@/lib/data';

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, paymentConfig] = await Promise.all([
    fetchProductById(id),
    fetchPaymentConfig(),
  ]);
  const sizeTable = await fetchSizeTableById(p.sizeTableId);
  return <ProdutoClient p={p} id={id} sizeTable={sizeTable} paymentConfig={paymentConfig} />;
}
