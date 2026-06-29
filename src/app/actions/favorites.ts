'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getFavoritesAction(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }

  return data?.map(f => f.product_id) ?? [];
}

export async function toggleFavoriteAction(productId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single();

  if (existing) {
    // Remove favorite
    await supabase
      .from('favorites')
      .delete()
      .eq('id', existing.id);
    revalidatePath('/perfil');
    return false;
  } else {
    // Add favorite
    await supabase
      .from('favorites')
      .insert([{ user_id: user.id, product_id: productId }]);
    revalidatePath('/perfil');
    return true;
  }
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
    .single();

  return !!data;
}
