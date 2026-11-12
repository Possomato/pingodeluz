'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import SearchBox from './SearchBox';
import { IconX, IconArrowRight } from './Icons';
import { useCart } from '@/context/CartContext';

interface PdlDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function PdlDrawer({ open, onClose }: PdlDrawerProps) {
  const router = useRouter();
  const { cartCount, openBag } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handle = (path: string) => {
    onClose();
    setTimeout(() => router.push(path), 180);
  };

  return (
    <>
      <div className={`pdl-drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`pdl-drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open}>
        <div className="pdl-drawer-head">
          <Logo onClick={() => handle('/')} />
          <button className="pdl-drawer-close" onClick={onClose} aria-label="Fechar menu">
            <IconX size={16} />
          </button>
        </div>

        <div className="pdl-drawer-greeting">
          <div className="eyebrow">olá, mãe</div>
          <h3>Que bom <em>te ver</em> por aqui.</h3>
        </div>

        <SearchBox variant="drawer" onNavigate={onClose} />

        <div className="pdl-drawer-section">
          <h4>comprar</h4>
          <button className="pdl-drawer-link" onClick={() => handle('/genero/meninas')}>
            <span>Para <em>meninas</em></span>
            <span className="meta">1m–14 anos</span>
          </button>
          <button className="pdl-drawer-link" onClick={() => handle('/genero/meninos')}>
            <span>Para <em>meninos</em></span>
            <span className="meta">1m–14 anos</span>
          </button>
          <button className="pdl-drawer-link" onClick={() => handle('/#colecoes')}>
            <span>Coleções <em>conceituais</em></span>
            <span className="meta">lookbooks</span>
          </button>
        </div>

        <div className="pdl-drawer-section">
          <h4>minha conta</h4>
          <button className="pdl-drawer-link" onClick={() => handle('/perfil')}>
            <span>Sua <em>conta</em></span>
            <span className="meta">pedidos · endereços</span>
          </button>
          <button className="pdl-drawer-sub" onClick={() => { onClose(); setTimeout(openBag, 200); }}>
            Sua sacola{cartCount > 0 ? ` · ${cartCount} ${cartCount === 1 ? 'peça' : 'peças'}` : ''}
          </button>
        </div>

        <div className="pdl-drawer-section">
          <h4>a pingo de luz</h4>
          <button className="pdl-drawer-sub" onClick={() => handle('/sobre')}>Nossa história</button>
          <button className="pdl-drawer-sub" onClick={() => handle('/trocas')}>Envio e trocas</button>
          <button className="pdl-drawer-sub" onClick={() => handle('/privacidade')}>Privacidade</button>
          <button className="pdl-drawer-sub" onClick={() => handle('/termos')}>Termos de uso</button>
        </div>

        <div className="pdl-drawer-foot">
          <div className="contact">
            atendimento@pingodeluz.com
          </div>
          <a className="ig" href="https://instagram.com/pingodeluz" target="_blank" rel="noopener noreferrer">
            @pingodeluz <IconArrowRight size={11} />
          </a>
        </div>
      </div>
    </>
  );
}
