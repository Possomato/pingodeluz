import { test, expect } from '@playwright/test';

/**
 * Webhook do Mercado Pago. A checagem de assinatura acontece antes de
 * qualquer acesso ao banco, então dá pra testar a rejeição de ponta a
 * ponta sem depender de um pedido real existir.
 */
test.describe('webhook de pagamento', () => {
  test('sem cabeçalho de assinatura, o webhook recusa com 401', async ({ request }) => {
    const res = await request.post('/api/webhooks/mercadopago', {
      data: { type: 'payment', data: { id: '123' } },
    });
    expect(res.status()).toBe(401);
  });

  test('assinatura forjada é recusada com 401', async ({ request }) => {
    const res = await request.post('/api/webhooks/mercadopago?data.id=123', {
      headers: {
        'x-signature': 'ts=1700000000,v1=assinatura-forjada-nao-bate',
        'x-request-id': 'req-abc',
      },
      data: { type: 'payment', data: { id: '123' } },
    });
    expect(res.status()).toBe(401);
  });

  test('evento que não é de pagamento não derruba a rota', async ({ request }) => {
    // Sem segredo configurado em teste, toda assinatura é recusada —
    // então isso também confirma 401 em vez de 500 por corpo inesperado.
    const res = await request.post('/api/webhooks/mercadopago', {
      data: { type: 'merchant_order' },
    });
    expect(res.status()).toBe(401);
  });
});
