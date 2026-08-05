'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import type { ShippingConfig } from '@/lib/pricing';
import { formatCentavos, centavosToInput, parseCentavosFromInput } from '@/lib/money';

export default function AdminFretePage() {
  const { shippingConfig, updateShippingConfig, loading } = useAdmin();

  if (loading) return <AdminLayout><p style={{ color: '#888' }}>Carregando…</p></AdminLayout>;

  // A `key` remonta o formulário quando a configuração chega do banco,
  // no lugar de um efeito que copiava props para estado.
  return (
    <FreteForm
      key={`${shippingConfig.flatCentavos}-${shippingConfig.freeAboveCentavos}`}
      initial={shippingConfig}
      onSave={updateShippingConfig}
    />
  );
}

function FreteForm({
  initial,
  onSave,
}: {
  initial: ShippingConfig;
  onSave: (c: ShippingConfig) => Promise<void>;
}) {
  const [flat, setFlat] = useState(centavosToInput(initial.flatCentavos));
  const [freeAbove, setFreeAbove] = useState(centavosToInput(initial.freeAboveCentavos));
  const [pixPercent] = useState(initial.pixDiscountPercent);
  const [info, setInfo] = useState(initial.shippingInfo);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      flatCentavos: parseCentavosFromInput(flat),
      freeAboveCentavos: parseCentavosFromInput(freeAbove),
      pixDiscountPercent: pixPercent,
      shippingInfo: info,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AdminLayout>
      <h1 className="adm-page-title">Frete</h1>

      <form className="adm-form" onSubmit={save}>
        <div className="adm-form-row">
          <div className="adm-field">
            <label htmlFor="f-flat">Valor do frete (R$)</label>
            <input id="f-flat" value={flat} onChange={(e) => setFlat(e.target.value)} inputMode="decimal" />
            <span style={{ fontSize: 11, color: '#888' }}>
              cobrado quando a compra não atinge o valor de gratuidade
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="f-free">Frete grátis a partir de (R$)</label>
            <input id="f-free" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        <div className="adm-field">
          <label htmlFor="f-info">Texto de envio e trocas</label>
          <textarea
            id="f-info"
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Envio em até 3 dias úteis. Trocas em até 30 dias."
          />
          <span style={{ fontSize: 11, color: '#888' }}>
            aparece na aba &ldquo;Envio e trocas&rdquo; de todas as páginas de produto
          </span>
        </div>

        <div className="adm-field">
          <label style={{ marginBottom: 8, display: 'block' }}>Pré-visualização</label>
          <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>
              Compra de {formatCentavos(10000)} → frete{' '}
              {parseCentavosFromInput(freeAbove) <= 10000 ? 'grátis' : formatCentavos(parseCentavosFromInput(flat))}
            </span>
            <span>
              Compra de {formatCentavos(30000)} → frete{' '}
              {parseCentavosFromInput(freeAbove) <= 30000 ? 'grátis' : formatCentavos(parseCentavosFromInput(flat))}
            </span>
          </div>
        </div>

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary">Salvar</button>
        </div>

        {saved && <div className="adm-toast">Configuração de frete salva!</div>}
      </form>
    </AdminLayout>
  );
}
