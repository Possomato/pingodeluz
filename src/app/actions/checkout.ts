'use server';

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import {
  getPaymentGateway,
  PaymentRequestError,
  type PaymentInstructions,
  type PaymentMethodInput,
  type PaymentRejection,
} from '@/lib/payments';
import { processPaymentNotification } from '@/lib/payments/process-notification';
import { computeTotals, type ShippingConfig } from '@/lib/pricing';
import { normalizeCouponCode, validateCoupon, type Coupon } from '@/lib/coupon';
import { fetchPaymentConfig, maxInstallmentsFor, rowToProduct } from '@/lib/data';
import { isValidCPF, onlyDigits } from '@/lib/cpf';

/**
 * Criação de pedido.
 *
 * O cliente informa APENAS id, tamanho e quantidade. Preço, frete e
 * desconto são buscados e calculados aqui. Antes, o preço vinha no
 * corpo da requisição e era usado como veio — dava para comprar
 * qualquer peça por R$ 1 alterando o payload.
 */

export interface CartLine {
  id: string;
  size: string;
  qty: number;
}

export interface CheckoutAddress {
  name: string;
  email: string;
  zip: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface QuoteResult {
  subtotalCentavos: number;
  freightCentavos: number;
  /** Desconto do cupom. */
  discountCentavos: number;
  /** Desconto do Pix; zero quando o meio escolhido não é Pix. */
  pixDiscountCentavos: number;
  /** Total no meio escolhido. */
  totalCentavos: number;
  /** Quanto ficaria pagando com Pix, para a tela mostrar a vantagem. */
  pixTotalCentavos: number;
  /** Quanto ficaria no cartão (sem o desconto do Pix). */
  cardTotalCentavos: number;
  pixDiscountPercent: number;
  items: {
    id: string;
    name: string;
    size: string;
    qty: number;
    unitPriceCentavos: number;
    lineTotalCentavos: number;
  }[];
  couponError?: string;
}

// ─── Apoio ───────────────────────────────────────────────────

function rowToCoupon(row: Record<string, unknown>): Coupon {
  return {
    code: row.code as string,
    kind: row.kind as 'percent' | 'fixed',
    value: row.value as number,
    minSubtotalCentavos: row.min_subtotal_centavos as number,
    maxUses: (row.max_uses as number | null) ?? null,
    usedCount: row.used_count as number,
    expiresAt: (row.expires_at as string | null) ?? null,
    active: row.active as boolean,
  };
}

async function loadShippingConfig(
  service: ReturnType<typeof createServiceClient>
): Promise<ShippingConfig> {
  const { data } = await service
    .from('shipping_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  return {
    flatCentavos: (data?.flat_centavos as number) ?? 2400,
    freeAboveCentavos: (data?.free_above_centavos as number) ?? 25000,
    pixDiscountPercent: (data?.pix_discount_percent as number) ?? 5,
    shippingInfo: (data?.shipping_info as string) ?? '',
  };
}

/**
 * Resolve as linhas do carrinho contra o banco: preço real, nome real,
 * estoque real. É o coração da segurança do checkout e por isso é
 * compartilhado entre a cotação e a criação do pedido.
 */
async function resolveCart(
  service: ReturnType<typeof createServiceClient>,
  lines: CartLine[],
  { checkStock }: { checkStock: boolean }
) {
  if (!lines.length) throw new Error('CARRINHO_VAZIO');

  const ids = Array.from(new Set(lines.map((l) => l.id)));
  const { data, error } = await service.from('products').select('*').in('id', ids);
  if (error) throw new Error(`Falha ao carregar produtos: ${error.message}`);

  const byId = new Map((data ?? []).map((row) => [row.id as string, rowToProduct(row)]));

  const items = lines.map((line) => {
    const product = byId.get(line.id);
    if (!product) throw new Error(`PRODUTO_INDISPONIVEL:${line.id}`);
    if (!product.active) throw new Error(`PRODUTO_INDISPONIVEL:${product.name}`);

    const qty = Math.max(1, Math.floor(line.qty));

    if (checkStock) {
      const available = product.stock?.[line.size] ?? 0;
      if (available < qty) {
        throw new Error(`ESTOQUE_INSUFICIENTE:${product.name}:${line.size}`);
      }
    }

    return {
      id: product.id,
      name: product.name,
      col: product.col,
      tint: product.tint,
      imageUrl: product.imageUrl,
      size: line.size,
      qty,
      unitPriceCentavos: product.priceCentavos,
      lineTotalCentavos: product.priceCentavos * qty,
    };
  });

  const subtotalCentavos = items.reduce((s, i) => s + i.lineTotalCentavos, 0);
  return { items, subtotalCentavos };
}

async function resolveCoupon(
  service: ReturnType<typeof createServiceClient>,
  code: string | undefined,
  subtotalCentavos: number
): Promise<{ coupon: Coupon | null; error?: string }> {
  if (!code?.trim()) return { coupon: null };

  const normalized = normalizeCouponCode(code);
  const { data } = await service
    .from('coupons')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (!data) return { coupon: null, error: 'Cupom não encontrado.' };

  const validation = validateCoupon(rowToCoupon(data), subtotalCentavos);
  if (!validation.ok) return { coupon: null, error: validation.message };

  return { coupon: rowToCoupon(data) };
}

// ─── Cotação (o que o checkout exibe) ────────────────────────

/**
 * Mesma matemática usada na hora de gravar o pedido. O checkout chama
 * isto para exibir os totais, de modo que o que o cliente vê é
 * exatamente o que será cobrado.
 */
export async function quoteCheckoutAction(
  lines: CartLine[],
  couponCode?: string,
  method: 'pix' | 'card' = 'pix'
): Promise<QuoteResult> {
  const service = createServiceClient();

  const [{ items, subtotalCentavos }, shipping] = await Promise.all([
    resolveCart(service, lines, { checkStock: false }),
    loadShippingConfig(service),
  ]);

  const { coupon, error: couponError } = await resolveCoupon(
    service,
    couponCode,
    subtotalCentavos
  );

  const pixTotals = computeTotals(subtotalCentavos, shipping, coupon, { pix: true });
  const cardTotals = computeTotals(subtotalCentavos, shipping, coupon);
  const totals = method === 'pix' ? pixTotals : cardTotals;

  return {
    ...totals,
    pixTotalCentavos: pixTotals.totalCentavos,
    cardTotalCentavos: cardTotals.totalCentavos,
    pixDiscountPercent: shipping.pixDiscountPercent,
    items: items.map(({ id, name, size, qty, unitPriceCentavos, lineTotalCentavos }) => ({
      id,
      name,
      size,
      qty,
      unitPriceCentavos,
      lineTotalCentavos,
    })),
    couponError,
  };
}

// ─── Criação do pedido e cobrança ────────────────────────────

/** O que a tela de pagamento envia. Nunca contém número de cartão. */
export interface CheckoutPayment {
  /** CPF de quem paga. */
  cpf: string;
  method: 'pix' | 'card';
  /** Só no cartão: token gerado no navegador pelos campos seguros. */
  card?: {
    token: string;
    brand: string;
    cardType: 'credit_card' | 'debit_card';
    installments: number;
  };
  deviceId?: string;
}

/**
 * Resultado como valor, não como exceção: em produção o Next esconde a
 * mensagem de erros lançados em Server Actions, e a tela precisa saber
 * exatamente o que dizer à pessoa.
 */
export type PlaceOrderResult =
  | { status: 'approved' | 'pending'; orderId: string; orderNumber: string }
  | { status: 'rejected'; reason: PaymentRejection }
  | { status: 'error'; code: 'stock' | 'coupon' | 'cart' | 'cpf' | 'payment'; message: string };

/** Pedido que não vai ser pago: sai de "pendente" e devolve o cupom. */
async function discardOrder(
  service: ReturnType<typeof createServiceClient>,
  orderId: string,
  couponCode: string | null
) {
  await service
    .from('orders')
    .update({ status: 'recusado', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pendente');
  await releaseCoupon(service, couponCode);
}

async function releaseCoupon(
  service: ReturnType<typeof createServiceClient>,
  couponCode: string | null
) {
  if (!couponCode) return;
  const { data } = await service.from('coupons').select('used_count').eq('code', couponCode).maybeSingle();
  const used = (data?.used_count as number | undefined) ?? 0;
  if (used <= 0) return;
  // O filtro em used_count evita devolver duas vezes numa corrida.
  await service.from('coupons').update({ used_count: used - 1 }).eq('code', couponCode).eq('used_count', used);
}

export async function createOrderAction(
  lines: CartLine[],
  address: CheckoutAddress,
  payment: CheckoutPayment,
  couponCode?: string
): Promise<PlaceOrderResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('NAO_AUTENTICADO');

  if (!isValidCPF(payment.cpf)) {
    return { status: 'error', code: 'cpf', message: 'Confira o CPF: os números não parecem corretos.' };
  }

  // A loja aceita Pix e cartão. Boleto saiu do checkout; o adaptador
  // continua sabendo ler pedidos antigos pagos assim.
  if (payment.method !== 'pix' && payment.method !== 'card') {
    return { status: 'error', code: 'payment', message: 'Escolha Pix ou cartão para pagar.' };
  }
  if (payment.method === 'card' && (!payment.card?.token || !payment.card.brand)) {
    return { status: 'error', code: 'payment', message: 'Não conseguimos ler os dados do cartão. Confira e tente de novo.' };
  }
  const isPix = payment.method === 'pix';

  const service = createServiceClient();

  // Estoque conferido aqui só para não deixar o cliente pagar por algo
  // esgotado; a baixa definitiva acontece na aprovação (ADR-3).
  let cart: Awaited<ReturnType<typeof resolveCart>>;
  let shipping: ShippingConfig;
  try {
    [cart, shipping] = await Promise.all([
      resolveCart(service, lines, { checkStock: true }),
      loadShippingConfig(service),
    ]);
  } catch (err) {
    const raw = err instanceof Error ? err.message : '';
    if (raw.startsWith('ESTOQUE_INSUFICIENTE') || raw.startsWith('PRODUTO_INDISPONIVEL')) {
      return { status: 'error', code: 'stock', message: 'Uma das peças acabou de esgotar. Volte à sacola para revisar seu pedido.' };
    }
    if (raw.startsWith('CARRINHO_VAZIO')) {
      return { status: 'error', code: 'cart', message: 'Sua sacola está vazia.' };
    }
    throw err;
  }
  const { items, subtotalCentavos } = cart;

  const { coupon, error: couponError } = await resolveCoupon(
    service,
    couponCode,
    subtotalCentavos
  );
  if (couponError) return { status: 'error', code: 'coupon', message: couponError };

  const totals = computeTotals(subtotalCentavos, shipping, coupon, { pix: isPix });

  // Consome o cupom antes de criar o pedido. Se estourou o limite entre
  // a cotação e agora, o desconto é desfeito em vez de dado de graça.
  let appliedCoupon = coupon;
  let appliedTotals = totals;
  if (coupon) {
    const { data: consumed } = await service.rpc('consume_coupon', { p_code: coupon.code });
    if (!consumed) {
      appliedCoupon = null;
      appliedTotals = computeTotals(subtotalCentavos, shipping, null, { pix: isPix });
    }
  }

  // Parcelas: o servidor reaplica a regra da loja sobre o total real,
  // seja qual for o número que a tela enviou.
  let method: PaymentMethodInput;
  if (isPix) {
    method = { kind: 'pix' };
  } else {
    const maxInstallments = maxInstallmentsFor(appliedTotals.totalCentavos, await fetchPaymentConfig());
    method = {
      kind: 'card',
      token: payment.card!.token,
      brand: payment.card!.brand,
      cardType: payment.card!.cardType === 'debit_card' ? 'debit_card' : 'credit_card',
      installments: Math.min(Math.max(1, Math.floor(payment.card!.installments || 1)), maxInstallments),
    };
  }

  const { data: numberRow } = await service.rpc('next_order_number');
  const orderNumber = (numberRow as string) ?? `PDL-${Date.now()}`;

  const { data: order, error } = await service
    .from('orders')
    .insert({
      user_id: user.id,
      order_number: orderNumber,
      items,
      status: 'pendente',
      address,
      subtotal_centavos: appliedTotals.subtotalCentavos,
      freight_centavos: appliedTotals.freightCentavos,
      // Cupom + Pix: assim subtotal + frete − desconto = total, sempre.
      discount_centavos: appliedTotals.discountCentavos + appliedTotals.pixDiscountCentavos,
      total_centavos: appliedTotals.totalCentavos,
      total: appliedTotals.totalCentavos / 100,
      coupon_code: appliedCoupon?.code ?? null,
      payment_provider: null,
    })
    .select('id, order_number')
    .single();

  if (error || !order) throw new Error(error?.message ?? 'Falha ao criar o pedido');

  const gateway = getPaymentGateway();
  const usedCoupon = appliedCoupon?.code ?? null;

  let result: Awaited<ReturnType<typeof gateway.createPayment>>;
  try {
    result = await gateway.createPayment({
      orderId: order.id,
      orderNumber: order.order_number,
      items: items.map((i) => ({
        id: i.id,
        title: `${i.name} (tam. ${i.size})`,
        quantity: i.qty,
        unitPriceCentavos: i.unitPriceCentavos,
      })),
      totalCentavos: appliedTotals.totalCentavos,
      freightCentavos: appliedTotals.freightCentavos,
      discountCentavos: appliedTotals.discountCentavos + appliedTotals.pixDiscountCentavos,
      payer: {
        email: address.email || user.email || '',
        name: address.name,
        cpf: onlyDigits(payment.cpf),
        address: {
          zip: address.zip,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        },
      },
      method,
      deviceId: payment.deviceId,
    });
  } catch (err) {
    // A cobrança não existe: o pedido não pode ficar "pendente" à espera
    // de um pagamento que nunca virá.
    await discardOrder(service, order.id, usedCoupon);
    if (err instanceof PaymentRequestError) return { status: 'rejected', reason: err.rejection };
    console.error('[checkout] falha ao criar cobrança:', err);
    return { status: 'error', code: 'payment', message: 'Não conseguimos falar com o sistema de pagamento. Nada foi cobrado — tente de novo em instantes.' };
  }

  const { notification } = result;

  // Registra quem processa a cobrança antes dos efeitos: para Pix e
  // boleto o pedido segue pendente e é por aqui que a tela de
  // confirmação reencontra o código de pagamento.
  await service
    .from('orders')
    .update({
      payment_provider: gateway.provider,
      payment_external_id: notification.externalPaymentId,
      payment_method: notification.method ?? null,
    })
    .eq('id', order.id);

  // Mesmo caminho do webhook: cartão aprovado baixa estoque agora, e o
  // aviso que chegar depois é reconhecido como repetido.
  await processPaymentNotification(gateway.provider, notification);

  if (notification.status === 'rejected' || notification.status === 'cancelled') {
    await releaseCoupon(service, usedCoupon);
    return { status: 'rejected', reason: result.rejection ?? 'other' };
  }

  return {
    status: notification.status === 'approved' ? 'approved' : 'pending',
    orderId: order.id,
    orderNumber: order.order_number,
  };
}

/**
 * Pix ou boleto de um pedido ainda em aberto, para a tela de confirmação
 * (e para quem fecha a aba e volta depois pelo "meus pedidos").
 */
export async function getPaymentInstructionsAction(orderId: string): Promise<PaymentInstructions | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Leitura com a sessão do cliente: a policy "own orders read" garante
  // que ninguém busque o Pix do pedido de outra pessoa.
  const { data: order } = await supabase
    .from('orders')
    .select('status, payment_external_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.status !== 'pendente' || !order.payment_external_id) return null;

  try {
    return await getPaymentGateway().getInstructions(order.payment_external_id as string);
  } catch (err) {
    console.error('[checkout] falha ao buscar instruções de pagamento:', err);
    return null;
  }
}
