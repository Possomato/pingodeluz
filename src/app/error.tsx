'use client';

import { useEffect } from 'react';
import PageWrapper from '@/components/PageWrapper';

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
    <PageWrapper footer={false}>
      <div style={{ minHeight: '55vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', gap: 16 }}>
        <div className="pdl-eyebrow">algo saiu do lugar</div>
        <h1 className="pdl-h1">Não conseguimos <em>carregar</em> esta página</h1>
        <p className="pdl-lead" style={{ maxWidth: 340, margin: 0 }}>
          Foi um problema nosso, não seu. Tente de novo em instantes.
        </p>
        <button onClick={reset} className="pdl-btn pdl-btn--primary pdl-btn--lg" style={{ marginTop: 8 }}>
          tentar novamente
        </button>
        {error.digest && (
          <code style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>ref: {error.digest}</code>
        )}
      </div>
    </PageWrapper>
  );
}
