'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import { useUser } from '@/context/UserContext';

const NAV = [
  { href: '/admin/dashboard', label: 'Início' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/produtos', label: 'Produtos' },
  { href: '/admin/estoque', label: 'Estoque' },
  { href: '/admin/colecoes', label: 'Coleções' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/cupons', label: 'Cupons' },
  { href: '/admin/homepage', label: 'Homepage' },
  { href: '/admin/depoimentos', label: 'Depoimentos' },
  { href: '/admin/tabelas', label: 'Tabelas' },
  { href: '/admin/pagamentos', label: 'Pagamentos' },
  { href: '/admin/frete', label: 'Frete' },
];

/**
 * Moldura do painel. Não decide mais quem entra — quem faz isso é o
 * layout de servidor em app/admin/(painel)/layout.tsx.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { error, clearError } = useAdmin();
  const { signOut } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <span className="adm-logo">Pingo de Luz <em>· Admin</em></span>
        <nav className="adm-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname.startsWith(item.href) ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button className="adm-logout" onClick={handleSignOut}>Sair</button>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            border: '1px solid var(--terra, #c08660)',
            borderRadius: 3,
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button onClick={clearError} aria-label="Fechar aviso">✕</button>
        </div>
      )}

      <main className="adm-main">{children}</main>
    </div>
  );
}
