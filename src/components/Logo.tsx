'use client';

export default function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <span className="pdl-logo" onClick={onClick}>
      <img
        src="/logo-transparente.png"
        alt="Pingo de Luz"
        className="pdl-logo-img"
        draggable={false}
      />
    </span>
  );
}
