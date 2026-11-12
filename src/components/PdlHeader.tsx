'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import SearchBox from './SearchBox';
import { IconMenu, IconBag, IconUser, IconChevronLeft, IconLock } from './Icons';
import { useCart } from '@/context/CartContext';

interface PdlHeaderProps {
  /** Força o estado "rolado". Sem isso o header observa o scroll sozinho. */
  scrolled?: boolean;
  onMenu?: () => void;
  /** `slim`: checkout — só logo, voltar e selo de segurança. */
  variant?: 'default' | 'slim';
  backHref?: string;
  backLabel?: string;
}

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [threshold]);
  return scrolled;
}

export default function PdlHeader({ scrolled, onMenu, variant = 'default', backHref = '/carrinho', backLabel = 'voltar para a sacola' }: PdlHeaderProps) {
  const router = useRouter();
  const { cartCount, openBag } = useCart();
  const autoScrolled = useScrolled();
  const isSolid = scrolled ?? autoScrolled;

  if (variant === 'slim') {
    return (
      <header className={`pdl-header pdl-header--slim ${isSolid ? 'solid' : ''}`}>
        <div className="pdl-header-left">
          <Link href={backHref} className="pdl-header-back">
            <IconChevronLeft size={16} />
            <span>{backLabel}</span>
          </Link>
        </div>
        <Logo onClick={() => router.push('/')} />
        <div className="pdl-header-right">
          <span className="pdl-header-secure"><IconLock size={12} /> compra segura</span>
        </div>
      </header>
    );
  }

  return (
    <header className={`pdl-header ${isSolid ? 'solid' : ''}`}>
      <div className="pdl-header-left">
        <button className="pdl-header-icon pdl-header-menu" onClick={onMenu} aria-label="Menu">
          <IconMenu />
        </button>
      </div>
      <Logo onClick={() => router.push('/')} />
      <nav className="pdl-header-nav" aria-label="Principal">
        <Link href="/genero/meninas">Meninas</Link>
        <Link href="/genero/meninos">Meninos</Link>
        <Link href="/#colecoes">Coleções</Link>
      </nav>
      <div className="pdl-header-right">
        <SearchBox variant="header" />
        <div className="pdl-header-icons">
          <button className="pdl-header-icon" onClick={() => router.push('/perfil')} aria-label="Minha conta">
            <IconUser />
          </button>
          <button className="pdl-header-icon" onClick={openBag} aria-label={`Sacola${cartCount ? `, ${cartCount} ${cartCount === 1 ? 'peça' : 'peças'}` : ''}`}>
            <IconBag />
            {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
