import { getPaymentGateway } from '@/lib/payments';
import { processPaymentNotification } from '@/lib/payments/process-notification';

/**
 * Webhook do Mercado Pago.
 *
 * De propósito, um wrapper fino: verificar assinatura e traduzir o
 * corpo é responsabilidade do adaptador; aplicar os efeitos é do
 * `processPaymentNotification`. Trocar de provedor significa copiar
 * este arquivo e mudar o nome da pasta.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const gateway = getPaymentGateway();

  const verification = gateway.verifyWebhook(request, rawBody);
  if (!verification.valid) {
    console.error('[webhook] assinatura inválida:', verification.reason);
    return new Response('Invalid signature', { status: 401 });
  }

  try {
    const notification = await gateway.parseNotification(rawBody, request);

    // Evento que não interessa (ordem de comércio, assinatura…).
    // Responder 200 evita que o provedor fique reenviando.
    if (!notification) return new Response('ignored', { status: 200 });

    const result = await processPaymentNotification(gateway.provider, notification);

    if (result.outcome === 'order_not_found') {
      console.error('[webhook] pedido inexistente:', result.orderId);
    }

    return Response.json(result, { status: 200 });
  } catch (err) {
    // 500 faz o provedor tentar de novo — o que é desejável, já que o
    // registro de idempotência impede duplicar o efeito.
    console.error('[webhook] falha ao processar:', err);
    return new Response('Error processing payment', { status: 500 });
  }
}
