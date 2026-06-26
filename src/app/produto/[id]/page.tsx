import ProdutoClient from '@/components/ProdutoClient';
import { fetchProductById, fetchSizeTableById } from '@/lib/data';

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProductById(id);
  const sizeTable = await fetchSizeTableById(p.sizeTableId);
  return <ProdutoClient p={p} id={id} sizeTable={sizeTable} />;
}
