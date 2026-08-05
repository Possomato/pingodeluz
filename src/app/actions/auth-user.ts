'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Leitura e edição do perfil da pessoa logada.
 *
 * A *criação* do perfil deixou de morar aqui: agora é um trigger em
 * `auth.users` (migration 20260804000006). A versão anterior escrevia
 * numa tabela `profiles` que nunca existiu no banco e engolia o erro
 * num try/catch, então nenhum perfil chegava a ser criado.
 */
export async function getMyProfile() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('id, email, name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return data ?? null;
}

export async function updateMyProfileAction(patch: { name?: string }) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('NAO_AUTENTICADO');

  const { error } = await supabase
    .from('users')
    .update({ name: patch.name, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
}
