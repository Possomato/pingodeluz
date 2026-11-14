import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMyOrderAction } from '@/app/actions/orders';
import { formatCentavos } from '@/lib/money';
import PdlImg from '@/components/PdlImg';
import PageWrapper from '@/components/PageWrapper';
import PayInstructions from '@/components/PayInstructions';

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
    <PageWrapper>
      <div className="pdl-page">
        <Link href="/perfil" className="pdl-link">← meus pedidos</Link>

        <div className="pdl-page-head" style={{ marginTop: 14 }}>
          <h1 className="pdl-h1">Pedido <em>{order.orderNumber}</em></h1>
          <div className="pdl-cart-sub">
            {new Date(order.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
            {' · '}
            {STATUS_LABEL[order.status] ?? order.status}
          </div>
        </div>

        {/* Linha do tempo */}
        {!isTerminated && (
          <ol className="pdl-timeline">
            {TIMELINE.map((step, i) => {
              const done = i < currentRank;
              const current = i === currentRank;
              return (
                <li key={step.status} className={done ? 'done' : current ? 'current' : ''}>
                  <i aria-hidden />
                  <span>{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        {/* Pedido ainda não pago: o Pix ou o boleto continuam aqui. */}
        {order.status === 'pendente' && (
          <div style={{ marginBottom: 20 }}>
            <PayInstructions orderId={order.id} totalLabel={formatCentavos(order.totalCentavos)} />
          </div>
        )}

        {order.trackingCode && (
          <div className="pdl-note" style={{ marginBottom: 16, fontStyle: 'normal' }}>
            <div className="pdl-eyebrow">código de rastreio</div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, marginTop: 4, fontSize: 15 }}>{order.trackingCode}</div>
          </div>
        )}

        {/* Itens */}
        <div className="pdl-review">
          {order.items.map((it) => (
            <div key={`${it.id}-${it.size}`} className="pdl-review-item">
              <PdlImg tint={it.tint} imageUrl={it.imageUrl} />
              <div>
                <div className="n">{it.name}</div>
                <div className="m">tam. {it.size} · {it.qty} un.</div>
              </div>
              <div className="p">{formatCentavos(it.lineTotalCentavos)}</div>
            </div>
          ))}

          <div className="pdl-review-totals">
            <div className="pdl-cart-summary-row">
              <span>Subtotal</span><span>{formatCentavos(order.subtotalCentavos)}</span>
            </div>
            <div className="pdl-cart-summary-row">
              <span>Frete</span>
              <span>{order.freightCentavos === 0 ? 'grátis' : formatCentavos(order.freightCentavos)}</span>
            </div>
            {order.discountCentavos > 0 && (
              <div className="pdl-cart-summary-row" style={{ color: 'var(--terra-deep)' }}>
                <span>Desconto{order.couponCode ? ` ${order.couponCode}` : ''}</span>
                <span>− {formatCentavos(order.discountCentavos)}</span>
              </div>
            )}
            <div className="pdl-cart-summary-row total">
              <span>Total</span><span>{formatCentavos(order.totalCentavos)}</span>
            </div>
          </div>
        </div>

        {/* Entrega */}
        <div className="pdl-profile-section" style={{ marginTop: 24, borderBottom: 'none', padding: '24px 0 0' }}>
          <h3><span>Entrega</span></h3>
          <div className="pdl-prose" style={{ fontSize: 14.5, lineHeight: 1.5 }}>
            {order.address.name}<br />
            {order.address.street}, {order.address.number}
            {order.address.complement ? ` · ${order.address.complement}` : ''}<br />
            {order.address.neighborhood} · {order.address.city}/{order.address.state}<br />
            CEP {order.address.zip}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
