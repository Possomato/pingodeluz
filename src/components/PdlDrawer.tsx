'use client';

import { useRouter } from 'next/navigation';
import Logo from './Logo';
import SearchBox from './SearchBox';
import { IconX, IconArrowRight } from './Icons';

interface PdlDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function PdlDrawer({ open, onClose }: PdlDrawerProps) {
  const router = useRouter();

  const handle = (path: string) => {
    onClose();
    setTimeout(() => router.push(path), 180);
  };

  return (
    <>
      <div className={`pdl-drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`pdl-drawer ${open ? 'open' : ''}`}>
        <div className="pdl-drawer-head">
          <Logo />
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
          <div className="pdl-drawer-link" onClick={() => handle('/genero/meninas')}>
            <span>Para <em>meninas</em></span>
            <span className="meta">1–12 anos</span>
          </div>
          <div className="pdl-drawer-link" onClick={() => handle('/genero/meninos')}>
            <span>Para <em>meninos</em></span>
            <span className="meta">1–12 anos</span>
          </div>
          <div className="pdl-drawer-link" onClick={() => handle('/')}>
            <span>Mais <em>queridos</em></span>
            <span className="meta">+ vendidos</span>
          </div>
        </div>

        <div className="pdl-drawer-section">
          <h4>por idade</h4>
          <div className="pdl-drawer-sub" onClick={() => handle('/genero/meninas')}>
            Recém-chegados · 0–2 anos
          </div>
          <div className="pdl-drawer-sub" onClick={() => handle('/genero/meninas')}>
            Descobridores · 3–6 anos
          </div>
          <div className="pdl-drawer-sub" onClick={() => handle('/genero/meninas')}>
            Aventureiros · 7–12 anos
          </div>
        </div>

        <div className="pdl-drawer-section">
          <h4>coleções conceituais</h4>
          <div className="pdl-drawer-link" onClick={() => handle('/colecao/jardim')}>
            <span>Jardim <em>Encantado</em></span>
            <span className="meta">atual</span>
          </div>
          <div className="pdl-drawer-link" onClick={() => handle('/colecao/doce')}>
            <span>Doce <em>Aventura</em></span>
            <span className="meta">atual</span>
          </div>
          <div className="pdl-drawer-sub" style={{ paddingTop: 12 }}>
            Arquivo de coleções
          </div>
        </div>

        <div className="pdl-drawer-section">
          <h4>minha conta</h4>
          <div className="pdl-drawer-link" onClick={() => handle('/perfil')}>
            <span>Sua <em>conta</em></span>
            <span className="meta">pedidos · endereços</span>
          </div>
          <div className="pdl-drawer-sub" onClick={() => handle('/carrinho')}>
            Sua sacola
          </div>
        </div>

        <div className="pdl-drawer-section">
          <h4>institucional</h4>
          <div className="pdl-drawer-sub">Nossa história</div>
          <div className="pdl-drawer-sub">Como fazemos</div>
          <div className="pdl-drawer-sub">Guia de tamanhos</div>
          <div className="pdl-drawer-sub">Trocas e devoluções</div>
        </div>

        <div className="pdl-drawer-foot">
          <div className="contact">
            atendimento@pingodeluz.com<br />
            WhatsApp · (11) 9 8000-0000
          </div>
          <div className="ig">
            @pingodeluz <IconArrowRight size={11} />
          </div>
        </div>
      </div>
    </>
  );
}
