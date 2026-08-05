'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { formatCentavos } from '@/lib/money';
import type { Order } from '@/app/actions/orders';

const PAYMENT_LABEL: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  boleto: 'Boleto bancário',
};

export default function ConfirmacaoClient({
  order,
  pendingHint,
}: {
  order: Order;
  pendingHint: boolean;
}) {
  const router = useRouter();
  const { clearCart } = useCart();
  const cleared = useRef(false);

  // O carrinho só é esvaziado aqui — se a pessoa desistir no provedor e
  // voltar para a loja, a sacola dela continua intacta.
  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    if (order.status !== 'recusado' && order.status !== 'cancelado') clearCart();
  }, [order.status, clearCart]);

  const isPending = pendingHint || order.status === 'pendente';
  const isRejected = order.status === 'recusado' || order.status === 'cancelado';

  const paymentLabel = order.paymentMethod
    ? PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod
    : isPending
      ? 'Aguardando confirmação'
      : 'Confirmado';

  const customerName = (order.address?.name ?? '').split(' ')[0] || 'cliente';
  const email = order.address?.email ?? '';

  return (
    <div className="pdl-app">
      <div className="pdl-confirm">
        <div className="pdl-confirm-spark">
          <Sparkle size={28} color="currentColor" />
        </div>

        <h2>
          {isRejected ? <>Pagamento <em>não concluído</em></>
            : isPending ? <>Pedido <em>registrado!</em></>
            : <>Pedido <em>confirmado!</em></>}
        </h2>

        <div className="num">nº {order.orderNumber}</div>

        <p>
          {isRejected ? (
            <>O pagamento não foi aprovado, então ainda não separamos as peças.
              Você pode tentar de novo quando quiser.</>
          ) : isPending ? (
            <>Obrigada, {customerName}. Assim que o pagamento for confirmado, avisamos
              em <strong style={{ color: 'var(--ink)', fontStyle: 'normal' }}>{email}</strong> e
              começamos a preparar tudo. Pix costuma levar segundos; boleto, até 2 dias úteis.</>
          ) : (
            <>Obrigada, {customerName}. Estamos preparando cada peça com carinho — você vai
              receber um e-mail em <strong style={{ color: 'var(--ink)', fontStyle: 'normal' }}>{email}</strong> assim
              que sair do nosso ateliê.</>
          )}
        </p>

        <div className="pdl-confirm-summary">
          <div className="lbl">total</div>
          <div className="val" style={{ fontSize: 22, fontWeight: 500, fontFamily: 'var(--serif)' }}>
            {formatCentavos(order.totalCentavos)}
          </div>
          <div className="lbl">pagamento</div>
          <div className="val">{paymentLabel}</div>
          <div className="lbl">itens</div>
          <div className="val">
            {order.items.map((i) => `${i.name} (tam. ${i.size})`).join(', ')}
          </div>
          {order.trackingCode && (
            <>
              <div className="lbl">rastreio</div>
              <div className="val">{order.trackingCode}</div>
            </>
          )}
        </div>

        <div className="pdl-confirm-cta">
          <button className="primary" onClick={() => router.push('/')}>continuar explorando</button>
          <button className="secondary" onClick={() => router.push(`/pedido/${order.id}`)}>
            acompanhar pedido
          </button>
        </div>

        <div style={{ marginTop: 36, padding: '20px 0', borderTop: '1px solid var(--border-soft)', fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 14, color: 'var(--muted)', textAlign: 'center', maxWidth: 280 }}>
          &ldquo;Quando chegar, mande uma foto pra gente?<br />adoramos ver os pingos vestidos.&rdquo;
        </div>
      </div>
    </div>
  );
}
