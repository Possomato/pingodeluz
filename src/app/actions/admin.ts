'use server';

import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { revalidatePath } from 'next/cache';
import type { Product, Collection, HomepageSection, SizeTable, PaymentConfig } from '@/lib/data';
import type { ShippingConfig } from '@/lib/pricing';

/**
 * Todas as actions deste arquivo usam o service role, que ignora RLS.
 * Por isso cada uma começa com `await requireAdmin()` — sem exceção.
 * Uma action nova sem essa linha é uma porta aberta para o catálogo.
 */

function productToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    name_parts: p.nameParts,
    col: p.col,
    collection_id: p.collectionId ?? null,
    price_centavos: p.priceCentavos,
    tint: p.tint,
    label: p.label ?? '',
    description: p.desc ?? null,
    sizes: p.sizes ?? [],
    stock: p.stock ?? {},
    gallery_labels: p.galleryLabels ?? [],
    image_url: p.imageUrls?.[0] ?? p.imageUrl ?? null,
    image_urls: p.imageUrls ?? (p.imageUrl ? [p.imageUrl] : []),
    gender: p.gender ?? null,
    product_type: p.type ?? null,
    size_table_id: p.sizeTableId ?? null,
    composition: p.composition ?? null,
    care_info: p.careInfo ?? null,
    made_by: p.madeBy ?? null,
    active: p.active ?? true,
    updated_at: new Date().toISOString(),
  };
}

/** Invalida a vitrine inteira depois de mexer no catálogo. */
function revalidateCatalog(productId?: string, collectionId?: string) {
  revalidatePath('/');
  revalidatePath('/busca');
  revalidatePath('/genero/[id]', 'page');
  revalidatePath('/colecao/[id]', 'page');
  if (productId) revalidatePath(`/produto/${productId}`);
  if (collectionId) revalidatePath(`/colecao/${collectionId}`);
}

// ─── Produtos ────────────────────────────────────────────────

export async function upsertProductAction(p: Product) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('products').upsert(productToRow(p));
  if (error) throw new Error(error.message);
  revalidateCatalog(p.id, p.collectionId);
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidateCatalog(id);
}

/** Publica ou despublica sem apagar — preserva o histórico de pedidos. */
export async function setProductActiveAction(id: string, active: boolean) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('products')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidateCatalog(id);
}

/** Lista tudo, inclusive despublicados — o admin precisa ver o que escondeu. */
export async function listAllProductsAction() {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Estoque ─────────────────────────────────────────────────

export async function adjustStockAction(productId: string, size: string, qty: number) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.rpc('adjust_stock', {
    p_product_id: productId,
    p_size: size,
    p_qty: Math.max(0, Math.floor(qty)),
  });
  if (error) throw new Error(error.message);
  revalidateCatalog(productId);
}

export async function listStockMovementsAction(limit = 50) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Coleções ────────────────────────────────────────────────

export async function upsertCollectionAction(c: Collection) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('collections').upsert({
    id: c.id,
    slug: c.id,
    name: c.name,
    eyebrow: c.eyebrow,
    tint: c.tint,
    intro: c.intro,
    image_url: c.imageUrl ?? null,
    count: c.count ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidateCatalog(undefined, c.id);
}

export async function deleteCollectionAction(id: string) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidateCatalog(undefined, id);
}

// ─── Vitrine ─────────────────────────────────────────────────

export async function upsertHomepageSectionAction(section: HomepageSection) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('homepage_config').upsert({
    id: section.id,
    visible: section.visible,
    image_urls: section.imageUrls,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

// ─── Tabelas de medidas ──────────────────────────────────────

export async function upsertSizeTableAction(t: SizeTable) {
  await requireAdmin();
  const supabase = createServiceClient();
  const storedColumns = t.columns.map((name) => ({
    name,
    type: (t.columnTypes ?? {})[name] ?? 'crianca',
  }));
  const { error } = await supabase.from('size_tables').upsert({
    id: t.id,
    name: t.name,
    columns: storedColumns,
    rows: t.rows,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tabelas');
  revalidatePath('/produto/[id]', 'page');
}

export async function deleteSizeTableAction(id: string) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('size_tables').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tabelas');
  revalidatePath('/produto/[id]', 'page');
}

// ─── Configurações ───────────────────────────────────────────

export async function upsertPaymentConfigAction(config: PaymentConfig) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('payment_config').upsert({
    id: 'default',
    max_parcelas: config.maxParcelas,
    parcela_minima: config.parcelaMinimaCentavos / 100,
    juros: config.juros === 'sem' ? 'sem' : String(config.juros),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/pagamentos');
  revalidatePath('/produto/[id]', 'page');
}

export async function upsertShippingConfigAction(config: ShippingConfig) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('shipping_config').upsert({
    id: 'default',
    flat_centavos: config.flatCentavos,
    free_above_centavos: config.freeAboveCentavos,
    pix_discount_percent: config.pixDiscountPercent,
    shipping_info: config.shippingInfo,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/frete');
  revalidatePath('/carrinho');
  revalidatePath('/checkout');
}

// ─── Depoimentos ─────────────────────────────────────────────

export interface TestimonialInput {
  id?: string;
  quote: string;
  author: string;
  role: string;
  sort: number;
  visible: boolean;
}

export async function listTestimonialsAction() {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('testimonials').select('*').order('sort');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertTestimonialAction(t: TestimonialInput) {
  await requireAdmin();
  const supabase = createServiceClient();
  const row = {
    ...(t.id ? { id: t.id } : {}),
    quote: t.quote,
    author: t.author,
    role: t.role,
    sort: t.sort,
    visible: t.visible,
  };
  const { error } = await supabase.from('testimonials').upsert(row);
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/admin/depoimentos');
}

export async function deleteTestimonialAction(id: string) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/admin/depoimentos');
}
