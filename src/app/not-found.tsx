import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';

export const metadata = { title: 'Página não encontrada' };

export default function NotFound() {
  return (
    <PageWrapper>
      <div style={{ minHeight: '55vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', gap: 16 }}>
        <div className="pdl-eyebrow">404</div>
        <h1 className="pdl-h1">Esse pingo se <em>perdeu</em></h1>
        <p className="pdl-lead" style={{ maxWidth: 320, margin: 0 }}>
          A página que você procurava não está mais aqui — ou talvez nunca tenha estado.
        </p>
        <Link href="/" className="pdl-btn pdl-btn--primary pdl-btn--lg" style={{ marginTop: 8 }}>
          voltar para a loja
        </Link>
      </div>
    </PageWrapper>
  );
}
