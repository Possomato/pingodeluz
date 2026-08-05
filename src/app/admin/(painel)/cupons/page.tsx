'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  listCouponsAction, upsertCouponAction, setCouponActiveAction, deleteCouponAction,
} from '@/app/actions/coupons';
import { formatCentavos, parseCentavosFromInput } from '@/lib/money';

interface Row {
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  minSubtotalCentavos: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
}

const BLANK: {
  code: string;
  kind: 'percent' | 'fixed';
  value: string;
  minSubtotal: string;
  maxUses: string;
  expiresAt: string;
} = {
  code: '', kind: 'percent', value: '10',
  minSubtotal: '', maxUses: '', expiresAt: '',
};

export default function AdminCuponsPage() {
  const [coupons, setCoupons] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCoupons(await listCouponsAction());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await upsertCouponAction({
        code: form.code,
        kind: form.kind,
        // Percentual é um número inteiro; valor fixo vai em centavos.
        value: form.kind === 'percent'
          ? Math.round(parseFloat(form.value) || 0)
          : parseCentavosFromInput(form.value),
        minSubtotalCentavos: parseCentavosFromInput(form.minSubtotal),
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        active: true,
      });
      setForm(BLANK);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o cupom.');
    } finally {
      setBusy(false);
    }
  };

  const describe = (c: Row) =>
    c.kind === 'percent' ? `${c.value}%` : formatCentavos(c.value);

  return (
    <AdminLayout>
      <h1 className="adm-page-title">Cupons</h1>

      <form className="adm-form" onSubmit={submit} style={{ marginBottom: 32 }}>
        <div className="adm-form-row">
          <div className="adm-field">
            <label htmlFor="c-code">Código</label>
            <input
              id="c-code" required value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="BEMVINDO10"
            />
          </div>
          <div className="adm-field">
            <label htmlFor="c-kind">Tipo</label>
            <select
              id="c-kind" value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as 'percent' | 'fixed' })}
            >
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
          </div>
        </div>

        <div className="adm-form-row">
          <div className="adm-field">
            <label htmlFor="c-value">{form.kind === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
            <input id="c-value" required value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div className="adm-field">
            <label htmlFor="c-min">Compra mínima (R$)</label>
            <input id="c-min" value={form.minSubtotal} placeholder="opcional"
              onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
          </div>
        </div>

        <div className="adm-form-row">
          <div className="adm-field">
            <label htmlFor="c-uses">Limite de usos</label>
            <input id="c-uses" type="number" min={1} value={form.maxUses} placeholder="ilimitado"
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
          </div>
          <div className="adm-field">
            <label htmlFor="c-exp">Válido até</label>
            <input id="c-exp" type="date" value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
        </div>

        {error && <div role="alert" style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
            {busy ? 'salvando…' : 'Criar cupom'}
          </button>
        </div>
      </form>

      {loading ? (
        <p style={{ color: '#888' }}>Carregando…</p>
      ) : coupons.length === 0 ? (
        <p style={{ color: '#888' }}>Nenhum cupom criado ainda.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr><th>Código</th><th>Desconto</th><th>Mínimo</th><th>Usos</th><th>Validade</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.code} style={c.active ? undefined : { opacity: 0.55 }}>
                <td style={{ fontWeight: 600 }}>{c.code}</td>
                <td>{describe(c)}</td>
                <td>{c.minSubtotalCentavos ? formatCentavos(c.minSubtotalCentavos) : '—'}</td>
                <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : 'sem prazo'}</td>
                <td>{c.active ? 'ativo' : 'inativo'}</td>
                <td>
                  <div className="adm-actions">
                    <button className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={async () => { await setCouponActiveAction(c.code, !c.active); load(); }}>
                      {c.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm"
                      onClick={async () => {
                        if (confirm(`Excluir o cupom ${c.code}?`)) { await deleteCouponAction(c.code); load(); }
                      }}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
