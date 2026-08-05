import { computeDiscount, type Coupon } from './coupon';

export interface ShippingConfig {
  flatCentavos: number;
  freeAboveCentavos: number;
  pixDiscountPercent: number;
  /** Texto de prazo e trocas exibido na página de produto. */
  shippingInfo: string;
}

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  flatCentavos: 2400,
  freeAboveCentavos: 25000,
  pixDiscountPercent: 5,
  shippingInfo: 'Envio em até 3 dias úteis. Trocas em até 30 dias.',
};

export interface OrderTotals {
  subtotalCentavos: number;
  freightCentavos: number;
  discountCentavos: number;
  totalCentavos: number;
}

/**
 * Frete pelo subtotal *antes* do desconto: um cupom não deve fazer o
 * cliente perder o frete grátis que já tinha conquistado.
 */
export function computeFreight(subtotalCentavos: number, config: ShippingConfig): number {
  if (subtotalCentavos <= 0) return 0;
  if (subtotalCentavos >= config.freeAboveCentavos) return 0;
  return config.flatCentavos;
}

/**
 * Fonte única da verdade dos totais. O checkout do cliente exibe o que
 * esta função devolve e o servidor recalcula com ela na hora de gravar o
 * pedido — o cliente nunca informa preço (ver actions/checkout.ts).
 */
export function computeTotals(
  subtotalCentavos: number,
  config: ShippingConfig,
  coupon: Coupon | null
): OrderTotals {
  const freightCentavos = computeFreight(subtotalCentavos, config);
  const discountCentavos = coupon ? computeDiscount(coupon, subtotalCentavos) : 0;
  const totalCentavos = Math.max(0, subtotalCentavos + freightCentavos - discountCentavos);

  return { subtotalCentavos, freightCentavos, discountCentavos, totalCentavos };
}

/** Quanto falta para o frete grátis — usado na barra de incentivo do carrinho. */
export function amountUntilFreeShipping(
  subtotalCentavos: number,
  config: ShippingConfig
): number {
  return Math.max(0, config.freeAboveCentavos - subtotalCentavos);
}
