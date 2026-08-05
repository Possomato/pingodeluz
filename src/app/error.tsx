'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção o digest é o que liga esta tela ao log do servidor.
    console.error('Erro na página:', error);
  }, [error]);

  return (
    <div className="pdl-app">
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', gap: 16 }}>
        <div className="pdl-eyebrow">algo saiu do lugar</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400 }}>
          Não conseguimos <em style={{ fontFamily: 'var(--editorial)' }}>carregar</em> esta página
        </h1>
        <p style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 15, color: 'var(--muted)', maxWidth: 340, lineHeight: 1.5 }}>
          Foi um problema nosso, não seu. Tente de novo em instantes.
        </p>
        <button
          onClick={reset}
          style={{ marginTop: 8, padding: '12px 22px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em' }}
        >
          tentar novamente
        </button>
        {error.digest && (
          <code style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>ref: {error.digest}</code>
        )}
      </div>
    </div>
  );
}
