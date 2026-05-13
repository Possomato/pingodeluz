'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkle } from '@/components/Icons';
import { formatPrice } from '@/lib/data';
import { Suspense } from 'react';

function ConfirmacaoContent() {
  const router = useRouter();
  const params = useSearchParams();

  const orderNumber = params.get('num') || 'PDL-00000';
  const total = Number(params.get('total') || 0);
  const payment = params.get('payment') || 'pix';
  const email = params.get('email') || '';
  const name = params.get('name') || '';

  return (
    <div className="pdl-app">
      <div className="pdl-confirm">
        <div className="pdl-confirm-spark">
          <Sparkle size={28} color="currentColor" />
        </div>
        <h2>Pedido <em>confirmado!</em></h2>
        <div className="num">nº {orderNumber}</div>
        <p>
          Obrigada, {name.split(' ')[0]}. Estamos preparando cada peça com carinho — você vai receber um e-mail em{' '}
          <strong style={{ color: 'var(--ink)', fontStyle: 'normal' }}>{email}</strong> assim que sair do nosso ateliê.
        </p>

        <div className="pdl-confirm-summary">
          <div className="lbl">total</div>
          <div className="val" style={{ fontSize: 22, fontWeight: 500, fontFamily: 'var(--serif)' }}>{formatPrice(total)}</div>
          <div className="lbl">pagamento</div>
          <div className="val">
            {payment === 'pix' && 'Pix · QR Code enviado por e-mail'}
            {payment === 'card' && 'Cartão de crédito · em 3x sem juros'}
            {payment === 'boleto' && 'Boleto · enviado por e-mail'}
          </div>
          <div className="lbl">previsão de entrega</div>
          <div className="val">5 a 8 dias úteis</div>
          <div className="lbl">acompanhe</div>
          <div className="val" style={{ fontStyle: 'italic', color: 'var(--terra)' }}>código de rastreio chega em até 3 dias úteis</div>
        </div>

        <div className="pdl-confirm-cta">
          <button className="primary" onClick={() => router.push('/')}>continuar explorando</button>
          <button className="secondary">acompanhar pedido</button>
        </div>

        <div style={{ marginTop: 36, padding: '20px 0', borderTop: '1px solid var(--border-soft)', fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', textAlign: 'center', maxWidth: 280 }}>
          "Quando chegar, mande uma foto pra gente?<br />adoramos ver os pingos vestidos."
        </div>
      </div>
    </div>
  );
}

export default function ConfirmacaoPage() {
  return (
    <Suspense>
      <ConfirmacaoContent />
    </Suspense>
  );
}
