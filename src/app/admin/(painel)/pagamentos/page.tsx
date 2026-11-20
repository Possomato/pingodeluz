'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { formatCentavos } from '@/lib/money';
import {
  calcInstallments,
  maxInstallmentsFor,
  SMALL_ORDER_LIMIT_CENTAVOS,
  SMALL_ORDER_MAX_PARCELAS,
  type PaymentConfig,
} from '@/lib/data';

// Valores só para mostrar como a regra fica na loja.
const PREVIEW_PRICES_CENTAVOS = [12000, 27000, 30000, 54000];

export default function PagamentosPage() {
  const { paymentConfig, updatePaymentConfig, loading } = useAdmin();

  if (loading) return <AdminLayout><p className="adm-muted">Carregando…</p></AdminLayout>;

  // A `key` remonta o formulário quando a configuração chega do banco.
  return (
    <PagamentosForm
      key={`${paymentConfig.maxParcelas}-${paymentConfig.parcelaMinimaCentavos}-${paymentConfig.juros}`}
      initial={paymentConfig}
      onSave={updatePaymentConfig}
    />
  );
}

function PagamentosForm({ initial, onSave }: { initial: PaymentConfig; onSave: (c: PaymentConfig) => Promise<void> }) {
  const [form, setForm] = useState<PaymentConfig>(initial);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof PaymentConfig>(k: K, v: PaymentConfig[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
    setSaved(true);
  };

  const semJuros = form.juros === 'sem';

  return (
    <AdminLayout>
      <h1 className="adm-page-title">Parcelamento</h1>
      <p className="adm-page-sub">
        Em quantas vezes a cliente pode parcelar no cartão. Compras abaixo
        de {formatCentavos(SMALL_ORDER_LIMIT_CENTAVOS)} parcelam em até {SMALL_ORDER_MAX_PARCELAS}x;
        a partir disso, até o máximo abaixo.
      </p>

      <form className="adm-stack" onSubmit={handleSave} style={{ maxWidth: 620 }}>
        <section className="adm-section">
          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="max-parcelas">Máximo de parcelas</label>
              <input id="max-parcelas" type="number" min={1} max={12} value={form.maxParcelas}
                onChange={e => set('maxParcelas', Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))} />
              <span className="adm-hint">Vale para compras a partir de {formatCentavos(SMALL_ORDER_LIMIT_CENTAVOS)}.</span>
            </div>
            <div className="adm-field">
              <label htmlFor="parcela-min">Parcela mínima</label>
              <div className="adm-price">
                <span>R$</span>
                <input id="parcela-min" type="number" min={0} step={1} value={form.parcelaMinimaCentavos / 100}
                  onChange={e => set('parcelaMinimaCentavos', Math.round((parseFloat(e.target.value) || 0) * 100))} />
              </div>
              <span className="adm-hint">Nenhuma parcela fica abaixo deste valor.</span>
            </div>
          </div>

          <div className="adm-field">
            <span className="adm-label">Quem paga os juros das parcelas</span>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 400 }}>
              <input type="radio" name="juros" checked={!semJuros} onChange={() => set('juros', 0)} style={{ marginTop: 4 }} />
              <span><strong>A cliente</strong> — nas taxas do Mercado Pago. A loja anuncia &ldquo;em até Nx no cartão&rdquo;.</span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 400 }}>
              <input type="radio" name="juros" checked={semJuros} onChange={() => set('juros', 'sem')} style={{ marginTop: 4 }} />
              <span><strong>A loja</strong> — a loja anuncia &ldquo;sem juros&rdquo;.</span>
            </label>
            <span className="adm-hint">
              Precisa ser igual ao que está configurado na sua conta do Mercado Pago, em Custos → Cartão de crédito → Parcelado.
              Senão a loja anuncia uma coisa e a cliente paga outra.
            </span>
          </div>
        </section>

        <section className="adm-section">
          <div className="adm-section-head"><div><h2>Como fica na loja</h2></div></div>
          <table className="adm-table">
            <thead><tr><th>Peça de</th><th>Parcelas</th><th>Texto na vitrine</th></tr></thead>
            <tbody>
              {PREVIEW_PRICES_CENTAVOS.map(price => (
                <tr key={price}>
                  <td>{formatCentavos(price)}</td>
                  <td>até {maxInstallmentsFor(price, form)}x</td>
                  <td className="adm-muted">{calcInstallments(price, form) ?? 'só à vista'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="adm-form-actions" style={{ alignItems: 'center' }}>
          <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg">Salvar</button>
          {saved && <span className="adm-pill ok" role="status">✓ salvo</span>}
        </div>
      </form>
    </AdminLayout>
  );
}
