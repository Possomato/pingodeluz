'use server';

import { createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Product, Collection } from '@/lib/data';

function productToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    name_parts: p.nameParts,
    col: p.col,
    price: p.price,
    tint: p.tint,
    label: p.label ?? '',
    installments: p.installments ?? null,
    description: p.desc ?? null,
    sizes: p.sizes ?? [],
    unavail: p.unavail ?? [],
    stock: p.stock ?? {},
    gallery_labels: p.galleryLabels ?? [],
    image_url: p.imageUrl ?? null,
    gender: p.gender ?? null,
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
