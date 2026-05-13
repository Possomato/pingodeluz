'use client';

import { useState } from 'react';
import PdlHeader from './PdlHeader';
import PdlDrawer from './PdlDrawer';

interface PageWrapperProps {
  children: React.ReactNode;
  scrolled?: boolean;
}

export default function PageWrapper({ children, scrolled }: PageWrapperProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="pdl-app">
      <PdlHeader scrolled={scrolled} onMenu={() => setMenuOpen(true)} />
      {children}
      <PdlDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
