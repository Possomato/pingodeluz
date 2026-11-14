'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { calcInstallments, type Product } from '@/lib/data';
import ImageCropUploader from '@/components/admin/ImageCropUploader';
import Stepper from '@/components/admin/Stepper';
import { centavosToInput, parseCentavosFromInput, formatCentavos } from '@/lib/money';

/**
 * Cadastro de peça em quatro passos, na ordem em que a pessoa pensa:
 * as fotos, o que é e quanto custa, em que tamanhos e quantas há de
 * cada, e se já pode aparecer na loja. O que é opcional fica recolhido.
 */

const TINTS = ['rose', 'ochre', 'sage', 'clay', 'moss', 'ink'];
const TIPOS = ['vestido', 'conjunto', 'macacão', 'saia', 'blusa', 'camisa', 'bermuda', 'calça', 'suéter', 'camiseta', 'camisola', 'body', 'outro'];
const TINT_COLORS: Record<string, string> = {
  rose: '#e8c5b0', ochre: '#c9a96e', sage: '#9eb89e',
  clay: '#c17c5a', moss: '#7a8c6a', ink: '#3a3530',
};

const ERROR_FIELD_ORDER = ['imageUrls', 'name', 'price', 'sizeTableId', 'sizes'] as const;

export default function ProductForm({ initial, onSave, isNew = false }: {
  initial: Partial<Product>;
  /** Grava e diz se deu certo. A tela só sai daqui quando deu. */
  onSave: (p: Partial<Product>) => Promise<boolean>;
  isNew?: boolean;
}) {
  const router = useRouter();
  const { sizeTables, collections, paymentConfig } = useAdmin();

  const resolvedUrls = initial.imageUrls?.length
    ? initial.imageUrls
    : initial.imageUrl ? [initial.imageUrl] : [];

  const [form, setForm] = useState<Partial<Product>>({
    name: '', col: '', gender: 'meninas', type: 'vestido', priceCentavos: 0,
    desc: '', tint: 'rose', active: true, stock: {}, sizes: [],
    ...initial,
    imageUrls: resolvedUrls,
  });
  const [priceInput, setPriceInput] = useState(
    initial.priceCentavos ? centavosToInput(initial.priceCentavos) : ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bulk, setBulk] = useState(1);
  const topRef = useRef<HTMLFormElement>(null);

  const set = (key: keyof Product, val: unknown) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
    setSaved(false);
  };

  const table = sizeTables.find(t => t.id === form.sizeTableId);

  // Com uma tabela só, não há o que escolher: uma peça nova já começa
  // com ela e com todos os tamanhos à venda.
  useEffect(() => {
    if (!isNew || form.sizeTableId || sizeTables.length !== 1) return;
    const only = sizeTables[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(f => ({ ...f, sizeTableId: only.id, sizes: only.rows.map(r => r.size) }));
  }, [isNew, form.sizeTableId, sizeTables]);

  const priceCentavos = parseCentavosFromInput(priceInput);
  const installments = priceCentavos > 0 ? calcInstallments(priceCentavos, paymentConfig) : null;
  const sizes = form.sizes ?? [];
  const totalStock = sizes.reduce((n, s) => n + (form.stock?.[s] ?? 0), 0);
  const photos = form.imageUrls ?? [];

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!photos.length) e.imageUrls = 'Adicione ao menos uma foto.';
    if (!form.name?.trim()) e.name = 'Dê um nome para a peça.';
    if (priceCentavos <= 0) e.price = 'Informe o preço.';
    if (!form.sizeTableId) e.sizeTableId = 'Escolha a tabela de medidas.';
    else if (!sizes.length) e.sizes = 'Marque ao menos um tamanho.';
    return e;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = ERROR_FIELD_ORDER.find(k => found[k]);
      document.getElementById(`sec-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const name = form.name!.trim();
    const [first, ...rest] = name.split(/\s+/);
    // A coleção é gravada pelo id (o vínculo de verdade) e pelo nome
    // (o texto exibido na loja).
    const collection = Object.values(collections).find(c => c.name.join(' ') === form.col);
    // Estoque só dos tamanhos à venda: desmarcar um tamanho não deixa
    // unidades fantasma contando no total.
    const stock = Object.fromEntries(sizes.map(s => [s, form.stock?.[s] ?? 0]));

    setSaving(true);
    const ok = await onSave({
      ...form,
      name,
      priceCentavos,
      nameParts: [first ?? '', rest.join(' ')],
      label: `foto · ${name.toLowerCase()}`,
      collectionId: collection?.id,
      stock,
    });
    setSaving(false);

    if (ok) {
      setSaved(true);
      setTimeout(() => router.push('/admin/produtos'), 700);
    }
  };

  const movePhotoFirst = (i: number) => set('imageUrls', [photos[i], ...photos.filter((_, j) => j !== i)]);

  const errorCount = Object.keys(errors).length;
  const done = {
    fotos: photos.length > 0,
    sobre: !!form.name?.trim() && priceCentavos > 0,
    tamanhos: !!form.sizeTableId && sizes.length > 0,
  };

  return (
    <form ref={topRef} onSubmit={handleSave} noValidate className="adm-stack">
      {/* ─── 1. Fotos ─────────────────────────────────────── */}
      <section className="adm-section" id="sec-imageUrls">
        <div className="adm-section-head">
          <span className={`adm-section-num${done.fotos ? ' done' : ''}`}>{done.fotos ? '✓' : '1'}</span>
          <div>
            <h2>Fotos</h2>
            <p>A primeira é a capa, a que aparece na vitrine. Você recorta cada foto ao enviar.</p>
          </div>
        </div>
        <div className="adm-photos">
          {photos.map((url, i) => (
            <div key={url} className={`adm-photo${i === 0 ? ' cover' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} />
              {i === 0 && <span className="tag">capa</span>}
              <div className="row">
                {i > 0
                  ? <button type="button" onClick={() => movePhotoFirst(i)}>usar de capa</button>
                  : <span />}
                <button type="button" className="rm" onClick={() => set('imageUrls', photos.filter((_, j) => j !== i))}>remover</button>
              </div>
            </div>
          ))}
          <ImageCropUploader
            aspect={3 / 4}
            addTile
            onUpload={url => set('imageUrls', [...photos, url])}
            label="foto"
          />
        </div>
        {errors.imageUrls && <span className="adm-field-error">{errors.imageUrls}</span>}
      </section>

      {/* ─── 2. Sobre a peça ──────────────────────────────── */}
      <section className="adm-section" id="sec-name">
        <div className="adm-section-head">
          <span className={`adm-section-num${done.sobre ? ' done' : ''}`}>{done.sobre ? '✓' : '2'}</span>
          <div>
            <h2>Sobre a peça</h2>
            <p>O nome e o preço são o que a cliente vê primeiro.</p>
          </div>
        </div>

        <div className="adm-form-row">
          <div className={`adm-field ${errors.name ? 'adm-field--error' : ''}`}>
            <label htmlFor="pf-name">Nome</label>
            <input id="pf-name" value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Ex.: Caminho das Rosas" />
            {errors.name && <span className="adm-field-error">{errors.name}</span>}
          </div>
          <div className={`adm-field ${errors.price ? 'adm-field--error' : ''}`} id="sec-price">
            <label htmlFor="pf-price">Preço</label>
            <div className="adm-price">
              <span>R$</span>
              <input
                id="pf-price"
                value={priceInput}
                inputMode="decimal"
                onChange={e => {
                  setPriceInput(e.target.value);
                  setErrors(er => { const n = { ...er }; delete n.price; return n; });
                  setSaved(false);
                }}
                placeholder="270,00"
              />
            </div>
            {errors.price
              ? <span className="adm-field-error">{errors.price}</span>
              : priceCentavos > 0 && (
                <span className="adm-hint">
                  Na loja: {formatCentavos(priceCentavos)}{installments ? ` ou ${installments}` : ''}
                </span>
              )}
          </div>
        </div>

        <div className="adm-form-row">
          <div className="adm-field">
            <label htmlFor="pf-col">Coleção</label>
            <select id="pf-col" value={form.col ?? ''} onChange={e => set('col', e.target.value)}>
              <option value="">Sem coleção</option>
              {Object.values(collections).map(col => {
                const label = col.name.join(' ');
                return <option key={col.id} value={label}>{label}</option>;
              })}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="pf-type">Tipo de peça</label>
            <select id="pf-type" value={form.type ?? 'vestido'} onChange={e => set('type', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="adm-field">
          <label htmlFor="pf-desc">Descrição</label>
          <textarea
            id="pf-desc"
            value={form.desc ?? ''}
            onChange={e => set('desc', e.target.value)}
            placeholder="Conte o que torna esta peça especial: o tecido, o bordado, a ocasião."
          />
          <span className="adm-hint">A primeira frase aparece em destaque quando a peça abre a página inicial.</span>
        </div>
      </section>

      {/* ─── 3. Tamanhos e estoque ────────────────────────── */}
      <section className="adm-section" id="sec-sizeTableId">
        <div className="adm-section-head">
          <span className={`adm-section-num${done.tamanhos ? ' done' : ''}`}>{done.tamanhos ? '✓' : '3'}</span>
          <div>
            <h2>Tamanhos e estoque</h2>
            <p>Marque os tamanhos que você vende e quantas unidades tem de cada.</p>
          </div>
        </div>

        {sizeTables.length === 0 ? (
          <div className="adm-hint">
            Antes de cadastrar tamanhos é preciso ter uma tabela de medidas.{' '}
            <Link href="/admin/tabelas/novo" style={{ color: 'var(--terra-deep)', textDecoration: 'underline' }}>Criar tabela</Link>
          </div>
        ) : (
          <div className={`adm-field ${errors.sizeTableId ? 'adm-field--error' : ''}`} style={{ maxWidth: 380 }}>
            <label htmlFor="pf-table">Tabela de medidas</label>
            <select
              id="pf-table"
              value={form.sizeTableId ?? ''}
              onChange={e => {
                const tableId = e.target.value || undefined;
                const next = tableId ? sizeTables.find(t => t.id === tableId) : undefined;
                setForm(f => ({ ...f, sizeTableId: tableId, sizes: next?.rows.map(r => r.size) ?? [] }));
                setErrors(er => { const n = { ...er }; delete n.sizeTableId; delete n.sizes; return n; });
                setSaved(false);
              }}
            >
              <option value="">Escolha uma tabela</option>
              {sizeTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.sizeTableId && <span className="adm-field-error">{errors.sizeTableId}</span>}
          </div>
        )}

        {table && (
          <div id="sec-sizes" className="adm-stack" style={{ gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="adm-hint">
                {sizes.length} {sizes.length === 1 ? 'tamanho' : 'tamanhos'} à venda · <strong style={{ color: totalStock === 0 ? '#a8402f' : 'var(--ink)' }}>{totalStock} {totalStock === 1 ? 'unidade' : 'unidades'}</strong> no total
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="adm-hint">Colocar</span>
                <Stepper value={bulk} onChange={setBulk} label="Quantidade para todos os tamanhos" />
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary adm-btn-sm"
                  onClick={() => set('stock', { ...(form.stock ?? {}), ...Object.fromEntries(sizes.map(s => [s, bulk])) })}
                  disabled={!sizes.length}
                >
                  em todos
                </button>
              </span>
            </div>

            <div className="adm-size-grid">
              {table.rows.map(row => {
                const on = sizes.includes(row.size);
                return (
                  <div key={row.size} className={`adm-size-cell${on ? '' : ' off'}`}>
                    <label className="size">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          // Mantém a ordem da tabela de medidas.
                          const next = table.rows.map(r => r.size).filter(s => (s === row.size ? !on : sizes.includes(s)));
                          set('sizes', next);
                        }}
                      />
                      {row.size}
                    </label>
                    <Stepper
                      value={form.stock?.[row.size] ?? 0}
                      onChange={n => set('stock', { ...(form.stock ?? {}), [row.size]: n })}
                      label={`Estoque do tamanho ${row.size}`}
                      disabled={!on}
                    />
                    <span className="state">{!on ? 'não vendido' : (form.stock?.[row.size] ?? 0) === 0 ? 'aparece esgotado' : ''}</span>
                  </div>
                );
              })}
            </div>
            {errors.sizes && <span className="adm-field-error">{errors.sizes}</span>}
            <span className="adm-hint">
              O estoque baixa sozinho quando um pagamento é aprovado. Tamanho com zero aparece riscado na loja.
            </span>
          </div>
        )}
      </section>

      {/* ─── 4. Publicação ────────────────────────────────── */}
      <section className="adm-section">
        <div className="adm-section-head">
          <span className="adm-section-num">4</span>
          <div>
            <h2>Aparecer na loja</h2>
            <p>Deixe desligado enquanto a peça não estiver pronta para vender.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.active !== false}
          className="adm-switch"
          onClick={() => set('active', form.active === false)}
        >
          <span className="adm-switch-track" />
          <span>
            <strong>{form.active !== false ? 'Publicada' : 'Rascunho'}</strong>
            <small>{form.active !== false ? 'As clientes já conseguem ver e comprar.' : 'Só você vê, aqui no painel.'}</small>
          </span>
        </button>
      </section>

      {/* ─── Opcional ─────────────────────────────────────── */}
      <details className="adm-section">
        <summary>
          <div className="adm-section-head">
            <span className="adm-section-num">+</span>
            <div>
              <h2>Mais detalhes</h2>
              <p>Opcional: composição, cuidados e quem fez. Campo vazio não aparece na loja.</p>
            </div>
          </div>
        </summary>
        <div className="adm-stack">
          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="pf-comp">Composição</label>
              <textarea id="pf-comp" value={form.composition ?? ''} onChange={e => set('composition', e.target.value)} placeholder="Ex.: Tricoline 100% algodão." />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-care">Cuidados</label>
              <textarea id="pf-care" value={form.careInfo ?? ''} onChange={e => set('careInfo', e.target.value)} placeholder="Ex.: Lavar à mão com água fria." />
            </div>
          </div>
          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="pf-made">Feito à mão por</label>
              <input id="pf-made" value={form.madeBy ?? ''} onChange={e => set('madeBy', e.target.value)} placeholder="Ateliê ou costureira" />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-gender">Para quem</label>
              <select id="pf-gender" value={form.gender ?? 'meninas'} onChange={e => set('gender', e.target.value as Product['gender'])}>
                <option value="meninas">Meninas</option>
                <option value="meninos">Meninos</option>
                <option value="unissex">Unissex</option>
              </select>
            </div>
          </div>
          <div className="adm-field">
            <span className="adm-label">Cor de fundo</span>
            <span className="adm-hint">Aparece atrás da foto enquanto ela carrega.</span>
            <div className="adm-tint-chips">
              {TINTS.map(t => (
                <button
                  key={t}
                  type="button"
                  aria-label={`Cor ${t}`}
                  aria-pressed={form.tint === t}
                  className={`adm-tint-chip ${form.tint === t ? 'selected' : ''}`}
                  style={{ background: TINT_COLORS[t] }}
                  onClick={() => set('tint', t)}
                />
              ))}
            </div>
          </div>
        </div>
      </details>

      <div className="adm-savebar">
        <span className={`msg${errorCount ? ' error' : saved ? ' ok' : ''}`} role="status" aria-live="polite">
          {errorCount
            ? `Falta${errorCount > 1 ? 'm' : ''} ${errorCount} ${errorCount > 1 ? 'itens' : 'item'} para salvar — veja os avisos em vermelho.`
            : saved ? '✓ Peça salva.'
            : form.active !== false ? 'Ao salvar, a peça fica visível na loja.' : 'Ao salvar, a peça fica como rascunho.'}
        </span>
        <span style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => router.push('/admin/produtos')} disabled={saving}>Cancelar</button>
          <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg" disabled={saving || saved}>
            {saving ? 'Salvando…' : isNew ? 'Salvar peça' : 'Salvar alterações'}
          </button>
        </span>
      </div>
    </form>
  );
}
