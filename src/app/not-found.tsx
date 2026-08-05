import Link from 'next/link';

export const metadata = { title: 'Página não encontrada' };

export default function NotFound() {
  return (
    <div className="pdl-app">
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', gap: 16 }}>
        <div className="pdl-eyebrow">404</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400 }}>
          Esse pingo se <em style={{ fontFamily: 'var(--editorial)' }}>perdeu</em>
        </h1>
        <p style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 15, color: 'var(--muted)', maxWidth: 320, lineHeight: 1.5 }}>
          A página que você procurava não está mais aqui — ou talvez nunca tenha estado.
        </p>
        <Link
          href="/"
          style={{ marginTop: 8, padding: '12px 22px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em', textDecoration: 'none' }}
        >
          voltar para a loja
        </Link>
      </div>
    </div>
  );
}
