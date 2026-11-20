import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDiscount, validateCoupon, type Coupon } from '../coupon';
import { computeFreight, computeTotals, computePixDiscount, pixPriceCentavos } from '../pricing';
import { calcInstallments, maxInstallmentsFor, type PaymentConfig } from '../data';
import type { ShippingConfig } from '../pricing';

const SHIPPING: ShippingConfig = {
  flatCentavos: 2400,
  freeAboveCentavos: 25000,
  pixDiscountPercent: 5,
  shippingInfo: 'Envio em até 3 dias úteis.',
};

function coupon(over: Partial<Coupon> = {}): Coupon {
  return {
    code: 'BEMVINDO',
    kind: 'percent',
    value: 10,
    minSubtotalCentavos: 0,
    maxUses: null,
    usedCount: 0,
    expiresAt: null,
    active: true,
    ...over,
  };
}

// ─── Frete ───────────────────────────────────────────────────

test('frete fixo abaixo do limite de gratuidade', () => {
  assert.equal(computeFreight(10000, SHIPPING), 2400);
});

test('frete grátis a partir do limite', () => {
  assert.equal(computeFreight(25000, SHIPPING), 0);
  assert.equal(computeFreight(30000, SHIPPING), 0);
});

test('carrinho vazio não cobra frete', () => {
  assert.equal(computeFreight(0, SHIPPING), 0);
});

// ─── Cupons ──────────────────────────────────────────────────

test('cupom percentual desconta a fração do subtotal', () => {
  assert.equal(computeDiscount(coupon({ kind: 'percent', value: 10 }), 20000), 2000);
});

test('cupom fixo desconta o valor em centavos', () => {
  assert.equal(computeDiscount(coupon({ kind: 'fixed', value: 5000 }), 20000), 5000);
});

test('desconto nunca ultrapassa o subtotal', () => {
  assert.equal(computeDiscount(coupon({ kind: 'fixed', value: 99000 }), 20000), 20000);
  assert.equal(computeDiscount(coupon({ kind: 'percent', value: 150 }), 20000), 20000);
});

test('cupom válido passa na validação', () => {
  assert.equal(validateCoupon(coupon(), 20000).ok, true);
});

test('cupom inativo é recusado', () => {
  const r = validateCoupon(coupon({ active: false }), 20000);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, 'INATIVO');
});

test('cupom expirado é recusado', () => {
  const r = validateCoupon(coupon({ expiresAt: '2020-01-01T00:00:00Z' }), 20000);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, 'EXPIRADO');
});

test('cupom esgotado é recusado', () => {
  const r = validateCoupon(coupon({ maxUses: 5, usedCount: 5 }), 20000);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, 'ESGOTADO');
});

test('subtotal abaixo do mínimo é recusado', () => {
  const r = validateCoupon(coupon({ minSubtotalCentavos: 30000 }), 20000);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, 'MINIMO_NAO_ATINGIDO');
});

test('cupom sem limite de uso continua válido após muitos usos', () => {
  assert.equal(validateCoupon(coupon({ maxUses: null, usedCount: 999 }), 20000).ok, true);
});

// ─── Totais ──────────────────────────────────────────────────

test('total soma frete e subtrai desconto', () => {
  const t = computeTotals(10000, SHIPPING, coupon({ kind: 'fixed', value: 1000 }));
  assert.deepEqual(t, {
    subtotalCentavos: 10000,
    freightCentavos: 2400,
    discountCentavos: 1000,
    pixDiscountCentavos: 0,
    totalCentavos: 11400,
  });
});

test('o desconto do cupom conta antes da regra de frete grátis', () => {
  // Subtotal de 26000 já teria frete grátis; o cupom não deve reintroduzir frete.
  const t = computeTotals(26000, SHIPPING, coupon({ kind: 'fixed', value: 5000 }));
  assert.equal(t.freightCentavos, 0);
  assert.equal(t.totalCentavos, 21000);
});

test('sem cupom o desconto é zero', () => {
  const t = computeTotals(10000, SHIPPING, null);
  assert.equal(t.discountCentavos, 0);
  assert.equal(t.totalCentavos, 12400);
});

test('total nunca fica negativo', () => {
  const t = computeTotals(1000, SHIPPING, coupon({ kind: 'fixed', value: 99000 }));
  assert.ok(t.totalCentavos >= 0);
});

// ─── Pix ─────────────────────────────────────────────────────

test('Pix: 5% sobre as peças, sem tocar no frete', () => {
  const t = computeTotals(20000, SHIPPING, null, { pix: true });
  assert.equal(t.freightCentavos, 2400);
  assert.equal(t.pixDiscountCentavos, 1000);
  assert.equal(t.totalCentavos, 20000 + 2400 - 1000);
});

test('Pix: desconto calculado depois do cupom', () => {
  const t = computeTotals(30000, SHIPPING, coupon({ value: 10 }), { pix: true });
  assert.equal(t.discountCentavos, 3000);
  assert.equal(t.pixDiscountCentavos, 1350);
  assert.equal(t.totalCentavos, 30000 - 3000 - 1350);
});

test('Pix: outros meios não têm desconto', () => {
  assert.equal(computeTotals(27000, SHIPPING, null).pixDiscountCentavos, 0);
  assert.equal(computeTotals(27000, SHIPPING, null, { pix: false }).totalCentavos, 27000);
});

test('Pix: preço da vitrine e limites do percentual', () => {
  assert.equal(pixPriceCentavos(27000, SHIPPING), 25650);
  assert.equal(computePixDiscount(27000, 0, { pixDiscountPercent: 0 }), 0);
  assert.equal(computePixDiscount(27000, 30000, SHIPPING), 0);
});

// ─── Parcelamento ────────────────────────────────────────────

const PAY: PaymentConfig = { maxParcelas: 6, parcelaMinimaCentavos: 5000, juros: 0 };

test('parcelas: até 3x abaixo de R$ 300, até 6x a partir disso', () => {
  assert.equal(maxInstallmentsFor(27000, PAY), 3);
  assert.equal(maxInstallmentsFor(29999, PAY), 3);
  assert.equal(maxInstallmentsFor(30000, PAY), 6);
  assert.equal(maxInstallmentsFor(90000, PAY), 6);
});

test('parcelas: respeitam a parcela mínima e o teto da loja', () => {
  assert.equal(maxInstallmentsFor(12000, PAY), 2);
  assert.equal(maxInstallmentsFor(4000, PAY), 1);
  assert.equal(maxInstallmentsFor(90000, { ...PAY, maxParcelas: 4 }), 4);
  assert.equal(maxInstallmentsFor(0, PAY), 1);
});

test('texto de parcelas: com juros só anuncia o número de vezes', () => {
  assert.equal(calcInstallments(27000, PAY), 'em até 3x no cartão');
  assert.equal(calcInstallments(36000, PAY), 'em até 6x no cartão');
  assert.equal(calcInstallments(27000, { ...PAY, juros: 'sem' }), 'em 3x de R$ 90,00 sem juros');
  assert.equal(calcInstallments(4000, PAY), null);
});
