import MercadoPagoConfig, { Payment, Preference } from 'mercadopago';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  NormalizedPaymentStatus,
  PaymentGateway,
  PaymentNotification,
  WebhookVerification,
} from './types';

/**
 * Adaptador Mercado Pago (Checkout Pro — ADR-4).
 *
 * Este é o único arquivo do projeto que importa o SDK do Mercado Pago.
 * Tudo aqui dentro traduz entre o vocabulário do provedor e o contrato
 * em `types.ts`.
 */

/** Vocabulário do Mercado Pago → status do domínio. */
export function normalizeStatus(mpStatus: string | undefined): NormalizedPaymentStatus {
  switch (mpStatus) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      // in_process, in_mediation, pending, authorized…
      return 'pending';
  }
}

/** `payment_method_id` do MP → método genérico. */
export function normalizeMethod(paymentMethodId: string | undefined): string | undefined {
  if (!paymentMethodId) return undefined;
  const id = paymentMethodId.toLowerCase();
  if (id.includes('pix')) return 'pix';
  if (id.includes('bolbradesco') || id.includes('boleto')) return 'boleto';
  // Cartões de débito do MP vêm como debvisa, debmaster, debelo…
  if (id.startsWith('deb')) return 'debit_card';
  return 'credit_card';
}

/**
 * Assinatura do webhook: o MP manda `x-signature: ts=...,v1=...` e o
 * manifesto assinado é `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
 * Documentado em https://www.mercadopago.com.br/developers → Webhooks.
 */
export function verifyMercadoPagoSignature(params: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}): WebhookVerification {
  const { xSignature, xRequestId, dataId, secret } = params;

  if (!secret) return { valid: false, reason: 'MISSING_SECRET' };
  if (!xSignature) return { valid: false, reason: 'MISSING_SIGNATURE' };

  const parts = xSignature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { valid: false, reason: 'MALFORMED_SIGNATURE' };

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  // Comparação em tempo constante evita vazar a assinatura por timing.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  if (a.length !== b.length) return { valid: false, reason: 'SIGNATURE_MISMATCH' };

  return timingSafeEqual(a, b)
    ? { valid: true }
    : { valid: false, reason: 'SIGNATURE_MISMATCH' };
}

export class MercadoPagoGateway implements PaymentGateway {
  readonly provider = 'mercadopago';

  private readonly client: MercadoPagoConfig;

  constructor(accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN) {
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
    }
    this.client = new MercadoPagoConfig({ accessToken });
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const preference = new Preference(this.client);

    // Frete e desconto viram linhas próprias para que a soma exibida no
    // Mercado Pago bata exatamente com o total do nosso pedido.
    const items = input.items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPriceCentavos / 100,
      currency_id: 'BRL',
    }));

    if (input.freightCentavos > 0) {
      items.push({
        id: 'frete',
        title: 'Frete',
        quantity: 1,
        unit_price: input.freightCentavos / 100,
        currency_id: 'BRL',
      });
    }

    const response = await preference.create({
      body: {
        items,
        // O MP não aceita item de valor negativo; desconto vai como cupom.
        ...(input.discountCentavos > 0
          ? { coupon_amount: input.discountCentavos / 100 }
          : {}),
        back_urls: {
          success: input.successUrl,
          failure: input.failureUrl,
          pending: input.pendingUrl,
        },
        auto_return: 'approved',
        notification_url: input.notificationUrl,
        external_reference: input.orderId,
        statement_descriptor: 'PINGODELUZ',
        payer: {
          email: input.payerEmail,
          ...(input.payerName ? { name: input.payerName } : {}),
        },
        metadata: { order_number: input.orderNumber },
      },
    });

    if (!response.init_point) {
      throw new Error('Mercado Pago não devolveu init_point');
    }

    return { redirectUrl: response.init_point, externalId: response.id };
  }

  verifyWebhook(request: Request, _rawBody: string): WebhookVerification {
    const url = new URL(request.url);
    return verifyMercadoPagoSignature({
      xSignature: request.headers.get('x-signature') ?? '',
      xRequestId: request.headers.get('x-request-id') ?? '',
      dataId: url.searchParams.get('data.id') ?? '',
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '',
    });
  }

  async parseNotification(
    rawBody: string,
    _request: Request
  ): Promise<PaymentNotification | null> {
    let body: { type?: string; action?: string; data?: { id?: string } };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }

    // O MP envia vários tipos (merchant_order, plan, subscription…).
    // Só pagamento interessa aqui.
    if (body.type !== 'payment' || !body.data?.id) return null;

    const payment = new Payment(this.client);
    const data = await payment.get({ id: String(body.data.id) });

    if (!data.external_reference) return null;

    return {
      // O status entra na chave para que uma transição real (pending →
      // approved) seja processada, mas reentregas do mesmo evento não.
      eventId: `${data.id}:${data.status}`,
      externalPaymentId: String(data.id),
      orderId: data.external_reference,
      status: normalizeStatus(data.status),
      method: normalizeMethod(data.payment_method_id),
      raw: data,
    };
  }
}
