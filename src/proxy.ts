import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (antigo `middleware` — renomeado no Next.js 16).
 *
 * Faz duas coisas, e só elas:
 *   1. Renova a sessão do Supabase a cada requisição, para que os cookies
 *      não expirem enquanto o usuário navega.
 *   2. Barra rotas que exigem sessão.
 *
 * A checagem de *administrador* NÃO acontece aqui — ela exige uma consulta
 * ao banco, cara demais para rodar em toda requisição, e o proxy pode ser
 * executado na CDN. Quem garante isso é `requireAdmin()` no layout do admin
 * e em cada Server Action (ADR-5).
 */

const AUTH_REQUIRED = ['/checkout', '/confirmacao', '/pedido', '/admin'];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalida o token no servidor — diferente de getSession(),
  // que confia no cookie. Também é o que dispara o refresh.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /admin/login precisa ficar acessível para quem ainda não entrou.
  const needsAuth =
    AUTH_REQUIRED.some((p) => pathname.startsWith(p)) && pathname !== '/admin/login';

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/perfil';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
};
