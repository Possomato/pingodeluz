'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface Props {
  src: string;
  aspect: number; // width / height, ex: 3/4 = 0.75
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const VIEW_MAX_W = 480;
const VIEW_MAX_H = 400;
const OUTPUT_W = 1000;

type T = { natW: number; natH: number; scale: number; ox: number; oy: number };

export default function CropModal({ src, aspect, onConfirm, onCancel }: Props) {
  const viewW = Math.min(VIEW_MAX_W, VIEW_MAX_H * aspect);
  const viewH = viewW / aspect;

  const [t, setT] = useState<T | null>(null);
  const imgEl = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const initT = useCallback((img: HTMLImageElement) => {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const scale = Math.max(viewW / natW, viewH / natH);
    setT({
      natW, natH, scale,
      ox: (viewW - natW * scale) / 2,
      oy: (viewH - natH * scale) / 2,
    });
  }, [viewW, viewH]);

  // Non-passive wheel handler (React's onWheel is passive by default)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setT(prev => {
        if (!prev) return prev;
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const minScale = Math.max(viewW / prev.natW, viewH / prev.natH);
        const newScale = clamp(prev.scale * factor, minScale, minScale * 6);
        const cx = viewW / 2;
        const cy = viewH / 2;
        return {
          ...prev,
          scale: newScale,
          ox: clamp(cx - (cx - prev.ox) * (newScale / prev.scale), viewW - prev.natW * newScale, 0),
          oy: clamp(cy - (cy - prev.oy) * (newScale / prev.scale), viewH - prev.natH * newScale, 0),
        };
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [viewW, viewH]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setT(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ox: clamp(prev.ox + dx, viewW - prev.natW * prev.scale, 0),
        oy: clamp(prev.oy + dy, viewH - prev.natH * prev.scale, 0),
      };
    });
  }, [viewW, viewH]);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const confirm = () => {
    const img = imgEl.current;
    if (!img || !t) return;
    const outputH = Math.round(OUTPUT_W / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_W;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;
    // viewport (0,0) maps to image pixel (-ox/scale, -oy/scale)
    ctx.drawImage(img, -t.ox / t.scale, -t.oy / t.scale, viewW / t.scale, viewH / t.scale, 0, 0, OUTPUT_W, outputH);
    canvas.toBlob(blob => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.85);
  };

  return (
    <div className="crop-backdrop" onClick={onCancel}>
      <div className="crop-modal" onClick={e => e.stopPropagation()}>
        <div className="crop-modal-title">Ajuste a imagem</div>
        <div
          ref={viewportRef}
          className="crop-viewport"
          style={{ width: viewW, height: viewH }}
          onMouseDown={onMouseDown}
        >
          <img
            ref={imgEl}
            src={src}
            alt=""
            onLoad={e => initT(e.currentTarget)}
            style={t ? {
              position: 'absolute',
              left: t.ox,
              top: t.oy,
              width: t.natW * t.scale,
              height: t.natH * t.scale,
              userSelect: 'none',
              pointerEvents: 'none',
            } : { visibility: 'hidden', position: 'absolute' }}
            draggable={false}
          />
        </div>
        <div className="crop-hint">Arraste para reposicionar · scroll para zoom</div>
        <div className="crop-actions">
          <button type="button" className="adm-btn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="adm-btn adm-btn-primary" onClick={confirm} disabled={!t}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
