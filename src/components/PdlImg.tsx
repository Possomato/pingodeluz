'use client';

interface PdlImgProps {
  tint?: string;
  label?: string;
  ratio?: string;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export default function PdlImg({ tint, label, ratio, style = {}, className = '', children }: PdlImgProps) {
  return (
    <div
      className={`pdl-img ${tint ? 'tint-' + tint : ''} ${className}`}
      style={{ aspectRatio: ratio, ...style }}
    >
      {label && <span className="pdl-img-label">{label}</span>}
      {children}
    </div>
  );
}
