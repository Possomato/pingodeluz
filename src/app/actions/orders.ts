'use server';

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { revalidatePath } from 'next/cache';

export interface OrderItem {
  id: string;
  name: string;
  col?: string;
  tint?: string;
  imageUrl?: string;
  size: string;
  qty: number;
  unitPriceCentavos: number;
  lineTotalCentavos: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  address: Record<string, string>;
  subtotalCentavos: number;
  freightCentavos: number;
  discountCentavos: number;
  totalCentavos: number;
  couponCode: string | null;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentExternalId: string | null;
  trackingCode: string | null;
  needsAttention: boolean;
  attentionReason: string | null;
  createdAt: string;
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    orderNumber: (row.order_number as string) ?? '',
    status: row.status as string,
    items: ((row.items as OrderItem[]) ?? []).map((i) => ({
      ...i,
      // Pedidos antigos guardavam preço como string; normaliza na leitura.
      unitPriceCentavos: i.unitPriceCentavos ?? 0,
      lineTotalCentavos: i.lineTotalCentavos ?? (i.unitPriceCentavos ?? 0) * (i.qty ?? 1),
    })),
    address: (row.address as Record<string, string>) ?? {},
    subtotalCentavos: (row.subtotal_centavos as number) ?? 0,
    freightCentavos: (row.freight_centavos as number) ?? 0,
    discountCentavos: (row.discount_centavos as number) ?? 0,
    totalCentavos: (row.total_centavos as number) ?? 0,
    couponCode: (row.coupon_code as string | null) ?? null,
    paymentMethod: (row.payment_method as string | null) ?? null,
    paymentProvider: (row.payment_provider as string | null) ?? null,
    paymentExternalId: (row.payment_external_id as string | null) ?? null,
    trackingCode: (row.tracking_code as string | null) ?? null,
    needsAttention: (row.needs_attention as boolean) ?? false,
    attentionReason: (row.attention_reason as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

// ─── Cliente ─────────────────────────────────────────────────

/** Pedidos da pessoa logada. A policy "own orders read" faz a filtragem. */
export async function getMyOrdersAction(): Promise<Order[]> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`);
  return (data ?? []).map(rowToOrder);
}

export async function getMyOrderAction(id: string): Promise<Order | null> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
  return data ? rowToOrder(data) : null;
}

// ─── Admin ───────────────────────────────────────────────────

export interface OrderListFilters {
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export async function listOrdersAdminAction(filters: OrderListFilters = {}) {
  await requireAdmin();

  const { status, search, page = 1, perPage = 20 } = filters;
  const service = createServiceClient();

  let query = service.from('orders').select('*', { count: 'exact' });

  if (status && status !== 'todos') query = query.eq('status', status);
  if (search?.trim()) query = query.ilike('order_number', `%${search.trim()}%`);

  const from = (page - 1) * perPage;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (error) throw new Error(error.message);

  return {
    orders: (data ?? []).map(rowToOrder),
    total: count ?? 0,
    page,
    perPage,
  };
}

export async function getOrderAdminAction(id: string): Promise<Order | null> {
  await requireAdmin();
  const service = createServiceClient();
  const { data } = await service.from('orders').select('*').eq('id', id).maybeSingle();
  return data ? rowToOrder(data) : null;
}

/** Transições que o admin pode fazer à mão. Pagamento é do webhook. */
const ADMIN_TRANSITIONS: Record<string, string[]> = {
  pendente: ['cancelado'],
  pago: ['enviado', 'cancelado'],
  enviado: ['entregue', 'cancelado'],
  entregue: [],
  cancelado: [],
  recusado: [],
  reembolsado: [],
};

export async function updateOrderStatusAction(
  id: string,
  nextStatus: string,
  options: { trackingCode?: string } = {}
) {
  await requireAdmin();
  const service = createServiceClient();

  const { data: order } = await service
    .from('orders')
    .select('id, status, items')
    .eq('id', id)
    .maybeSingle();

  if (!order) throw new Error('PEDIDO_NAO_ENCONTRADO');

  const allowed = ADMIN_TRANSITIONS[order.status as string] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`TRANSICAO_INVALIDA: ${order.status} → ${nextStatus}`);
  }

  // Cancelar depois de pago devolve as peças ao estoque.
  if (nextStatus === 'cancelado' && ['pago', 'enviado'].includes(order.status as string)) {
    const { error } = await service.rpc('restore_stock', {
      items: order.items,
      p_order_id: id,
    });
    if (error) throw new Error(`Falha ao repor estoque: ${error.message}`);
  }

  const { error } = await service
    .from('orders')
    .update({
      status: nextStatus,
      ...(options.trackingCode !== undefined ? { tracking_code: options.trackingCode } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath('/perfil');
  revalidatePath(`/pedido/${id}`);
}

export async function clearOrderAttentionAction(id: string) {
  await requireAdmin();
  const service = createServiceClient();

  const { error } = await service
    .from('orders')
    .update({ needs_attention: false, attention_reason: null })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/pedidos');
}

// ─── Indicadores ─────────────────────────────────────────────

export async function getDashboardStatsAction() {
  await requireAdmin();
  const service = createServiceClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [paidThisMonth, pendingShipment, attention, products] = await Promise.all([
    service
      .from('orders')
      .select('total_centavos')
      .in('status', ['pago', 'enviado', 'entregue'])
      .gte('created_at', startOfMonth.toISOString()),
    service.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pago'),
    service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('needs_attention', true),
    service.from('products').select('id, name, stock').eq('active', true),
  ]);

  const revenueCentavos = (paidThisMonth.data ?? []).reduce(
    (sum, o) => sum + ((o.total_centavos as number) ?? 0),
    0
  );

  const lowStock = (products.data ?? [])
    .map((p) => {
      const stock = (p.stock as Record<string, number>) ?? {};
      const total = Object.values(stock).reduce((s, q) => s + q, 0);
      return { id: p.id as string, name: p.name as string, total };
    })
    .filter((p) => p.total <= 2)
    .sort((a, b) => a.total - b.total);

  return {
    ordersThisMonth: paidThisMonth.data?.length ?? 0,
    revenueCentavos,
    pendingShipment: pendingShipment.count ?? 0,
    needsAttention: attention.count ?? 0,
    lowStock,
  };
}

// ─── Clientes ────────────────────────────────────────────────

export async function listCustomersAdminAction() {
  await requireAdmin();
  const service = createServiceClient();

  const [usersRes, ordersRes] = await Promise.all([
    service.from('users').select('id, name, email, avatar_url, created_at, is_admin'),
    service.from('orders').select('user_id, total_centavos, status, created_at'),
  ]);

  if (usersRes.error) throw new Error(usersRes.error.message);

  const paidStatuses = new Set(['pago', 'enviado', 'entregue']);
  const stats = new Map<string, { orders: number; spentCentavos: number; last: string | null }>();

  for (const o of ordersRes.data ?? []) {
    const uid = o.user_id as string | null;
    if (!uid) continue;
    const entry = stats.get(uid) ?? { orders: 0, spentCentavos: 0, last: null };
    entry.orders += 1;
    if (paidStatuses.has(o.status as string)) {
      entry.spentCentavos += (o.total_centavos as number) ?? 0;
    }
    const created = o.created_at as string;
    if (!entry.last || created > entry.last) entry.last = created;
    stats.set(uid, entry);
  }

  return (usersRes.data ?? [])
    .map((u) => {
      const s = stats.get(u.id as string);
      return {
        id: u.id as string,
        name: (u.name as string) ?? '',
        email: (u.email as string) ?? '',
        avatarUrl: (u.avatar_url as string | null) ?? null,
        isAdmin: (u.is_admin as boolean) ?? false,
        createdAt: (u.created_at as string) ?? null,
        orderCount: s?.orders ?? 0,
        spentCentavos: s?.spentCentavos ?? 0,
        lastOrderAt: s?.last ?? null,
      };
    })
    .sort((a, b) => b.spentCentavos - a.spentCentavos);
}
