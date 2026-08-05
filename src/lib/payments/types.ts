/**
 * Contrato de pagamento independente de provedor.
 *
 * Nada fora de `src/lib/payments/` deve importar o SDK de um provedor
 * (`mercadopago`, `stripe`, …) nem conhecer seus tipos. O domínio —
 * pedidos, estoque, status — fala apenas a linguagem deste arquivo.
 *
 * Ver `README.md` nesta pasta para o passo a passo de troca de provedor.
 */

export interface PaymentItem {
  id: string;
  title: string;
  quantity: number;
  unitPriceCentavos: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  /** Número amigável (PDL-10001), exibido ao cliente na fatura. */
  orderNumber: string;
  items: PaymentItem[];
  /** Total já calculado pelo servidor, incluindo frete e desconto. */
  totalCentavos: number;
  freightCentavos: number;
  discountCentavos: number;
  payerEmail: string;
  payerName?: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
}

export interface CreateCheckoutResult {
  /** Para onde redirecionar o navegador do cliente. */
  redirectUrl: string;
  /** Identificador da cobrança no provedor, quando já existe. */
  externalId?: string;
}

/**
 * Status normalizado. Cada adaptador traduz o vocabulário do seu
 * provedor para este conjunto fechado.
 */
export type NormalizedPaymentStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export interface WebhookVerification {
  valid: boolean;
  reason?: string;
}

export interface PaymentNotification {
  /** Único por evento; usado para idempotência. */
  eventId: string;
  externalPaymentId: string;
  /** Nossa referência — o id do pedido que enviamos ao provedor. */
  orderId: string;
  status: NormalizedPaymentStatus;
  /** 'pix' | 'credit_card' | 'boleto' | … já normalizado. */
  method?: string;
  raw: unknown;
}

export interface PaymentGateway {
  /** Identificador gravado em `orders.payment_provider`. */
  readonly provider: string;

  /** Cria a cobrança e devolve para onde mandar o cliente. */
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;

  /** Confere a autenticidade da requisição de webhook. */
  verifyWebhook(request: Request, rawBody: string): WebhookVerification;

  /**
   * Traduz o webhook para o formato do domínio.
   * `null` = evento irrelevante (deve responder 200 e ignorar).
   */
  parseNotification(rawBody: string, request: Request): Promise<PaymentNotification | null>;

  /** Opcional: nem todo provedor expõe estorno programático. */
  refund?(externalPaymentId: string): Promise<void>;
}
