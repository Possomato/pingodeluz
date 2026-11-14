import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { getDashboardStatsAction } from '@/app/actions/orders';
import { formatCentavos } from '@/lib/money';

/**
 * Início do painel: primeiro o que precisa de uma ação hoje, depois os
 * números do mês. Quem abre o painel quer saber "o que eu faço agora?".
 */
export default async function DashboardPage() {
  const stats = await getDashboardStatsAction();

  const soldOut = stats.lowStock.filter((p) => p.total === 0);
  const running = stats.lowStock.filter((p) => p.total > 0);

  const todo: { title: string; detail: string; href: string; action: string; alert?: boolean }[] = [];
  if (stats.needsAttention > 0) {
    todo.push({
      title: `${stats.needsAttention} ${stats.needsAttention === 1 ? 'pedido precisa' : 'pedidos precisam'} de conferência`,
      detail: 'O valor pago ou o estoque não bateu. Confira antes de enviar.',
      href: '/admin/pedidos', action: 'Conferir', alert: true,
    });
  }
  if (stats.pendingShipment > 0) {
    todo.push({
      title: `${stats.pendingShipment} ${stats.pendingShipment === 1 ? 'pedido pago para enviar' : 'pedidos pagos para enviar'}`,
      detail: 'Separe as peças, poste e informe o código de rastreio.',
      href: '/admin/pedidos?status=pago', action: 'Ver pedidos',
    });
  }
  if (soldOut.length > 0) {
    todo.push({
      title: `${soldOut.length} ${soldOut.length === 1 ? 'peça esgotada' : 'peças esgotadas'} na loja`,
      detail: soldOut.slice(0, 4).map((p) => p.name).join(', ') + (soldOut.length > 4 ? '…' : ''),
      href: '/admin/estoque', action: 'Repor estoque',
    });
  }
  if (running.length > 0) {
    todo.push({
      title: `${running.length} ${running.length === 1 ? 'peça acabando' : 'peças acabando'}`,
      detail: running.slice(0, 4).map((p) => `${p.name} (${p.total})`).join(', ') + (running.length > 4 ? '…' : ''),
      href: '/admin/estoque', action: 'Ver estoque',
    });
  }

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <div>
          <h1 className="adm-page-title">Olá! <em>O que vamos fazer hoje?</em></h1>
        </div>
        <Link href="/admin/produtos/novo" className="adm-btn adm-btn-primary adm-btn-lg">+ Nova peça</Link>
      </div>

      <h2 className="adm-h2" style={{ marginTop: 8 }}>Para fazer agora</h2>
      {todo.length === 0 ? (
        <div className="adm-empty"><strong>Tudo em dia</strong>Nenhum pedido esperando e nenhuma peça esgotada.</div>
      ) : (
        <div className="adm-todo">
          {todo.map((t) => (
            <div key={t.title} className="adm-todo-item" style={t.alert ? { borderColor: 'var(--terra)', background: 'var(--terra-soft)' } : undefined}>
              <div>
                <div className="t">{t.title}</div>
                <div className="d">{t.detail}</div>
              </div>
              <Link href={t.href} className="adm-btn adm-btn-secondary">{t.action}</Link>
            </div>
          ))}
        </div>
      )}

      <h2 className="adm-h2">Este mês</h2>
      <div className="adm-stats">
        <div className="adm-stat">
          <div className="l">Vendas pagas</div>
          <div className="v">{formatCentavos(stats.revenueCentavos)}</div>
        </div>
        <div className="adm-stat">
          <div className="l">Pedidos pagos</div>
          <div className="v">{stats.ordersThisMonth}</div>
        </div>
      </div>

      <h2 className="adm-h2">Atalhos</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/admin/produtos" className="adm-btn adm-btn-secondary">Ver todas as peças</Link>
        <Link href="/admin/estoque" className="adm-btn adm-btn-secondary">Ajustar estoque</Link>
        <Link href="/admin/pedidos" className="adm-btn adm-btn-secondary">Todos os pedidos</Link>
        <Link href="/admin/cupons" className="adm-btn adm-btn-secondary">Criar cupom</Link>
      </div>
    </AdminLayout>
  );
}
