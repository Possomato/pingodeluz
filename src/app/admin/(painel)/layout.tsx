import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin-auth';
import { AdminProvider } from '@/context/AdminContext';

/**
 * Portão do painel. Roda no servidor a cada navegação em /admin.
 *
 * O proxy só verifica se existe sessão; é aqui que se verifica se a
 * sessão pertence a uma administradora. As Server Actions repetem a
 * checagem por conta própria — este layout protege a navegação, não os
 * dados (ADR-5).
 */
export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  return <AdminProvider>{children}</AdminProvider>;
}
