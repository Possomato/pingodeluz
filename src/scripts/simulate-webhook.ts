/**
 * Simula uma notificação de pagamento sem depender do provedor.
 *
 *   npx tsx src/scripts/simulate-webhook.ts <order_id> [status]
 *
 * Monta o payload com assinatura HMAC válida, envia ao endpoint local e
 * mostra o resultado. Enviar duas vezes o mesmo evento deve devolver
 * `duplicate` na segunda — é assim que se confere a idempotência.
 *
 * Atenção: o adaptador consulta o pagamento no provedor para montar a
 * notificação, então este script exercita a rota, a assinatura e a
 * idempotência; para exercitar a baixa de estoque de ponta a ponta use
 * as credenciais de teste do provedor com um túnel (ngrok).
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const orderId = process.argv[2];
const paymentId = process.argv[3] ?? String(Date.now());

if (!orderId) {
  console.error('uso: npx tsx src/scripts/simulate-webhook.ts <order_id> [payment_id]');
  process.exit(1);
}

const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
if (!secret) {
  console.error('MERCADOPAGO_WEBHOOK_SECRET não configurado em .env.local');
  process.exit(1);
}

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const requestId = `sim-${Date.now()}`;
const ts = String(Math.floor(Date.now() / 1000));

const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

const url = `${base}/api/webhooks/mercadopago?data.id=${paymentId}`;
const body = JSON.stringify({ type: 'payment', data: { id: paymentId } });

console.log(`→ POST ${url}`);
console.log(`  pedido: ${orderId}`);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-signature': `ts=${ts},v1=${v1}`,
    'x-request-id': requestId,
  },
  body,
});

console.log(`← ${res.status} ${await res.text()}`);

if (res.status === 401) {
  console.error('\nAssinatura recusada. Confira MERCADOPAGO_WEBHOOK_SECRET.');
}
