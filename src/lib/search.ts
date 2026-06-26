import type { Product } from './data';

export const TINT_COLORS: Record<string, string> = {
  rose: '#c4a39a',
  ochre: '#b8955a',
  sage: '#8fa68e',
  moss: '#6e7d5e',
  clay: '#a07060',
  ink: '#2a2419',
};

const COLOR_ALIASES: Record<string, string[]> = {
  rose:  ['rosa', 'rose', 'pink', 'rosado', 'floral', 'florido', 'rosê'],
  ochre: ['ocre', 'amarelo', 'dourado', 'bege', 'caramelo', 'mel', 'ouro', 'dourada'],
  sage:  ['verde', 'salvia', 'sálvia', 'sage', 'menta', 'pistache'],
  moss:  ['musgo', 'verde', 'oliva', 'olive', 'militar'],
  clay:  ['barro', 'terracota', 'argila', 'marrom', 'cobre', 'terra'],
  ink:   ['preto', 'escuro', 'tinto', 'carvao', 'carvão', 'marinho', 'azul'],
};

const SIZE_ALIASES: Record<string, string[]> = {
  '1m':  ['1mes', '1 mes', 'rn', 'recem', 'recém', 'newborn', 'bebe', 'bebê', 'bebebê'],
  '3m':  ['3mes', '3 mes', 'tres meses', 'bebe', 'bebê'],
  '6m':  ['6mes', '6 mes', 'seis meses', 'bebe', 'bebê'],
  '9m':  ['9mes', '9 mes', 'nove meses', 'bebe', 'bebê'],
  '1':   ['1ano', '1 ano', 'um ano', 'pequeno', 'toddler'],
  '2':   ['2anos', '2 anos', 'dois anos', 'pequeno'],
  '4':   ['4anos', '4 anos', 'quatro anos'],
  '6':   ['6anos', '6 anos', 'seis anos', 'crianca', 'criança'],
  '8':   ['8anos', '8 anos', 'oito anos', 'crianca', 'criança'],
  '10':  ['10anos', '10 anos', 'dez anos'],
  '12':  ['12anos', '12 anos', 'doze anos'],
  '14':  ['14anos', '14 anos', 'quatorze anos'],
};

const GENDER_ALIASES: Record<string, string[]> = {
  meninas:  ['menina', 'meninas', 'feminino', 'feminina', 'girl', 'girls', 'ela'],
  meninos:  ['menino', 'meninos', 'masculino', 'masculino', 'boy', 'boys', 'ele'],
  unissex:  ['unissex', 'neutro', 'neutral', 'unisex'],
};

// Type keywords mapped to common product name prefixes
const TYPE_KEYWORDS: [string[], string[]][] = [
  [['vestido', 'dress', 'vestidinho'],            ['vestido']],
  [['macacao', 'macacão', 'macaquinho', 'overall'], ['macacão', 'macaquinho']],
  [['camisa', 'blusa', 'shirt'],                   ['camisa', 'blusa']],
  [['bermuda', 'short', 'shorts'],                 ['bermuda']],
  [['calca', 'calça', 'pants', 'legging'],         ['calça']],
  [['conjunto', 'set', 'kit'],                     ['conjunto']],
  [['saia', 'skirt'],                              ['saia']],
  [['sueter', 'suéter', 'tricot', 'malha', 'knit'],['suéter']],
  [['camiseta', 'tshirt', 't-shirt', 'tee'],       ['camiseta']],
  [['camisola', 'pijama'],                         ['camisola']],
  [['body'],                                       ['body']],
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return norm(s).split(' ').filter(t => t.length > 1);
}

function has(haystack: string, needle: string): boolean {
  return norm(haystack).includes(norm(needle));
}

export interface SearchResult {
  id: string;
  name: string;
  col: string;
  price: string;
  tint: string;
  imageUrl?: string;
  score: number;
}

export function searchProducts(query: string, catalog: Product[]): SearchResult[] {
  if (!query.trim() || !catalog.length) return [];
  const qTokens = tokens(query);
  if (!qTokens.length) return [];

  const scored: SearchResult[] = [];

  for (const p of catalog) {
    let score = 0;

    for (const t of qTokens) {
      // Name — highest weight
      if (has(p.name, t)) score += 5;

      // Collection name
      if (has(p.col, t)) score += 3;

      // Type field (admin-configured) — very high weight
      if (p.type && (norm(p.type) === t || norm(p.type).includes(t) || t.includes(norm(p.type)))) score += 6;

      // Product type (fallback inference from name/type keyword table)
      for (const [queryWords, nameWords] of TYPE_KEYWORDS) {
        if (queryWords.some(w => norm(w).includes(t) || t.includes(norm(w)))) {
          if (nameWords.some(nw => has(p.name, nw))) score += 3;
        }
      }

      // Color
      const colorWords = COLOR_ALIASES[p.tint] ?? [];
      if (colorWords.some(w => norm(w).includes(t) || t.includes(norm(w)))) score += 3;

      // Size — direct
      if (p.sizes?.some(s => norm(s) === t)) score += 4;
      // Size — alias
      for (const [size, aliases] of Object.entries(SIZE_ALIASES)) {
        if (aliases.some(a => norm(a).includes(t) || t.includes(norm(a)))) {
          if (p.sizes?.includes(size)) score += 2;
        }
      }

      // Gender — infer from tint if not set
      const gender = p.gender ?? (p.tint === 'rose' ? 'meninas' : p.tint === 'ochre' ? 'meninos' : undefined);
      if (gender) {
        const gWords = GENDER_ALIASES[gender] ?? [];
        if (gWords.some(w => norm(w).includes(t))) score += 2;
      }

      // Description / label
      if (p.desc && has(p.desc, t)) score += 1;
      if (has(p.label, t)) score += 1;
    }

    if (score > 0) {
      scored.push({ id: p.id, name: p.name, col: p.col, price: p.price, tint: p.tint, imageUrl: p.imageUrl, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 8);
}
