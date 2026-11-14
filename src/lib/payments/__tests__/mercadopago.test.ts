import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  normalizeStatus,
  normalizeMethod,
  verifyMercadoPagoSignature,
} from '../mercadopago';

const SECRET = 'segredo-de-teste';

function signedParams(over: Partial<{ dataId: string; requestId: string; ts: string }> = {}) {
  const dataId = over.dataId ?? '123456789';
  const requestId = over.requestId ?? 'req-abc';
  const ts = over.ts ?? '1700000000';
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', SECRET).update(manifest).digest('hex');
  return { xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secret: SECRET };
}

// ─── Normalização de status ──────────────────────────────────

test('status aprovado', () => {
  assert.equal(normalizeStatus('approved'), 'approved');
});

test('status recusado e cancelado são distintos', () => {
  assert.equal(normalizeStatus('rejected'), 'rejected');
  assert.equal(normalizeStatus('cancelled'), 'cancelled');
});

test('estorno e chargeback viram refunded', () => {
  assert.equal(normalizeStatus('refunded'), 'refunded');
  assert.equal(normalizeStatus('charged_back'), 'refunded');
});

test('estados intermediários e desconhecidos viram pending', () => {
  assert.equal(normalizeStatus('in_process'), 'pending');
  assert.equal(normalizeStatus('in_mediation'), 'pending');
  assert.equal(normalizeStatus('pending'), 'pending');
  assert.equal(normalizeStatus(undefined), 'pending');
  assert.equal(normalizeStatus('algo_que_o_mp_inventar'), 'pending');
});

// ─── Normalização de método ──────────────────────────────────

test('métodos de pagamento normalizados', () => {
  assert.equal(normalizeMethod('pix'), 'pix');
  assert.equal(normalizeMethod('bolbradesco'), 'boleto');
  assert.equal(normalizeMethod('debvisa'), 'debit_card');
  assert.equal(normalizeMethod('master'), 'credit_card');
  assert.equal(normalizeMethod(undefined), undefined);
});

// ─── Assinatura do webhook ───────────────────────────────────

test('assinatura válida é aceita', () => {
  assert.equal(verifyMercadoPagoSignature(signedParams()).valid, true);
});

test('assinatura de outro payload é recusada', () => {
  const params = { ...signedParams(), dataId: '999999' };
  const result = verifyMercadoPagoSignature(params);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'SIGNATURE_MISMATCH');
});

test('assinatura com segredo errado é recusada', () => {
  const result = verifyMercadoPagoSignature({ ...signedParams(), secret: 'outro-segredo' });
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'SIGNATURE_MISMATCH');
});

test('sem segredo configurado nada é aceito', () => {
  const result = verifyMercadoPagoSignature({ ...signedParams(), secret: '' });
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'MISSING_SECRET');
});

test('header ausente ou malformado é recusado', () => {
  assert.equal(
    verifyMercadoPagoSignature({ ...signedParams(), xSignature: '' }).reason,
    'MISSING_SIGNATURE'
  );
  assert.equal(
    verifyMercadoPagoSignature({ ...signedParams(), xSignature: 'ts=123' }).reason,
    'MALFORMED_SIGNATURE'
  );
});

test('assinatura de tamanho diferente não quebra a comparação', () => {
  const result = verifyMercadoPagoSignature({
    ...signedParams(),
    xSignature: 'ts=1700000000,v1=abc',
  });
  assert.equal(result.valid, false);
});

// ─── API de Orders ───────────────────────────────────────────

import {
  normalizeOrderStatus,
  toExternalReference,
  fromExternalReference,
  buildOrderLines,
} from '../mercadopago';
import type { CreateCheckoutInput } from '../types';

test('order: status processado/creditado é aprovado', () => {
  assert.equal(normalizeOrderStatus('processed', 'accredited'), 'approved');
});

test('order: estorno total e chargeback viram refunded; parcial segue pago', () => {
  assert.equal(normalizeOrderStatus('processed', 'refunded'), 'refunded');
  assert.equal(normalizeOrderStatus('processed', 'charged_back'), 'refunded');
  assert.equal(normalizeOrderStatus('processed', 'partially_refunded'), 'approved');
});

test('order: falha, cancelamento e estados intermediários', () => {
  assert.equal(normalizeOrderStatus('failed', 'processing_error'), 'rejected');
  assert.equal(normalizeOrderStatus('canceled', 'canceled'), 'cancelled');
  assert.equal(normalizeOrderStatus('created', 'created'), 'pending');
  assert.equal(normalizeOrderStatus('action_required', 'waiting_payment'), 'pending');
  assert.equal(normalizeOrderStatus('processing', 'in_process'), 'pending');
  assert.equal(normalizeOrderStatus(undefined), 'pending');
});

test('order: método vem do tipo quando o id não basta', () => {
  assert.equal(normalizeMethod('pix', 'bank_transfer'), 'pix');
  assert.equal(normalizeMethod('bolbradesco', 'ticket'), 'boleto');
  assert.equal(normalizeMethod('visa', 'debit_card'), 'debit_card');
  assert.equal(normalizeMethod('visa', 'credit_card'), 'credit_card');
  assert.equal(normalizeMethod(undefined, 'credit_card'), 'credit_card');
});

test('referência externa: UUID vai sem hífens e volta igual', () => {
  const id = '3f2b8c1e-4a5d-4e6f-9a0b-1c2d3e4f5a6b';
  const ref = toExternalReference(id);
  assert.match(ref, /^[0-9a-f]{32}$/);
  assert.equal(fromExternalReference(ref), id);
  assert.equal(fromExternalReference(ref.toUpperCase()), id);
  assert.equal(fromExternalReference('outra-coisa'), 'outra-coisa');
});

test('assinatura de order aceita data.id em minúsculas', () => {
  const lower = signedParams({ dataId: 'ord01jyh1z1yjn' });
  assert.equal(verifyMercadoPagoSignature({ ...lower, dataId: 'ORD01JYH1Z1YJN' }).valid, true);
  const upper = signedParams({ dataId: 'ORD01JYH1Z1YJN' });
  assert.equal(verifyMercadoPagoSignature(upper).valid, true);
});

const baseInput: CreateCheckoutInput = {
  orderId: '3f2b8c1e-4a5d-4e6f-9a0b-1c2d3e4f5a6b',
  orderNumber: 'PDL-10001',
  items: [
    { id: 'p1', title: 'Vestido (tam. 4)', quantity: 2, unitPriceCentavos: 27000 },
    { id: 'p2', title: 'Bata (tam. 2)', quantity: 1, unitPriceCentavos: 18990 },
  ],
  totalCentavos: 2 * 27000 + 18990 + 2400,
  freightCentavos: 2400,
  discountCentavos: 0,
  payerEmail: 'ana@exemplo.com',
  successUrl: 's', failureUrl: 'f', pendingUrl: 'p', notificationUrl: 'n',
};

const sumLines = (lines: ReturnType<typeof buildOrderLines>) =>
  lines.reduce((n, l) => n + Math.round(Number(l.unit_price) * 100) * l.quantity, 0);

test('itens da order: sem desconto, peças e frete separados somando o total', () => {
  const lines = buildOrderLines(baseInput);
  assert.equal(lines.length, 3);
  assert.equal(lines[2].external_code, 'frete');
  assert.equal(lines[1].unit_price, '189.90');
  assert.equal(sumLines(lines), baseInput.totalCentavos);
});

test('itens da order: com desconto, uma linha com o total final', () => {
  const input = { ...baseInput, discountCentavos: 5000, totalCentavos: baseInput.totalCentavos - 5000 };
  const lines = buildOrderLines(input);
  assert.equal(lines.length, 1);
  assert.equal(sumLines(lines), input.totalCentavos);
});

test('itens da order: total que não fecha cai na linha única', () => {
  const input = { ...baseInput, totalCentavos: baseInput.totalCentavos + 1 };
  const lines = buildOrderLines(input);
  assert.equal(lines.length, 1);
  assert.equal(sumLines(lines), input.totalCentavos);
});
