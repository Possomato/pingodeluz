import { createServiceClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { NormalizedPaymentStatus, PaymentNotification } from './types';

/**
 * Efeitos de domínio de uma notificação de pagamento.
 *
 * Não sabe qual é o provedor: recebe uma `PaymentNotification` já
 * normalizada. É aqui que status de pedido e estoque se movem.
 */

export type ProcessResult =
  | { outcome: 'processed'; orderId: string; status: string }
  | { outcome: 'duplicate'; orderId: string }
  | { outcome: 'order_not_found'; orderId: string }
  | { outcome: 'ignored'; orderId: string; reason: string };

/** Status do pedido correspondente a cada status de pagamento. */
const STATUS_MAP: Record<NormalizedPaymentStatus, string> = {
  approved: 'pago',
  pending: 'pendente',
  rejected: 'recusado',
  refunded: 'reembolsado',
  cancelled: 'cancelado',
};

/**
 * Um pedido já enviado não volta a "pago" porque o provedor reenviou um
 * evento antigo. Só avança, ou vai para um estado terminal negativo.
 */
const RANK: Record<string, number> = {
  pendente: 0,
  recusado: 1,
  cancelado: 1,
  pago: 2,
  enviado: 3,
  entregue: 4,
  reembolsado: 5,
};

function canTransition(from: string, to: string): boolean {
  if (from === to) return false;
  // Reembolso e cancelamento podem chegar a qualquer momento.
  if (to === 'reembolsado' || to === 'cancelado') return true;
  return (RANK[to] ?? 0) > (RANK[from] ?? 0);
}

export async function processPaymentNotification(
  provider: string,
  notification: PaymentNotification
): Promise<ProcessResult> {
  const service = createServiceClient();
  const { orderId, status, externalPaymentId, method } = notification;

  // 1. Idempotência. A chave inclui o status, então uma transição real
  //    passa mas uma reentrega do mesmo evento é barrada aqui.
  const eventKey = `${provider}:${notification.eventId}`;
  const { error: eventError } = await service.from('payment_events').insert({
    id: eventKey,
    provider,
    order_id: orderId,
    payload: notification.raw as Record<string, unknown>,
  });

  if (eventError) {
    // 23505 = unique_violation: já processamos este evento.
    if (eventError.code === '23505') return { outcome: 'duplicate', orderId };
    throw new Error(`Falha ao registrar evento de pagamento: ${eventError.message}`);
  }

  // 2. Carrega o pedido.
  const { data: order } = await service
    .from('orders')
    .select('id, status, items, order_number')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return { outcome: 'order_not_found', orderId };

  const currentStatus = order.status as string;
  const nextStatus = STATUS_MAP[status];

  if (!canTransition(currentStatus, nextStatus)) {
    // Ainda assim registra o identificador do pagamento, útil para suporte.
    await service
      .from('orders')
      .update({ payment_external_id: externalPaymentId, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    return {
      outcome: 'ignored',
      orderId,
      reason: `transição ${currentStatus} → ${nextStatus} não permitida`,
    };
  }

  // 3. Movimenta estoque nas transições que importam.
  const wasPaid = RANK[currentStatus] >= RANK.pago && currentStatus !== 'reembolsado';
  let needsAttention = false;
  let attentionReason: string | null = null;

  if (nextStatus === 'pago' && !wasPaid) {
    const { error } = await service.rpc('decrement_stock', {
      items: order.items,
      p_order_id: orderId,
    });

    if (error) {
      // O dinheiro já entrou: não dá para recusar o pedido. Marca para
      // resolução manual em vez de perder a venda em silêncio (ADR-3).
      needsAttention = true;
      attentionReason = `Estoque não pôde ser baixado: ${error.message}`;
    }
  }

  if ((nextStatus === 'reembolsado' || nextStatus === 'cancelado') && wasPaid) {
    const { error } = await service.rpc('restore_stock', {
      items: order.items,
      p_order_id: orderId,
    });
    if (error) {
      needsAttention = true;
      attentionReason = `Estoque não pôde ser reposto: ${error.message}`;
    }
  }

  // 4. Grava o novo estado.
  const { error: updateError } = await service
    .from('orders')
    .update({
      status: nextStatus,
      payment_provider: provider,
      payment_external_id: externalPaymentId,
      payment_method: method ?? null,
      needs_attention: needsAttention,
      attention_reason: attentionReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) throw new Error(`Falha ao atualizar pedido: ${updateError.message}`);

  revalidatePath('/perfil');
  revalidatePath(`/pedido/${orderId}`);
  revalidatePath('/admin/pedidos');

  return { outcome: 'processed', orderId, status: nextStatus };
}
