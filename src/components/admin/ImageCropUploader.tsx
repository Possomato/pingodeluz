'use client';

import { useRef, useState } from 'react';
import CropModal from './CropModal';
import { uploadImageAction } from '@/app/actions/upload';

interface Props {
  aspect: number;
  currentUrl?: string;
  onUpload: (url: string) => void;
  label?: string;
  addTile?: boolean; // renders as a + tile (no preview/placeholder)
}

export default function ImageCropUploader({ aspect, currentUrl, onUpload, label = 'foto', addTile = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') setPendingSrc(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirm = async (blob: Blob) => {
    setPendingSrc(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'image.jpg');
      const url = await uploadImageAction(fd);
      onUpload(url);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const previewH = Math.round(120 / aspect);

  if (addTile) {
    return (
      <>
        {pendingSrc && (
          <CropModal src={pendingSrc} aspect={aspect} onConfirm={handleConfirm} onCancel={() => setPendingSrc(null)} />
        )}
        <button
          type="button"
          className="adm-gallery-add-tile"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ aspectRatio: `1 / ${1 / aspect}` }}
        >
          {uploading ? <span className="adm-gallery-add-spinner" /> : <span className="adm-gallery-add-plus">+</span>}
        </button>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </>
    );
  }

  return (
    <>
      {pendingSrc && (
        <CropModal
          src={pendingSrc}
          aspect={aspect}
          onConfirm={handleConfirm}
          onCancel={() => setPendingSrc(null)}
        />
      )}
      <div className="crop-uploader">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="preview"
            style={{ width: 120, height: previewH, objectFit: 'cover', borderRadius: 4, display: 'block', marginBottom: 8 }}
          />
        ) : (
          <div style={{ width: 120, height: previewH, borderRadius: 4, marginBottom: 8, background: 'var(--cream-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)', border: '1px dashed var(--border)' }}>
            sem foto
          </div>
        )}
        <button
          type="button"
          className="adm-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'enviando…' : currentUrl ? `trocar ${label}` : `+ ${label}`}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </>
  );
}
