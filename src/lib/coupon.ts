import { percentOf } from './money';

export interface Coupon {
  code: string;
  kind: 'percent' | 'fixed';
  /** percent: 10 = 10% · fixed: valor em centavos */
  value: number;
  minSubtotalCentavos: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
}

export type CouponRejection =
  | 'INATIVO'
  | 'EXPIRADO'
  | 'ESGOTADO'
  | 'MINIMO_NAO_ATINGIDO';

export type CouponValidation =
  | { ok: true }
  | { ok: false; reason: CouponRejection; message: string };

const MESSAGES: Record<CouponRejection, string> = {
  INATIVO: 'Esse cupom não está mais disponível.',
  EXPIRADO: 'Esse cupom já expirou.',
  ESGOTADO: 'Esse cupom atingiu o limite de usos.',
  MINIMO_NAO_ATINGIDO: 'Seu carrinho ainda não atingiu o valor mínimo do cupom.',
};

/**
 * Função pura: dado um cupom e um subtotal, o cupom pode ser usado?
 * A busca do cupom no banco fica na Server Action — aqui só a regra.
 */
export function validateCoupon(coupon: Coupon, subtotalCentavos: number): CouponValidation {
  const reject = (reason: CouponRejection): CouponValidation => ({
    ok: false,
    reason,
    message: MESSAGES[reason],
  });

  if (!coupon.active) return reject('INATIVO');
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
    return reject('EXPIRADO');
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return reject('ESGOTADO');
  }
  if (subtotalCentavos < coupon.minSubtotalCentavos) {
    return reject('MINIMO_NAO_ATINGIDO');
  }
  return { ok: true };
}

/** Desconto em centavos, limitado ao subtotal — o total nunca fica negativo. */
export function computeDiscount(coupon: Coupon, subtotalCentavos: number): number {
  const raw =
    coupon.kind === 'percent'
      ? percentOf(subtotalCentavos, coupon.value)
      : coupon.value;

  return Math.min(Math.max(raw, 0), subtotalCentavos);
}

/** Normaliza o código como o usuário digita: "  bemvindo " → "BEMVINDO". */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}
