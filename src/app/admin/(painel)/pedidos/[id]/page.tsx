'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  getOrderAdminAction,
  updateOrderStatusAction,
  clearOrderAttentionAction,
  type Order,
} from '@/app/actions/orders';
import { formatCentavos } from '@/lib/money';

/** Ações manuais possíveis a partir de cada situação. */
const NEXT_ACTIONS: Record<string, { status: string; label: string; danger?: boolean }[]> = {
  pendente: [{ status: 'cancelado', label: 'Cancelar pedido', danger: true }],
  pago: [
    { status: 'enviado', label: 'Marcar como enviado' },
    { status: 'cancelado', label: 'Cancelar e repor estoque', danger: true },
  ],
  enviado: [
    { status: 'entregue', label: 'Marcar como entregue' },
    { status: 'cancelado', label: 'Cancelar e repor estoque', danger: true },
  ],
  entregue: [], cancelado: [], recusado: [], reembolsado: [],
};

export default function AdminPedidoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const o = await getOrderAdminAction(id);
    setOrder(o);
    setTracking(o?.trackingCode ?? '');
    setLoading(false);
  };

  // `load` é recriada a cada render; depender só do id é o que se quer.
  // O estado é gravado depois do await, dentro de load.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [id]);

  const transition = async (nextStatus: string, label: string) => {
    if (!confirm(`${label}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await updateOrderStatusAction(id, nextStatus, { trackingCode: tracking || undefined });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AdminLayout><p style={{ color: '#888' }}>Carregando…</p></AdminLayout>;
  if (!order) return <AdminLayout><p style={{ color: '#888' }}>Pedido não encontrado.</p></AdminLayout>;

  const actions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Pedido <em>{order.orderNumber}</em></h1>
        <button className="adm-btn adm-btn-secondary" onClick={() => router.push('/admin/pedidos')}>
          ← Voltar
        </button>
      </div>

      {order.needsAttention && (
        <div role="alert" style={{ border: '1px solid #c0392b', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
          <strong>Requer atenção.</strong> {order.attentionReason}
          <button
            className="adm-btn adm-btn-secondary adm-btn-sm"
            style={{ marginLeft: 12 }}
            onClick={async () => { await clearOrderAttentionAction(id); load(); }}
          >
            Marcar como resolvido
          </button>
        </div>
      )}

      {error && <div role="alert" style={{ color: '#c0392b', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        <section>
          <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>Itens</h2>
          <table className="adm-table">
            <thead><tr><th>Peça</th><th>Tam.</th><th>Qtd</th><th>Total</th></tr></thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={`${i.id}-${i.size}`}>
                  <td>{i.name}</td><td>{i.size}</td><td>{i.qty}</td>
                  <td>{formatCentavos(i.lineTotalCentavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: 'grid', gap: 4, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span><span>{formatCentavos(order.subtotalCentavos)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Frete</span><span>{formatCentavos(order.freightCentavos)}</span>
            </div>
            {order.discountCentavos > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Desconto {order.couponCode}</span><span>− {formatCentavos(order.discountCentavos)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px solid var(--border, #e5e0d8)', paddingTop: 4 }}>
              <span>Total</span><span>{formatCentavos(order.totalCentavos)}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>Entrega</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            {order.address.name}<br />{order.address.email}<br />
            {order.address.street}, {order.address.number}
            {order.address.complement ? ` · ${order.address.complement}` : ''}<br />
            {order.address.neighborhood} · {order.address.city}/{order.address.state}<br />
            CEP {order.address.zip}
          </p>

          <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', marginTop: 20 }}>
            Pagamento
          </h2>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            Situação: <strong>{order.status}</strong><br />
            Método: {order.paymentMethod ?? '—'}<br />
            Provedor: {order.paymentProvider ?? '—'}<br />
            Identificador: {order.paymentExternalId ?? '—'}
          </p>

          <div className="adm-field" style={{ marginTop: 20 }}>
            <label htmlFor="rastreio">Código de rastreio</label>
            <input
              id="rastreio"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="informe antes de marcar como enviado"
            />
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {actions.length === 0 ? (
              <p style={{ color: '#888', fontSize: 13 }}>Este pedido chegou ao fim do fluxo.</p>
            ) : actions.map((a) => (
              <button
                key={a.status}
                className={`adm-btn ${a.danger ? 'adm-btn-danger' : 'adm-btn-primary'}`}
                disabled={busy}
                onClick={() => transition(a.status, a.label)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
