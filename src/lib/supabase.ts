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
//
// Memoizado de propósito. Cada chamada a `createBrowserClient` cria um
// GoTrueClient novo, e dois deles na mesma página não conversam: o
// `onAuthStateChange` de um não dispara quando o outro faz login. Como
// o login por código (LoginPanel) e o UserContext vivem na mesma tela,
// eles precisam ser literalmente o mesmo client. O Supabase também
// avisa no console quando detecta instâncias duplicadas.
// A função intermediária não é enfeite: `createBrowserClient` é
// genérica, e `ReturnType<typeof createBrowserClient>` direto resolveria
// para os parâmetros default, apagando a tipagem do client.
function makeBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let browserClient: ReturnType<typeof makeBrowserClient> | undefined;

export function createClient() {
  // Componentes 'use client' também rodam no servidor durante o SSR, e
  // lá um cache em escopo de módulo sobreviveria entre requisições de
  // pessoas diferentes. O client de servidor nasce sem cookie e sem
  // sessão, então não haveria o que vazar — mas depender disso é frágil.
  // Fora do browser, devolvemos sempre um client novo.
  if (typeof window === 'undefined') return makeBrowserClient();

  browserClient ??= makeBrowserClient();
  return browserClient;
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
