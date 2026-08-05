import type { PaymentGateway } from './types';
import { MercadoPagoGateway } from './mercadopago';

export type * from './types';

let cached: PaymentGateway | null = null;

/**
 * Resolve o provedor de pagamento em uso.
 *
 * Trocar de provedor: implemente `PaymentGateway` em um arquivo novo,
 * acrescente um `case` aqui e mude a env `PAYMENT_PROVIDER`. Nenhum
 * outro arquivo do projeto precisa mudar (ADR-1).
 */
export function getPaymentGateway(): PaymentGateway {
  if (cached) return cached;

  const provider = process.env.PAYMENT_PROVIDER ?? 'mercadopago';

  switch (provider) {
    case 'mercadopago':
      cached = new MercadoPagoGateway();
      return cached;
    default:
      throw new Error(`Provedor de pagamento desconhecido: ${provider}`);
  }
}

/** Só para testes, que trocam o provedor entre casos. */
export function resetPaymentGatewayCache() {
  cached = null;
}
