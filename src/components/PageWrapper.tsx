'use client';

import { useState } from 'react';
import PdlHeader from './PdlHeader';
import PdlDrawer from './PdlDrawer';
import PdlFooter from './PdlFooter';

interface PageWrapperProps {
  children: React.ReactNode;
  scrolled?: boolean;
  /** Esconde o rodapé (telas de fluxo, como confirmação). */
  footer?: boolean;
  className?: string;
}

/** Casca padrão da loja: header, menu lateral e rodapé. */
export default function PageWrapper({ children, scrolled, footer = true, className = '' }: PageWrapperProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`pdl-app ${className}`}>
      <PdlHeader scrolled={scrolled} onMenu={() => setMenuOpen(true)} />
      {children}
      {footer && <PdlFooter />}
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
