import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Retorno do OAuth. O perfil em `public.users` é criado por trigger no
 * banco, então aqui só resta trocar o código pela sessão.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/perfil';

  // Só caminhos internos: um `next` absoluto viraria redirect aberto.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/perfil';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/perfil?error=auth`);
}
