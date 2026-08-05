'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { formatCentavos } from '@/lib/money';
import { calcInstallments, PaymentConfig } from '@/lib/data';

// Valores de referência só para pré-visualizar a regra de parcelamento.
const PREVIEW_PRICES_CENTAVOS = [8900, 15900, 25000];

export default function PagamentosPage() {
  const { paymentConfig, updatePaymentConfig, loading } = useAdmin();

  if (loading) return <AdminLayout><p style={{ color: '#888' }}>Carregando…</p></AdminLayout>;

  // A `key` remonta o formulário quando a configuração chega do banco,
  // no lugar de um efeito que copiava props para estado.
  return (
    <PagamentosForm
      key={`${paymentConfig.maxParcelas}-${paymentConfig.parcelaMinimaCentavos}-${paymentConfig.juros}`}
      initial={paymentConfig}
      onSave={updatePaymentConfig}
    />
  );
}

function PagamentosForm({
  initial,
  onSave,
}: {
  initial: PaymentConfig;
  onSave: (c: PaymentConfig) => void;
}) {
  const [form, setForm] = useState<PaymentConfig>(initial);
  const [toast, setToast] = useState(false);

  const set = <K extends keyof PaymentConfig>(k: K, v: PaymentConfig[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="adm-list-bar">
        <h1 className="adm-page-title">Configuração de <em>pagamentos</em></h1>
      </div>

      <form className="adm-form" onSubmit={handleSave} style={{ maxWidth: 480 }}>
        <div className="adm-form-row">
          <div className="adm-field">
            <label>Máximo de parcelas</label>
            <input
              type="number" min={1} max={12}
              value={form.maxParcelas}
              onChange={e => set('maxParcelas', parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="adm-field">
            <label htmlFor="parcela-min">Parcela mínima (R$)</label>
            <input
              id="parcela-min"
              type="number" min={0} step={0.01}
              value={form.parcelaMinimaCentavos / 100}
              onChange={e =>
                set('parcelaMinimaCentavos', Math.round((parseFloat(e.target.value) || 0) * 100))
              }
            />
          </div>
        </div>

        <div className="adm-field">
          <label>Juros</label>
          <select
            value={form.juros === 'sem' ? 'sem' : 'com'}
            onChange={e => set('juros', e.target.value === 'sem' ? 'sem' : 0)}
          >
            <option value="sem">Sem juros</option>
            <option value="com">Com juros (% a.m.)</option>
          </select>
          {form.juros !== 'sem' && (
            <input
              type="number" min={0} step={0.1}
              value={typeof form.juros === 'number' ? form.juros : 0}
              onChange={e => set('juros', parseFloat(e.target.value) || 0)}
              placeholder="ex: 1.5"
              style={{ marginTop: 6 }}
            />
          )}
        </div>

        <div className="adm-field">
          <label style={{ marginBottom: 8, display: 'block' }}>Preview</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PREVIEW_PRICES_CENTAVOS.map(price => {
              const result = calcInstallments(price, form);
              return (
                <div key={price} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, minWidth: 64 }}>{formatCentavos(price)}</span>
                  <span style={{ fontSize: 13, color: result ? 'var(--ink)' : 'var(--muted)' }}>
                    {result ?? '— sem parcelamento'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary">Salvar configuração</button>
        </div>
        {toast && <div className="adm-toast">Configuração salva!</div>}
      </form>
    </AdminLayout>
  );
}
