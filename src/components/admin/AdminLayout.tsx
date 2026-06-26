'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <span className="adm-logo">Pingo de Luz <em>· Admin</em></span>
        <nav className="adm-nav">
          <Link href="/admin/produtos" className={pathname.startsWith('/admin/produtos') ? 'active' : ''}>Produtos</Link>
          <Link href="/admin/colecoes" className={pathname.startsWith('/admin/colecoes') ? 'active' : ''}>Coleções</Link>
          <Link href="/admin/homepage" className={pathname.startsWith('/admin/homepage') ? 'active' : ''}>Homepage</Link>
          <Link href="/admin/tabelas" className={pathname.startsWith('/admin/tabelas') ? 'active' : ''}>Tabelas</Link>
          <Link href="/admin/pagamentos" className={pathname.startsWith('/admin/pagamentos') ? 'active' : ''}>Pagamentos</Link>
        </nav>
        <button className="adm-logout" onClick={() => { logout(); router.push('/admin/login'); }}>Sair</button>
      </header>
      <main className="adm-main">{children}</main>
    </div>
  );
}
