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
  buildOrderBody,
  normalizeRejection,
  paidCentavosOf,
  instructionsFromOrder,
  notificationFromOrder,
} from '../mercadopago';
import type { CreatePaymentInput } from '../types';

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

const baseInput: CreatePaymentInput = {
  orderId: '3f2b8c1e-4a5d-4e6f-9a0b-1c2d3e4f5a6b',
  orderNumber: 'PDL-10001',
  items: [
    { id: 'p1', title: 'Vestido (tam. 4)', quantity: 2, unitPriceCentavos: 27000 },
    { id: 'p2', title: 'Bata (tam. 2)', quantity: 1, unitPriceCentavos: 18990 },
  ],
  totalCentavos: 2 * 27000 + 18990 + 2400,
  freightCentavos: 2400,
  discountCentavos: 0,
  payer: {
    email: 'ana@exemplo.com',
    name: 'Ana Maria de Souza',
    cpf: '123.456.789-09',
    address: { zip: '01310-100', street: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' },
  },
  method: { kind: 'pix' },
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

// ─── Checkout transparente ───────────────────────────────────

type Body = {
  type: string; processing_mode: string; total_amount: string; external_reference: string;
  payer: { email: string; first_name?: string; last_name?: string; identification: { type: string; number: string }; address?: { zip_code: string } };
  transactions: { payments: { amount: string; payment_method: Record<string, unknown> }[] };
};

test('order transparente: Pix em modo automático, valor igual ao total', () => {
  const body = buildOrderBody(baseInput) as unknown as Body;
  assert.equal(body.type, 'online');
  assert.equal(body.processing_mode, 'automatic');
  assert.equal(body.total_amount, '753.90');
  assert.equal(body.transactions.payments[0].amount, body.total_amount);
  assert.deepEqual(body.transactions.payments[0].payment_method, { id: 'pix', type: 'bank_transfer' });
  assert.match(body.external_reference, /^[0-9a-f]{32}$/);
});

test('order transparente: pagador com CPF e CEP só em dígitos, nome dividido', () => {
  const body = buildOrderBody(baseInput) as unknown as Body;
  assert.deepEqual(body.payer.identification, { type: 'CPF', number: '12345678909' });
  assert.equal(body.payer.first_name, 'Ana');
  assert.equal(body.payer.last_name, 'Maria de Souza');
  assert.equal(body.payer.address?.zip_code, '01310100');
});

test('order transparente: boleto e cartão', () => {
  const boleto = buildOrderBody({ ...baseInput, method: { kind: 'boleto' } }) as unknown as Body;
  assert.deepEqual(boleto.transactions.payments[0].payment_method, { id: 'boleto', type: 'ticket' });

  const card = buildOrderBody({
    ...baseInput,
    method: { kind: 'card', token: 'tok_123', brand: 'visa', cardType: 'credit_card', installments: 3 },
  }) as unknown as Body;
  const pm = card.transactions.payments[0].payment_method;
  assert.equal(pm.id, 'visa');
  assert.equal(pm.type, 'credit_card');
  assert.equal(pm.token, 'tok_123');
  assert.equal(pm.installments, 3);
});

test('order transparente: débito é sempre à vista', () => {
  const body = buildOrderBody({
    ...baseInput,
    method: { kind: 'card', token: 't', brand: 'debelo', cardType: 'debit_card', installments: 6 },
  }) as unknown as Body;
  assert.equal(body.transactions.payments[0].payment_method.installments, 1);
});

test('motivo da recusa traduzido para o domínio', () => {
  assert.equal(normalizeRejection('insufficient_amount'), 'insufficient_funds');
  assert.equal(normalizeRejection('rejected_by_issuer'), 'issuer');
  assert.equal(normalizeRejection('bad_filled_security_code'), 'card_data');
  assert.equal(normalizeRejection('high_risk'), 'risk');
  assert.equal(normalizeRejection('invalid_transaction_amount'), 'installments');
  assert.equal(normalizeRejection('algo_novo'), 'other');
  assert.equal(normalizeRejection(undefined), 'other');
});

test('valor pago: juros do parcelamento não viram divergência', () => {
  assert.equal(paidCentavosOf({ total_amount: '270.00', total_paid_amount: '270.00' }), 27000);
  assert.equal(paidCentavosOf({ total_amount: '270.00', total_paid_amount: '291.60' }), 27000);
  assert.equal(paidCentavosOf({ total_amount: '270.00', total_paid_amount: '100.00' }), 10000);
  assert.equal(paidCentavosOf({ total_amount: '270.00' }), undefined);
});

const pixOrder = {
  id: 'ORD01', status: 'action_required', status_detail: 'waiting_transfer',
  external_reference: '3f2b8c1e4a5d4e6f9a0b1c2d3e4f5a6b', total_amount: '27.00', total_paid_amount: '0.00',
  transactions: { payments: [{
    date_of_expiration: '2026-11-15T13:40:33.658+00:00',
    payment_method: { id: 'pix', type: 'bank_transfer', qr_code: '000201…', qr_code_base64: 'iVBOR…', ticket_url: 'https://mp/x' },
  }] },
} as unknown as Parameters<typeof instructionsFromOrder>[0];

test('instruções: Pix com copia e cola, QR e validade', () => {
  assert.deepEqual(instructionsFromOrder(pixOrder), {
    kind: 'pix', code: '000201…', qrCodeBase64: 'iVBOR…', expiresAt: '2026-11-15T13:40:33.658+00:00',
  });
});

test('instruções: boleto com link e linha digitável; cartão não tem', () => {
  const boleto = { ...pixOrder, transactions: { payments: [{ payment_method: { id: 'boleto', type: 'ticket', ticket_url: 'https://mp/b', digitable_line: '2379' } }] } } as typeof pixOrder;
  const r = instructionsFromOrder(boleto);
  assert.equal(r?.kind, 'boleto');
  assert.equal(r?.kind === 'boleto' && r.url, 'https://mp/b');
  assert.equal(r?.kind === 'boleto' && r.digitableLine, '2379');

  const card = { ...pixOrder, transactions: { payments: [{ payment_method: { id: 'visa', type: 'credit_card' } }] } } as typeof pixOrder;
  assert.equal(instructionsFromOrder(card), null);
});

test('notificação a partir da order: pedido, status e método', () => {
  const n = notificationFromOrder(pixOrder);
  assert.equal(n?.orderId, '3f2b8c1e-4a5d-4e6f-9a0b-1c2d3e4f5a6b');
  assert.equal(n?.status, 'pending');
  assert.equal(n?.method, 'pix');
  assert.equal(n?.eventId, 'ORD01:action_required:waiting_transfer');
  assert.equal(notificationFromOrder({ ...pixOrder, external_reference: undefined } as typeof pixOrder), null);
});
