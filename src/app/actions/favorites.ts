'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { rowToProduct, type Product } from '@/lib/data';

/**
 * Favoritos do cliente. A policy "own favorites" já restringe as linhas
 * ao dono, então o client com sessão basta.
 */

export async function getFavoritesAction(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', user.id);

  if (error) throw new Error(`Falha ao carregar favoritos: ${error.message}`);
  return data?.map((f) => f.product_id as string) ?? [];
}

/**
 * Os produtos favoritados, já resolvidos.
 *
 * A versão anterior resolvia id → produto no cliente com uma função que,
 * ao não encontrar, devolvia o primeiro produto de uma lista fixa — o
 * favorito de uma peça excluída virava outra peça qualquer.
 */
export async function getFavoriteProductsAction(): Promise<Product[]> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: favs } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', user.id);

  const ids = (favs ?? []).map((f) => f.product_id as string);
  if (ids.length === 0) return [];

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .in('id', ids)
    .eq('active', true);

  if (error) throw new Error(`Falha ao carregar favoritos: ${error.message}`);

  // Produtos excluídos ou despublicados simplesmente somem da lista.
  return (products ?? []).map(rowToProduct);
}

export async function toggleFavoriteAction(productId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('NAO_AUTENTICADO');

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
    revalidatePath('/perfil');
    return false;
  }

  await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
  revalidatePath('/perfil');
  return true;
}

export async function isFavoritedAction(productId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  return !!data;
}
