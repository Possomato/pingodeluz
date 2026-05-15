import ProdutoClient from '@/components/ProdutoClient';
import { fetchProductById } from '@/lib/data';

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProductById(id);
  return <ProdutoClient p={p} id={id} />;
}
