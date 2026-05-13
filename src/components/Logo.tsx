'use client';

import { Sparkle } from './Icons';

export default function Logo({ size = 19, onClick }: { size?: number; onClick?: () => void }) {
  return (
    <span className="pdl-logo" style={{ fontSize: size }} onClick={onClick}>
      <span style={{ position: 'relative' }}>
        Pingo
        <span style={{ position: 'absolute', top: -4, right: -8, fontSize: size * 0.32, color: 'var(--terra)' }}>
          <Sparkle size={size * 0.34} color="var(--terra)" />
        </span>
      </span>
      <span className="pdl-logo-sub" style={{ fontSize: size * 0.55 }}>de luz</span>
    </span>
  );
}
