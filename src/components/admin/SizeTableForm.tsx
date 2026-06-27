'use client';

import { useState } from 'react';
import type { SizeTable } from '@/lib/data';

interface Props {
  initial: Partial<SizeTable>;
  onSave: (t: SizeTable) => void;
}

export default function SizeTableForm({ initial, onSave }: Props) {
  const [form, setForm] = useState<SizeTable>({
    id: initial.id ?? '',
    name: initial.name ?? '',
    columns: initial.columns ?? [],
    columnTypes: initial.columnTypes ?? {},
    rows: initial.rows ?? [],
  });
  const [toast, setToast] = useState(false);

  const addColumn = () => setForm(f => ({ ...f, columns: [...f.columns, ''] }));

  const renameColumn = (i: number, val: string) =>
    setForm(f => {
      const oldKey = f.columns[i];
      return {
        ...f,
        columns: f.columns.map((c, j) => j === i ? val : c),
        rows: f.rows.map(r => {
          const v = { ...r.values };
          v[val] = v[oldKey] ?? 0;
          if (val !== oldKey) delete v[oldKey];
          return { ...r, values: v };
        }),
      };
    });

  const setColumnType = (col: string, type: 'crianca' | 'vestido') =>
    setForm(f => ({ ...f, columnTypes: { ...f.columnTypes, [col]: type } }));

  const removeColumn = (i: number) =>
    setForm(f => ({
      ...f,
      columns: f.columns.filter((_, j) => j !== i),
      rows: f.rows.map(r => {
        const v = { ...r.values };
        delete v[f.columns[i]];
        return { ...r, values: v };
      }),
    }));

  const addRow = () =>
    setForm(f => ({
      ...f,
      rows: [...f.rows, { size: '', values: Object.fromEntries(f.columns.map(c => [c, 0])) }],
    }));

  const removeRow = (i: number) =>
    setForm(f => ({ ...f, rows: f.rows.filter((_, j) => j !== i) }));

  const setRowSize = (i: number, size: string) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, j) => j === i ? { ...r, size } : r) }));

  const setCellValue = (rowIdx: number, col: string, val: number) =>
    setForm(f => ({
      ...f,
      rows: f.rows.map((r, i) => i === rowIdx ? { ...r, values: { ...r.values, [col]: val } } : r),
    }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <form className="adm-form" onSubmit={handleSave}>
      <div className="adm-field">
        <label>Nome da tabela</label>
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Vestido meninas" />
      </div>

      <div className="adm-field">
        <label>Colunas (medidas)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {form.columns.map((col, i) => {
            const colType = form.columnTypes[col] ?? 'crianca';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    value={col}
                    onChange={e => renameColumn(i, e.target.value)}
                    placeholder="ex: tórax"
                    style={{ width: 120 }}
                  />
                  <button type="button" onClick={() => removeColumn(i)} style={{ color: 'var(--terra)', fontWeight: 700, padding: '0 4px' }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['crianca', 'vestido'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setColumnType(col, opt)}
                      style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 999,
                        border: '1px solid',
                        borderColor: colType === opt ? '#2e7d5e' : '#e0d9ce',
                        background: colType === opt ? '#2e7d5e' : 'transparent',
                        color: colType === opt ? '#fff' : '#888',
                        cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      {opt === 'crianca' ? 'Criança' : 'Vestido'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <button type="button" className="adm-btn adm-btn-secondary" onClick={addColumn}>+ coluna</button>
        </div>
      </div>

      <div className="adm-field">
        <label>Tamanhos e medidas</label>
        {form.columns.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Adicione colunas primeiro.</p>}
        {form.columns.length > 0 && (
          <div className="adm-sizetable-wrap">
            <table className="adm-sizetable">
              <thead>
                <tr>
                  <th>Tamanho</th>
                  {form.columns.map(c => <th key={c}>{c}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.rows.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input value={row.size} onChange={e => setRowSize(i, e.target.value)} placeholder="ex: 1m" style={{ width: 60 }} />
                    </td>
                    {form.columns.map(col => (
                      <td key={col}>
                        <input
                          type="number" min={0}
                          value={row.values[col] ?? ''}
                          onChange={e => setCellValue(i, col, parseFloat(e.target.value) || 0)}
                          style={{ width: 60, textAlign: 'center' }}
                        />
                      </td>
                    ))}
                    <td>
                      <button type="button" onClick={() => removeRow(i)} style={{ color: 'var(--terra)' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="adm-btn adm-btn-secondary" style={{ marginTop: 8 }} onClick={addRow}>+ tamanho</button>
          </div>
        )}
      </div>

      <div className="adm-form-actions">
        <button type="submit" className="adm-btn adm-btn-primary">Salvar tabela</button>
      </div>
      {toast && <div className="adm-toast">Tabela salva!</div>}
    </form>
  );
}
