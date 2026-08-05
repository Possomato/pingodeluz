import AdminLayout from '@/components/admin/AdminLayout';
import { listCustomersAdminAction } from '@/app/actions/orders';
import { formatCentavos } from '@/lib/money';

export default async function AdminClientesPage() {
  const customers = await listCustomersAdminAction();

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Clientes</h1>
        <span style={{ color: '#888', fontSize: 13 }}>{customers.length} cadastrados</span>
      </div>

      {customers.length === 0 ? (
        <p style={{ color: '#888' }}>Nenhum cliente cadastrado ainda.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Pedidos</th><th>Total gasto</th><th>Último pedido</th><th>Papel</th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name || '—'}</td>
                <td style={{ color: '#888' }}>{c.email}</td>
                <td>{c.orderCount}</td>
                <td>{formatCentavos(c.spentCentavos)}</td>
                <td>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('pt-BR') : '—'}</td>
                <td>{c.isAdmin ? 'administrador' : 'cliente'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
