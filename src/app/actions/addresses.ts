'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
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

/**
 * Endereços do cliente. Tudo aqui usa o client com sessão: a policy
 * "own addresses" garante que ninguém veja nem altere endereço alheio,
 * então não há motivo para recorrer ao service role.
 */
export async function getAddressesAction(): Promise<Address[]> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');

  if (error) throw new Error(`Falha ao carregar endereços: ${error.message}`);
  return (data ?? []) as Address[];
}

export async function saveAddressAction(
  address: Omit<Address, 'id'> & { id?: string }
): Promise<Address> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('NAO_AUTENTICADO');

  const row = {
    label: address.label,
    zip: address.zip,
    street: address.street,
    number: address.number,
    complement: address.complement ?? '',
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
  };

  const query = address.id
    ? supabase.from('addresses').update(row).eq('id', address.id).eq('user_id', user.id)
    : supabase.from('addresses').insert({ ...row, user_id: user.id });

  const { data, error } = await query.select().single();
  if (error) throw new Error(`Falha ao salvar endereço: ${error.message}`);

  revalidatePath('/perfil');
  revalidatePath('/checkout');
  return data as Address;
}

export async function deleteAddressAction(id: string) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('NAO_AUTENTICADO');

  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(`Falha ao excluir endereço: ${error.message}`);

  revalidatePath('/perfil');
  revalidatePath('/checkout');
}
