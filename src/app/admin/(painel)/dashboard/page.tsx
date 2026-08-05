import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { getDashboardStatsAction } from '@/app/actions/orders';
import { formatCentavos } from '@/lib/money';

export default async function DashboardPage() {
  const stats = await getDashboardStatsAction();

  const cards = [
    { label: 'Receita do mês', value: formatCentavos(stats.revenueCentavos) },
    { label: 'Pedidos pagos no mês', value: String(stats.ordersThisMonth) },
    { label: 'Aguardando envio', value: String(stats.pendingShipment), href: '/admin/pedidos?status=pago' },
    { label: 'Precisam de atenção', value: String(stats.needsAttention), href: '/admin/pedidos', alert: stats.needsAttention > 0 },
  ];

  return (
    <AdminLayout>
      <h1 className="adm-page-title">Início</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
        {cards.map((c) => {
          const body = (
            <div
              style={{
                border: `1px solid ${c.alert ? '#c0392b' : 'var(--border, #e5e0d8)'}`,
                borderRadius: 4,
                padding: '16px 18px',
                height: '100%',
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888' }}>
                {c.label}
              </div>
              <div style={{ fontFamily: 'var(--serif, serif)', fontSize: 26, marginTop: 6 }}>{c.value}</div>
            </div>
          );
          return c.href
            ? <Link key={c.label} href={c.href} style={{ textDecoration: 'none', color: 'inherit' }}>{body}</Link>
            : <div key={c.label}>{body}</div>;
        })}
      </div>

      <h2 className="adm-page-title" style={{ fontSize: 18, marginTop: 32 }}>Estoque baixo</h2>
      {stats.lowStock.length === 0 ? (
        <p style={{ color: '#888' }}>Nenhuma peça com estoque crítico.</p>
      ) : (
        <table className="adm-table">
          <thead><tr><th>Produto</th><th>Unidades</th><th></th></tr></thead>
          <tbody>
            {stats.lowStock.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td style={{ color: p.total === 0 ? '#c0392b' : undefined }}>
                  {p.total === 0 ? 'esgotado' : p.total}
                </td>
                <td>
                  <Link href={`/admin/produtos/${p.id}`} className="adm-btn adm-btn-secondary adm-btn-sm">
                    Repor
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
