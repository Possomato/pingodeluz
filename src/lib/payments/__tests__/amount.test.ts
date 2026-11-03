import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reaisToCentavos, paidAmountMatches } from '../amount';

test('converte reais do provedor para centavos sem erro de ponto flutuante', () => {
  assert.equal(reaisToCentavos(189.9), 18990);
  assert.equal(reaisToCentavos(0.1 + 0.2), 30);
  assert.equal(reaisToCentavos(270), 27000);
});

test('valor ausente ou inválido vira undefined', () => {
  assert.equal(reaisToCentavos(undefined), undefined);
  assert.equal(reaisToCentavos(null), undefined);
  assert.equal(reaisToCentavos(Number.NaN), undefined);
});

test('valor igual ao total do pedido confere', () => {
  assert.equal(paidAmountMatches(29900, 29900), true);
});

test('valor pago menor que o total não confere', () => {
  assert.equal(paidAmountMatches(100, 29900), false);
});

test('valor pago maior que o total também não confere', () => {
  assert.equal(paidAmountMatches(30000, 29900), false);
});

test('sem valor informado pelo provedor não há como contestar', () => {
  assert.equal(paidAmountMatches(undefined, 29900), true);
});
