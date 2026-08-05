import { createBrowserClient, createServerClient } from '@supabase/ssr';

/**
 * Clients que podem ser importados de qualquer lugar.
 *
 * Nada aqui toca `next/headers` — esse import é exclusivo do servidor e
 * quebraria o bundle do cliente, já que `lib/data.ts` (usado por
 * componentes 'use client') importa deste módulo. Os clients com sessão
 * e o service role moram em `supabase-server.ts`.
 */

// Client do browser — anon key, sujeito a RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Client sem sessão, para ler dados públicos em Server Components.
 * Usa a anon key e respeita RLS, então só enxerga o que é público.
 */
export function createPublicClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}
