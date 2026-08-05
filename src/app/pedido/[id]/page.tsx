import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMyOrderAction } from '@/app/actions/orders';
import { formatCentavos } from '@/lib/money';
import PdlImg from '@/components/PdlImg';

export const metadata = { title: 'Seu pedido', robots: { index: false } };

/** Etapas exibidas na linha do tempo, em ordem. */
const TIMELINE = [
  { status: 'pendente', label: 'Pedido recebido' },
  { status: 'pago', label: 'Pagamento confirmado' },
  { status: 'enviado', label: 'A caminho' },
  { status: 'entregue', label: 'Entregue' },
];

const RANK: Record<string, number> = {
  pendente: 0, pago: 1, enviado: 2, entregue: 3,
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'aguardando pagamento',
  pago: 'pagamento confirmado',
  enviado: 'em trânsito',
  entregue: 'entregue',
  cancelado: 'cancelado',
  recusado: 'pagamento recusado',
  reembolsado: 'reembolsado',
};

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // A policy "own orders read" faz a filtragem: o pedido de outra pessoa
  // simplesmente não existe para esta sessão.
  const order = await getMyOrderAction(id);
  if (!order) notFound();

  const currentRank = RANK[order.status] ?? -1;
  const isTerminated = ['cancelado', 'recusado', 'reembolsado'].includes(order.status);

  return (
    <div className="pdl-app">
      <div className="pdl-cart" style={{ paddingTop: 24 }}>
        <Link
          href="/perfil"
          style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--terra)' }}
        >
          ← meus pedidos
        </Link>

        <div className="pdl-cart-title" style={{ paddingTop: 12 }}>
          Pedido <em>{order.orderNumber}</em>
        </div>
        <div className="pdl-cart-sub">
          {new Date(order.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
          {' · '}
          {STATUS_LABEL[order.status] ?? order.status}
        </div>

        {/* Linha do tempo */}
        {!isTerminated && (
          <ol style={{ listStyle: 'none', padding: 0, margin: '24px 0' }}>
            {TIMELINE.map((step, i) => {
              const done = i <= currentRank;
              return (
                <li
                  key={step.status}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', opacity: done ? 1 : 0.4 }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: done ? 'var(--terra)' : 'var(--border)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontFamily: 'var(--editorial)', fontSize: 14 }}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {order.trackingCode && (
          <div style={{ padding: '12px 14px', border: '1px dashed var(--border)', borderRadius: 3, marginBottom: 16 }}>
            <div className="pdl-eyebrow">código de rastreio</div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, marginTop: 4 }}>{order.trackingCode}</div>
          </div>
        )}

        {/* Itens */}
        <div className="pdl-review">
          {order.items.map((it) => (
            <div key={`${it.id}-${it.size}`} className="pdl-review-item">
              <PdlImg tint={it.tint} imageUrl={it.imageUrl} />
              <div>
                <div className="n">{it.name}</div>
                <div className="m">tam {it.size} · qtd {it.qty}</div>
              </div>
              <div className="p">{formatCentavos(it.lineTotalCentavos)}</div>
            </div>
          ))}

          <div className="pdl-review-totals">
            <div className="pdl-cart-summary-row" style={{ padding: '4px 0' }}>
              <span>Subtotal</span><span>{formatCentavos(order.subtotalCentavos)}</span>
            </div>
            <div className="pdl-cart-summary-row" style={{ padding: '4px 0' }}>
              <span>Frete</span>
              <span>{order.freightCentavos === 0 ? 'grátis' : formatCentavos(order.freightCentavos)}</span>
            </div>
            {order.discountCentavos > 0 && (
              <div className="pdl-cart-summary-row" style={{ padding: '4px 0', color: 'var(--terra)' }}>
                <span>Desconto{order.couponCode ? ` ${order.couponCode}` : ''}</span>
                <span>− {formatCentavos(order.discountCentavos)}</span>
              </div>
            )}
            <div className="pdl-cart-summary-row total" style={{ marginTop: 8 }}>
              <span>Total</span><span>{formatCentavos(order.totalCentavos)}</span>
            </div>
          </div>
        </div>

        {/* Entrega */}
        <div className="pdl-profile-section" style={{ marginTop: 24 }}>
          <h3><span>Entrega</span></h3>
          <div style={{ fontFamily: 'var(--editorial)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            {order.address.name}<br />
            {order.address.street}, {order.address.number}
            {order.address.complement ? ` · ${order.address.complement}` : ''}<br />
            {order.address.neighborhood} · {order.address.city}/{order.address.state}<br />
            CEP {order.address.zip}
          </div>
        </div>
      </div>
    </div>
  );
}
