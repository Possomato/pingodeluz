'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import Stepper from '@/components/admin/Stepper';
import PdlImg from '@/components/PdlImg';
import { useAdmin, orderedSizes } from '@/context/AdminContext';
import type { Product } from '@/lib/data';

type Filter = 'todas' | 'esgotadas' | 'baixo';

/** Até quantas unidades um tamanho conta como "acabando". */
const LOW = 2;
/** Espera a pessoa parar de clicar antes de gravar, para não enviar um pedido por clique. */
const SAVE_DELAY_MS = 600;

const totalStock = (p: Product) => (p.sizes ?? []).reduce((n, s) => n + (p.stock?.[s] ?? 0), 0);

export default function AdminEstoquePage() {
  const { products, sizeTables, loading, adjustStock } = useAdmin();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todas');

  // Valor na tela enquanto a gravação não acontece, e o estado de cada célula.
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [state, setState] = useState<Record<string, 'saving' | 'saved'>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const pending = timers.current;
    return () => { Object.values(pending).forEach(clearTimeout); };
  }, []);

  const change = (p: Product, size: string, qty: number) => {
    const key = `${p.id}|${size}`;
    setDraft(d => ({ ...d, [key]: qty }));
    setState(s => { const n = { ...s }; delete n[key]; return n; });

    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      setState(s => ({ ...s, [key]: 'saving' }));
      await adjustStock(p.id, size, qty);
      setDraft(d => { const n = { ...d }; delete n[key]; return n; });
      setState(s => ({ ...s, [key]: 'saved' }));
      timers.current[key] = setTimeout(() => {
        setState(s => { const n = { ...s }; delete n[key]; return n; });
      }, 2500);
    }, SAVE_DELAY_MS);
  };

  const counts: Record<Filter, number> = {
    todas: products.length,
    esgotadas: products.filter(p => totalStock(p) === 0).length,
    baixo: products.filter(p => totalStock(p) > 0 && (p.sizes ?? []).some(s => (p.stock?.[s] ?? 0) <= LOW)).length,
  };

  const q = search.trim().toLowerCase();
  const visible = products
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .filter(p =>
      filter === 'esgotadas' ? totalStock(p) === 0
        : filter === 'baixo' ? totalStock(p) > 0 && (p.sizes ?? []).some(s => (p.stock?.[s] ?? 0) <= LOW)
          : true
    )
    // Ordem alfabética e estável: a peça não pula de lugar enquanto você mexe nela.
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const LABEL: Record<Filter, string> = { todas: 'Todas', esgotadas: 'Esgotadas', baixo: 'Acabando' };

  return (
    <AdminLayout>
      <h1 className="adm-page-title">Estoque</h1>
      <p className="adm-page-sub">
        Use − e + ou digite o número. Cada mudança é salva sozinha. Quando um pagamento é aprovado, o estoque baixa automaticamente.
      </p>

      <div className="adm-toolbar">
        <div className="adm-tabs" role="tablist" aria-label="Filtrar estoque">
          {(['todas', 'esgotadas', 'baixo'] as Filter[]).map(f => (
            <button key={f} role="tab" aria-selected={filter === f} className={`adm-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {LABEL[f]} <span className="n">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="adm-search">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar peça" aria-label="Buscar peça" />
        </div>
      </div>

      {loading ? (
        <p className="adm-muted">Carregando…</p>
      ) : visible.length === 0 ? (
        <div className="adm-empty">
          <strong>{products.length === 0 ? 'Nenhuma peça cadastrada' : 'Nada por aqui'}</strong>
          {products.length === 0 ? 'Cadastre uma peça para controlar o estoque dela.' : 'Nenhuma peça corresponde a esse filtro.'}
        </div>
      ) : (
        <div className="adm-stack" style={{ gap: 14 }}>
          {visible.map(p => {
            const cover = p.imageUrls?.[0] ?? p.imageUrl;
            const sizes = orderedSizes(p, sizeTables);
            const total = sizes.reduce((n, s) => n + (draft[`${p.id}|${s}`] ?? p.stock?.[s] ?? 0), 0);
            return (
              <section key={p.id} className="adm-section" style={{ gap: 14 }} aria-label={p.name}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={cover} alt="" className="adm-prod-thumb" style={{ width: 54 }} />
                    : <PdlImg tint={p.tint} className="adm-prod-thumb" style={{ width: 54 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="adm-prod-name">
                      <Link href={`/admin/produtos/${p.id}`}>{p.name}</Link>
                      {!p.active && <span className="adm-pill">rascunho</span>}
                      {total === 0 ? <span className="adm-pill bad">esgotada</span> : <span className="adm-pill ok">{total} {total === 1 ? 'unidade' : 'unidades'}</span>}
                    </div>
                  </div>
                </div>

                {sizes.length === 0 ? (
                  <span className="adm-hint">
                    Esta peça ainda não tem tamanhos.{' '}
                    <Link href={`/admin/produtos/${p.id}`} style={{ color: 'var(--terra-deep)', textDecoration: 'underline' }}>Definir tamanhos</Link>
                  </span>
                ) : (
                  <div className="adm-size-grid">
                    {sizes.map(s => {
                      const key = `${p.id}|${s}`;
                      const value = draft[key] ?? p.stock?.[s] ?? 0;
                      return (
                        <div key={s} className="adm-size-cell">
                          <span className="size">{s}</span>
                          <Stepper value={value} onChange={n => change(p, s, n)} label={`Estoque de ${p.name}, tamanho ${s}`} />
                          <span className={`state${state[key] === 'saved' ? ' saved' : ''}`} role="status">
                            {state[key] === 'saving' ? 'salvando…' : state[key] === 'saved' ? '✓ salvo' : value === 0 ? 'esgotado' : value <= LOW ? 'acabando' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
