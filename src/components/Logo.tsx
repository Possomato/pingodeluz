'use client';

import { Sparkle } from './Icons';

export default function Logo({ size = 19, onClick }: { size?: number; onClick?: () => void }) {
  return (
    <span className="pdl-logo" onClick={onClick}>
      <span style={{ position: 'relative' }}>
        Pingo
        <span style={{ position: 'absolute', top: -4, right: -8, fontSize: '0.32em', color: 'var(--terra)' }}>
          <Sparkle size={size * 0.34} color="var(--terra)" />
        </span>
      </span>
      <span className="pdl-logo-sub">de luz</span>
    </span>
  );
}
