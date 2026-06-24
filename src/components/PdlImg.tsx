'use client';

interface PdlImgProps {
  tint?: string;
  label?: string;
  ratio?: string;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  imageUrl?: string;
}

export default function PdlImg({ tint, label, ratio, style = {}, className = '', children, imageUrl }: PdlImgProps) {
  return (
    <div
      className={`pdl-img ${tint ? 'tint-' + tint : ''} ${className}`}
      style={{
        aspectRatio: ratio,
        ...(imageUrl ? { backgroundImage: `url("${imageUrl.replace(/"/g, '%22')}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
        ...style,
      }}
    >
      {label && !imageUrl && <span className="pdl-img-label">{label}</span>}
      {children}
    </div>
  );
}
