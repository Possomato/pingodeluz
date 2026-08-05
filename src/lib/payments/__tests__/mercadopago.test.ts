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
