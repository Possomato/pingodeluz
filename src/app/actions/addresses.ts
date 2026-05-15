'use server';

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export interface Address {
  id: string;
  label: string;
  street: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
}

export async function getAddressesAction(): Promise<Address[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');
  return (data ?? []) as Address[];
}

export async function saveAddressAction(address: Omit<Address, 'id'> & { id?: string }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = createServiceClient();
  if (address.id) {
    await service.from('addresses').update({ ...address }).eq('id', address.id).eq('user_id', user.id);
  } else {
    await service.from('addresses').insert({ ...address, user_id: user.id });
  }
  revalidatePath('/perfil');
}

export async function deleteAddressAction(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const service = createServiceClient();
  await service.from('addresses').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/perfil');
}
