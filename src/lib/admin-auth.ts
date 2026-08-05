import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';

/**
 * Fronteira de autorização do painel (ADR-5).
 *
 * O proxy só confere se existe sessão — é barato e roda em toda
 * requisição. Quem decide se a pessoa é administradora é esta função,
 * chamada no layout do admin e na primeira linha de TODA Server Action
 * que usa o service role.
 *
 * Antes disso, a senha do admin era uma constante no bundle do cliente
 * e as actions gravavam sem verificar nada: qualquer visitante podia
 * alterar o catálogo.
 */

export class NotAuthenticatedError extends Error {
  constructor() {
    super('NAO_AUTENTICADO');
    this.name = 'NotAuthenticatedError';
  }
}

export class NotAuthorizedError extends Error {
  constructor() {
    super('NAO_AUTORIZADO');
    this.name = 'NotAuthorizedError';
  }
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Devolve o admin da requisição ou lança. Nunca retorna null: quem
 * chama não deve precisar lembrar de checar.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new NotAuthenticatedError();

  // Service role porque a policy de `users` só deixa o dono ler a
  // própria linha — o que aqui basta, mas o service role evita
  // depender do formato da policy.
  const service = createServiceClient();
  const { data, error } = await service
    .from('users')
    .select('is_admin, name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data?.is_admin) throw new NotAuthorizedError();

  return {
    id: user.id,
    email: (data.email as string) ?? user.email ?? '',
    name: (data.name as string) ?? '',
  };
}

/** Versão booleana, para a UI decidir o que mostrar. Não protege nada. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}
