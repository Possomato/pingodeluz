'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCatalog, getCatalog, type Product } from '@/lib/data';
import { searchProducts, TINT_COLORS, type SearchResult } from '@/lib/search';

interface Props {
  variant?: 'header' | 'drawer';
  onNavigate?: () => void;
}

export default function SearchBox({ variant = 'header', onNavigate }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const loadCatalog = useCallback(async () => {
    if (catalog.length > 0) return;
    const local = getCatalog();
    setCatalog(local);
    try {
      const remote = await fetchCatalog();
      if (remote.length > 0) setCatalog(remote);
    } catch { /* fallback to local */ }
  }, [catalog.length]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); setOpen(false); setActiveIdx(-1); return; }
    const r = searchProducts(query, catalog).slice(0, 6);
    setSuggestions(r);
    setOpen(r.length > 0);
    setActiveIdx(-1);
  }, [query, catalog]);

  useEffect(() => {
    if (variant !== 'header') return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [variant]);

  const goToResults = (q: string) => {
    if (!q.trim()) return;
    setOpen(false);
    setQuery('');
    onNavigate?.();
    router.push(`/busca?q=${encodeURIComponent(q.trim())}`);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      goToResults(activeIdx >= 0 ? suggestions[activeIdx].name : query);
    }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
  };

  return (
    <div ref={wrapRef} className={`pdl-search-wrap pdl-search-${variant}`}>
      <div className={`pdl-search-row ${open ? 'focused' : ''}`}>
        <svg className="pdl-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="pdl-search-input"
          placeholder="buscar por nome, cor, tamanho…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={loadCatalog}
          onKeyDown={handleKey}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            className="pdl-search-clear"
            onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
            aria-label="Limpar busca"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className={`pdl-search-results pdl-search-results-${variant}`}>
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              className={`pdl-search-result ${i === activeIdx ? 'active' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
              onClick={() => goToResults(s.name)}
            >
              <span className="pdl-search-dot" style={{ background: TINT_COLORS[s.tint] ?? '#ccc' }} />
              <span className="pdl-search-result-info">
                <span className="pdl-search-result-name">{s.name}</span>
                <span className="pdl-search-result-col">{s.col}</span>
              </span>
            </div>
          ))}
          <div className="pdl-search-ver-todos" onClick={() => goToResults(query)}>
            ver todos os resultados para <em>"{query}"</em>
          </div>
        </div>
      )}
    </div>
  );
}
