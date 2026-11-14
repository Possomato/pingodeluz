'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';
import { useUser } from '@/context/UserContext';

/**
 * Navegação agrupada pelo que a pessoa veio fazer, não pela tabela do
 * banco: o dia a dia primeiro, depois o catálogo, a vitrine e, por
 * último, o que se configura uma vez e esquece.
 */
const NAV: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: 'Dia a dia',
    items: [
      { href: '/admin/dashboard', label: 'Início' },
      { href: '/admin/pedidos', label: 'Pedidos' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/admin/produtos', label: 'Peças' },
      { href: '/admin/estoque', label: 'Estoque' },
      { href: '/admin/colecoes', label: 'Coleções' },
      { href: '/admin/tabelas', label: 'Tabelas de medidas' },
    ],
  },
  {
    title: 'Vitrine',
    items: [
      { href: '/admin/homepage', label: 'Página inicial' },
      { href: '/admin/depoimentos', label: 'Depoimentos' },
      { href: '/admin/cupons', label: 'Cupons' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { href: '/admin/frete', label: 'Frete' },
      { href: '/admin/pagamentos', label: 'Parcelamento' },
      { href: '/admin/clientes', label: 'Clientes' },
    ],
  },
];

/**
 * Moldura do painel. Não decide quem entra — quem faz isso é o layout
 * de servidor em app/admin/(painel)/layout.tsx.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { error, clearError } = useAdmin();
  const { signOut } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Trocar de tela fecha o menu do celular.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return (
    <div className="adm-shell">
      <div className="adm-topbar">
        <button className="adm-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">☰</button>
        <Link href="/admin/dashboard" className="adm-logo">Pingo de Luz</Link>
        <span style={{ width: 44 }} />
      </div>

      {menuOpen && <div className="adm-side-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`adm-side${menuOpen ? ' open' : ''}`}>
        <Link href="/admin/dashboard" className="adm-logo">
          Pingo de Luz
          <em>painel da loja</em>
        </Link>

        <nav aria-label="Painel">
          {NAV.map((group) => (
            <div key={group.title} className="adm-nav-group">
              <h4>{group.title}</h4>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`adm-nav-link${pathname.startsWith(item.href) ? ' active' : ''}`}
                  aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noopener noreferrer" className="adm-nav-link">Ver a loja ↗</a>
          <button className="adm-logout" onClick={handleSignOut}>Sair do painel</button>
        </div>
      </aside>

      <main className="adm-main">
        {error && (
          <div role="alert" className="adm-alert">
            <span>{error}</span>
            <button onClick={clearError} aria-label="Fechar aviso">✕</button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
