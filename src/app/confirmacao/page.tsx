import { redirect } from 'next/navigation';
import { getMyOrderAction } from '@/app/actions/orders';
import ConfirmacaoClient from '@/components/ConfirmacaoClient';

export const metadata = { title: 'Pedido confirmado', robots: { index: false } };

export default async function ConfirmacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; pending?: string }>;
}) {
  const { order_id: orderId, pending } = await searchParams;
  if (!orderId) redirect('/');

  // Lido pelo servidor com a sessão do cliente: a policy "own orders read"
  // garante que ninguém veja o pedido de outra pessoa trocando a URL.
  const order = await getMyOrderAction(orderId);
  if (!order) redirect('/');

  return <ConfirmacaoClient order={order} pendingHint={pending === 'true'} />;
}
