'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkle } from '@/components/Icons';
import { createBrowserClient } from '@supabase/ssr';

interface Order {
  id: string;
  total: number;
  status: string;
  mp_payment_method: string | null;
  created_at: string;
  items: Array<{ name: string; price: string; qty: number; size: string }>;
  address: Record<string, string>;
}

function formatPrice(n: number): string {
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function ConfirmacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const isPending = searchParams.get('pending') === 'true';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { router.replace('/'); return; }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        setOrder(data);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) return <div className="pdl-app" style={{ minHeight: '60vh' }} />;
  if (!order) return (
    <div className="pdl-app">
      <div style={{ padding: 40, fontFamily: 'var(--editorial)', fontStyle: 'italic', color: 'var(--muted)' }}>
        Pedido não encontrado.
      </div>
    </div>
  );

  const paymentLabel =
    order.mp_payment_method?.includes('pix') ? 'Pix' :
    order.mp_payment_method?.includes('credit') ? 'Cartão de crédito' :
    order.mp_payment_method?.includes('debit') ? 'Cartão de débito' :
    order.mp_payment_method ?? (isPending ? 'Aguardando confirmação' : 'Confirmado');

  const customerName = order.address?.name?.split(' ')[0] ?? 'cliente';
  const email = order.address?.email ?? '';
  const orderNumber = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="pdl-app">
      <div className="pdl-confirm">
        <div className="pdl-confirm-spark">
          <Sparkle size={28} color="currentColor" />
        </div>
        <h2>Pedido <em>confirmado!</em></h2>
        <div className="num">nº {orderNumber}</div>
        <p>
          Obrigada, {customerName}. Estamos preparando cada peça com carinho — você vai receber um e-mail em{' '}
          <strong style={{ color: 'var(--ink)', fontStyle: 'normal' }}>{email}</strong> assim que sair do nosso ateliê.
        </p>

        <div className="pdl-confirm-summary">
          <div className="lbl">total</div>
          <div className="val" style={{ fontSize: 22, fontWeight: 500, fontFamily: 'var(--serif)' }}>{formatPrice(order.total)}</div>
          <div className="lbl">pagamento</div>
          <div className="val">{paymentLabel}</div>
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
