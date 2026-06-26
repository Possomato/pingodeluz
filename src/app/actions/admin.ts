'use server';

import { createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Product, Collection, HomepageSection, SizeTable, PaymentConfig } from '@/lib/data';

function productToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    name_parts: p.nameParts,
    col: p.col,
    price: p.price,
    tint: p.tint,
    label: p.label ?? '',
    description: p.desc ?? null,
    sizes: p.sizes ?? [],
    unavail: p.unavail ?? [],
    stock: p.stock ?? {},
    gallery_labels: p.galleryLabels ?? [],
    image_url: p.imageUrl ?? null,
    gender: p.gender ?? null,
    product_type: p.type ?? null,
    size_table_id: p.sizeTableId ?? null,
  };
}

export async function upsertProductAction(p: Product) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('products').upsert(productToRow(p));
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath(`/produto/${p.id}`);
}

export async function deleteProductAction(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function upsertCollectionAction(c: Collection) {
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
  revalidatePath('/');
  revalidatePath(`/colecao/${c.id}`);
}

export async function upsertHomepageSectionAction(section: HomepageSection) {
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

export async function upsertSizeTableAction(t: SizeTable) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('size_tables').upsert({
    id: t.id,
    name: t.name,
    columns: t.columns,
    rows: t.rows,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tabelas');
  revalidatePath('/produto/[id]', 'page');
}

export async function deleteSizeTableAction(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('size_tables').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/tabelas');
  revalidatePath('/produto/[id]', 'page');
}

export async function upsertPaymentConfigAction(config: PaymentConfig) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('payment_config').upsert({
    id: 'default',
    max_parcelas: config.maxParcelas,
    parcela_minima: config.parcelaMinima,
    juros: config.juros === 'sem' ? 'sem' : String(config.juros),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/pagamentos');
  revalidatePath('/produto/[id]', 'page');
}
