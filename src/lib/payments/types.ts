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

/** Quem paga. CPF é exigido pelo Pix, pelo boleto e pelo cartão no Brasil. */
export interface Payer {
  email: string;
  name: string;
  /** Só dígitos. */
  cpf: string;
  /** Obrigatório para boleto; ajuda a análise antifraude nos demais. */
  address?: {
    zip: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

/**
 * Meio escolhido na loja. No cartão, o número nunca chega aqui: o
 * navegador o troca por um `token` direto com o provedor.
 */
export type PaymentMethodInput =
  | { kind: 'pix' }
  | { kind: 'boleto' }
  | {
      kind: 'card';
      token: string;
      /** Bandeira no vocabulário do provedor (visa, master, elo…). */
      brand: string;
      cardType: 'credit_card' | 'debit_card';
      installments: number;
    };

export interface CreatePaymentInput {
  orderId: string;
  /** Número amigável (PDL-10001), exibido ao cliente na fatura. */
  orderNumber: string;
  items: PaymentItem[];
  /** Total já calculado pelo servidor, incluindo frete e desconto. */
  totalCentavos: number;
  freightCentavos: number;
  discountCentavos: number;
  payer: Payer;
  method: PaymentMethodInput;
  /** Identificador do dispositivo gerado pelo SDK do provedor (antifraude). */
  deviceId?: string;
}

/** O que a pessoa precisa para concluir um pagamento que não é imediato. */
export type PaymentInstructions =
  | {
      kind: 'pix';
      /** Código "copia e cola". */
      code: string;
      /** PNG do QR code em base64, sem o prefixo data:. */
      qrCodeBase64?: string;
      expiresAt?: string;
    }
  | {
      kind: 'boleto';
      /** Página do boleto para imprimir ou salvar. */
      url: string;
      digitableLine?: string;
      expiresAt?: string;
    };

export interface CreatePaymentResult {
  /**
   * Estado da cobrança no formato do webhook, para o chamador aplicar os
   * efeitos na hora (cartão aprovado baixa estoque sem esperar o aviso).
   */
  notification: PaymentNotification;
  /** Motivo da recusa no vocabulário do domínio, quando houver. */
  rejection?: PaymentRejection;
  instructions?: PaymentInstructions;
}

/**
 * A cobrança nem chegou a ser criada no provedor (dados recusados antes
 * de processar). Carrega o motivo já no vocabulário do domínio.
 */
export class PaymentRequestError extends Error {
  constructor(
    readonly rejection: PaymentRejection,
    detail: string
  ) {
    super(`PAGAMENTO_NAO_CRIADO:${detail}`);
    this.name = 'PaymentRequestError';
  }
}

export type PaymentRejection =
  | 'insufficient_funds'
  | 'card_data'
  | 'issuer'
  | 'risk'
  | 'installments'
  | 'other';

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
  /** Valor efetivamente cobrado, em centavos, quando o provedor informa. */
  amountCentavos?: number;
  raw: unknown;
}

export interface PaymentGateway {
  /** Identificador gravado em `orders.payment_provider`. */
  readonly provider: string;

  /** Cria e processa a cobrança dentro da loja (checkout transparente). */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /** Busca de novo o Pix/boleto de uma cobrança ainda em aberto. */
  getInstructions(externalPaymentId: string): Promise<PaymentInstructions | null>;

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
