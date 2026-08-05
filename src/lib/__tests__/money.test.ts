import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCentavos, parseCentavosFromInput, centavosToInput } from '../money';

test('formata centavos redondos sem casas decimais', () => {
  assert.equal(formatCentavos(18900), 'R$ 189');
  assert.equal(formatCentavos(0), 'R$ 0');
  assert.equal(formatCentavos(100000), 'R$ 1.000');
});

test('formata centavos quebrados com duas casas', () => {
  assert.equal(formatCentavos(18990), 'R$ 189,90');
  assert.equal(formatCentavos(10), 'R$ 0,10');
  assert.equal(formatCentavos(123456), 'R$ 1.234,56');
});

test('parseia entrada humana em centavos', () => {
  assert.equal(parseCentavosFromInput('189,90'), 18990);
  assert.equal(parseCentavosFromInput('R$ 189'), 18900);
  assert.equal(parseCentavosFromInput('1.234,56'), 123456);
  assert.equal(parseCentavosFromInput('189.90'), 18990);
  assert.equal(parseCentavosFromInput('189'), 18900);
});

test('entrada inválida vira zero em vez de NaN', () => {
  assert.equal(parseCentavosFromInput(''), 0);
  assert.equal(parseCentavosFromInput('abc'), 0);
  assert.equal(parseCentavosFromInput('R$'), 0);
});

test('arredonda em vez de truncar', () => {
  assert.equal(parseCentavosFromInput('0,005'), 1);
  assert.equal(parseCentavosFromInput('10,999'), 1100);
});

test('centavosToInput faz o caminho de volta para o formulário', () => {
  assert.equal(centavosToInput(18990), '189,90');
  assert.equal(centavosToInput(18900), '189,00');
  assert.equal(centavosToInput(0), '0,00');
});

test('ida e volta preserva o valor', () => {
  for (const c of [0, 1, 999, 18990, 123456]) {
    assert.equal(parseCentavosFromInput(centavosToInput(c)), c);
  }
});
