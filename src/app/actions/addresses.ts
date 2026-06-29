'use server';

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export interface Address {
  id: string;
  label: string;
  zip: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export async function getAddressesAction(): Promise<Address[]> {
  console.log('[SERVER] getAddressesAction called');
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[SERVER] User:', user?.id);
  if (!user) {
    console.log('[SERVER] No user found');
    return [];
  }
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');

  console.log('[SERVER] Query result:', { data, error });
  return (data ?? []) as Address[];
}

export async function saveAddressAction(address: Omit<Address, 'id'> & { id?: string }) {
  console.log('[SERVER] saveAddressAction called with:', address);
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[SERVER] Current user:', user?.id);

  if (!user) {
    console.error('[SERVER] Not authenticated');
    throw new Error('Not authenticated');
  }

  const service = createServiceClient();
  try {
    if (address.id) {
      console.log('[SERVER] Updating address:', address.id);
      const result = await service.from('addresses').update({ ...address }).eq('id', address.id).eq('user_id', user.id);
      console.log('[SERVER] Update result:', result);
    } else {
      console.log('[SERVER] Inserting new address');
      const insertData = { ...address, user_id: user.id };
      console.log('[SERVER] Insert data:', insertData);
      const result = await service.from('addresses').insert([insertData]);
      console.log('[SERVER] Insert result:', result);
    }
    console.log('[SERVER] Revalidating path /perfil');
    revalidatePath('/perfil');
  } catch (error) {
    console.error('[SERVER] Error saving address:', error);
    throw error;
  }
}

export async function deleteAddressAction(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const service = createServiceClient();
  await service.from('addresses').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/perfil');
}
