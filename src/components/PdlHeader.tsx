'use client';

import { useRouter } from 'next/navigation';
import Logo from './Logo';
import SearchBox from './SearchBox';
import { IconMenu, IconBag, IconUser } from './Icons';
import { useCart } from '@/context/CartContext';

interface PdlHeaderProps {
  scrolled?: boolean;
  onMenu: () => void;
}

export default function PdlHeader({ scrolled, onMenu }: PdlHeaderProps) {
  const router = useRouter();
  const { cartCount } = useCart();

  return (
    <div className={`pdl-header ${scrolled ? 'solid' : ''}`}>
      <button className="pdl-header-icon pdl-header-menu" onClick={onMenu} aria-label="Menu">
        <IconMenu />
      </button>
      <Logo onClick={() => router.push('/')} />
      <SearchBox variant="header" />
      <div className="pdl-header-icons" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <button className="pdl-header-icon" onClick={() => router.push('/perfil')} aria-label="Perfil">
          <IconUser />
        </button>
        <button
          className="pdl-header-icon"
          style={{ position: 'relative' }}
          onClick={() => router.push('/carrinho')}
          aria-label="Sacola"
        >
          <IconBag />
          {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
        </button>
      </div>
    </div>
  );
}
