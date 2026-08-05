'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { listOrdersAdminAction, type Order } from '@/app/actions/orders';
import { formatCentavos } from '@/lib/money';

const STATUSES = ['todos', 'pendente', 'pago', 'enviado', 'entregue', 'cancelado', 'recusado', 'reembolsado'];

const STATUS_LABEL: Record<string, string> = {
  pendente: 'aguardando pagamento',
  pago: 'pago · separar',
  enviado: 'em trânsito',
  entregue: 'entregue',
  cancelado: 'cancelado',
  recusado: 'recusado',
  reembolsado: 'reembolsado',
};

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  const load = useCallback(async () => {
    try {
      const result = await listOrdersAdminAction({ status, search, page, perPage });
      setOrders(result.orders);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Pedidos</h1>
        <span style={{ color: '#888', fontSize: 13 }}>{total} no total</span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div className="adm-field" style={{ minWidth: 200 }}>
          <label htmlFor="status">Situação</label>
          <select id="status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'todos' ? 'Todos' : STATUS_LABEL[s] ?? s}</option>
            ))}
          </select>
        </div>
        <div className="adm-field" style={{ minWidth: 200 }}>
          <label htmlFor="busca">Número do pedido</label>
          <input
            id="busca"
            value={search}
            placeholder="PDL-10001"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Carregando…</p>
      ) : orders.length === 0 ? (
        <p style={{ color: '#888' }}>Nenhum pedido encontrado.</p>
      ) : (
        <>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Número</th><th>Data</th><th>Cliente</th>
                <th>Itens</th><th>Total</th><th>Situação</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={o.needsAttention ? { background: 'rgba(192,57,43,0.06)' } : undefined}>
                  <td style={{ fontWeight: 600 }}>
                    {o.orderNumber}
                    {o.needsAttention && (
                      <span title={o.attentionReason ?? ''} style={{ color: '#c0392b', marginLeft: 6 }}>⚠</span>
                    )}
                  </td>
                  <td>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>{o.address?.name ?? '—'}</td>
                  <td>{o.items.reduce((n, i) => n + i.qty, 0)}</td>
                  <td>{formatCentavos(o.totalCentavos)}</td>
                  <td>{STATUS_LABEL[o.status] ?? o.status}</td>
                  <td>
                    <Link href={`/admin/pedidos/${o.id}`} className="adm-btn adm-btn-secondary adm-btn-sm">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pages > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
              <button className="adm-btn adm-btn-secondary adm-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← anterior
              </button>
              <span style={{ fontSize: 13, color: '#888' }}>página {page} de {pages}</span>
              <button className="adm-btn adm-btn-secondary adm-btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                próxima →
              </button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
