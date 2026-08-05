import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Clients exclusivos do servidor.
 *
 * Este módulo importa `next/headers`, então NUNCA pode ser importado —
 * nem transitivamente — por um componente 'use client'.
 *
 *   createServerSupabaseClient() → Server Components e Server Actions.
 *                                  Carrega a sessão e respeita RLS.
 *   createServiceClient()        → ignora RLS. Só depois de autorizar
 *                                  quem chamou (ver lib/admin-auth.ts).
 */

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components não podem gravar cookies; o refresh da
            // sessão acontece no proxy, então ignorar aqui é seguro.
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

/** Usuário da requisição atual, ou null. */
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signOutUser() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}
