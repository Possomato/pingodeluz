'use server';

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { getPaymentGateway } from '@/lib/payments';
import { computeTotals, type ShippingConfig } from '@/lib/pricing';
import { normalizeCouponCode, validateCoupon, type Coupon } from '@/lib/coupon';
import { rowToProduct } from '@/lib/data';

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
  discountCentavos: number;
  totalCentavos: number;
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
  couponCode?: string
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

  const totals = computeTotals(subtotalCentavos, shipping, coupon);

  return {
    ...totals,
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

// ─── Criação do pedido ───────────────────────────────────────

export async function createOrderAction(
  lines: CartLine[],
  address: CheckoutAddress,
  couponCode?: string
): Promise<{ redirectUrl: string; orderId: string; orderNumber: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('NAO_AUTENTICADO');

  const service = createServiceClient();

  // Estoque conferido aqui só para não deixar o cliente pagar por algo
  // esgotado; a baixa definitiva acontece na aprovação (ADR-3).
  const [{ items, subtotalCentavos }, shipping] = await Promise.all([
    resolveCart(service, lines, { checkStock: true }),
    loadShippingConfig(service),
  ]);

  const { coupon, error: couponError } = await resolveCoupon(
    service,
    couponCode,
    subtotalCentavos
  );
  if (couponError) throw new Error(`CUPOM_INVALIDO:${couponError}`);

  const totals = computeTotals(subtotalCentavos, shipping, coupon);

  // Consome o cupom antes de criar o pedido. Se estourou o limite entre
  // a cotação e agora, o desconto é desfeito em vez de dado de graça.
  let appliedCoupon = coupon;
  let appliedTotals = totals;
  if (coupon) {
    const { data: consumed } = await service.rpc('consume_coupon', { p_code: coupon.code });
    if (!consumed) {
      appliedCoupon = null;
      appliedTotals = computeTotals(subtotalCentavos, shipping, null);
    }
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
      discount_centavos: appliedTotals.discountCentavos,
      total_centavos: appliedTotals.totalCentavos,
      total: appliedTotals.totalCentavos / 100,
      coupon_code: appliedCoupon?.code ?? null,
      payment_provider: null,
    })
    .select('id, order_number')
    .single();

  if (error || !order) throw new Error(error?.message ?? 'Falha ao criar o pedido');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const gateway = getPaymentGateway();

  const checkout = await gateway.createCheckout({
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
    discountCentavos: appliedTotals.discountCentavos,
    payerEmail: address.email || user.email || '',
    payerName: address.name,
    successUrl: `${siteUrl}/confirmacao?order_id=${order.id}`,
    failureUrl: `${siteUrl}/checkout?error=pagamento`,
    pendingUrl: `${siteUrl}/confirmacao?order_id=${order.id}&pending=true`,
    notificationUrl: `${siteUrl}/api/webhooks/${gateway.provider}`,
  });

  // Só agora sabemos quem processa a cobrança.
  await service
    .from('orders')
    .update({
      payment_provider: gateway.provider,
      payment_external_id: checkout.externalId ?? null,
    })
    .eq('id', order.id);

  return {
    redirectUrl: checkout.redirectUrl,
    orderId: order.id,
    orderNumber: order.order_number,
  };
}
