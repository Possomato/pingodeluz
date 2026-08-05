'use server';

import { isCurrentUserAdmin } from '@/lib/admin-auth';

/**
 * A conta logada é administradora?
 *
 * Serve só para a UI decidir para onde navegar. Não protege nada: a
 * proteção real está em `requireAdmin()` dentro de cada action e no
 * layout de servidor do painel.
 */
export async function checkIsAdminAction(): Promise<boolean> {
  return isCurrentUserAdmin();
}
