export interface Product {
  id: string;
  name: string;
  nameParts: [string, string];
  col: string;
  price: string;
  tint: string;
  label: string;
  installments?: string;
  desc?: string;
  sizes?: string[];
  unavail?: string[];
  stock?: Record<string, number>; // size → quantity; 0 = unavailable
  galleryLabels?: string[];
  imageUrl?: string; // external photo URL (admin-set)
  gender?: 'meninas' | 'meninos' | 'unissex';
  type?: string; // ex: vestido, macacão, camisa, bermuda…
  sizeTableId?: string;
}

export interface Collection {
  id: string;
  name: [string, string];
  eyebrow: string;
  tint: string;
  intro: string;
  count: number;
  products: Product[];
  imageUrl?: string;
}

export interface GenderData {
  id: string;
  label: [string, string];
  eyebrow: string;
  tint: string;
  intro: string;
  collections: string[];
}

export const HOME_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Vestido Margarida', nameParts: ['Vestido', 'Margarida'], col: 'Jardim Encantado', price: 'R$ 189', tint: 'rose', label: 'foto · vestido florido em musselina', installments: 'em 3x de R$ 63 sem juros', desc: 'Vestido de musselina dupla com bordado de margaridas à mão na barra. Cintura solta, mangas bufantes e fita de seda nas costas.', sizes: ['1m', '3m', '6m', '9m', '1', '2', '4', '6', '8', '10', '12', '14'], unavail: ['8'], galleryLabels: ['frente', 'costas', 'bordado', 'detalhe da fita'] },
  { id: 'p2', name: 'Macacão Explorador', nameParts: ['Macacão', 'Explorador'], col: 'Doce Aventura', price: 'R$ 159', tint: 'ochre', label: 'foto · macacão linho cru', installments: 'em 3x de R$ 53 sem juros', desc: 'Macacão de linho cru com bolsos chapados e botões de coco. Tecido envelhece com o uso — fica mais bonito a cada lavagem.', sizes: ['1', '2', '3', '4', '6', '8'], unavail: [], galleryLabels: ['frente', 'costas', 'bolso', 'detalhe botão'] },
  { id: 'p3', name: 'Camisa Borboleta', nameParts: ['Camisa', 'Borboleta'], col: 'Jardim Encantado', price: 'R$ 129', tint: 'sage', label: 'foto · camisa bordada', sizes: ['1m', '3m', '6m', '9m', '1', '2', '4', '6', '8', '10', '12', '14'] },
  { id: 'p4', name: 'Bermuda Cipó', nameParts: ['Bermuda', 'Cipó'], col: 'Doce Aventura', price: 'R$ 109', tint: 'moss', label: 'foto · bermuda algodão' },
  { id: 'p5', name: 'Conjunto Pétala', nameParts: ['Conjunto', 'Pétala'], col: 'Jardim Encantado', price: 'R$ 219', tint: 'clay', label: 'foto · conjunto blusa + saia', sizes: ['1m', '3m', '6m', '9m', '1', '2', '4', '6', '8', '10', '12', '14'] },
];

export const COLLECTIONS: Record<string, Collection> = {
  jardim: {
    id: 'jardim',
    name: ['Jardim', 'Encantado'],
    eyebrow: 'Coleção nº 12 · Meninas 1–12',
    tint: 'rose',
    intro: 'Uma coleção que nasceu na varanda de uma casa de avó — entre roseiras, musselinas penduradas no varal e a luz baixa do fim de tarde. Pétalas bordadas à mão, renda francesa e tecidos que respiram nos dias mornos.',
    count: 24,
    products: [
      { id: 'j1', name: 'Vestido Margarida', nameParts: ['Vestido', 'Margarida'], col: 'Jardim Encantado', price: 'R$ 189', tint: 'rose', label: 'foto · vestido florido' },
      { id: 'j2', name: 'Camisa Borboleta', nameParts: ['Camisa', 'Borboleta'], col: 'Jardim Encantado', price: 'R$ 129', tint: 'sage', label: 'foto · camisa bordada' },
      { id: 'j3', name: 'Conjunto Pétala', nameParts: ['Conjunto', 'Pétala'], col: 'Jardim Encantado', price: 'R$ 219', tint: 'clay', label: 'foto · blusa + saia' },
      { id: 'j4', name: 'Saia Roseiral', nameParts: ['Saia', 'Roseiral'], col: 'Jardim Encantado', price: 'R$ 149', tint: 'rose', label: 'foto · saia rodada' },
      { id: 'j5', name: 'Vestido Lavanda', nameParts: ['Vestido', 'Lavanda'], col: 'Jardim Encantado', price: 'R$ 209', tint: 'ochre', label: 'foto · vestido festa' },
      { id: 'j6', name: 'Body Bordado', nameParts: ['Body', 'Bordado'], col: 'Jardim Encantado', price: 'R$ 99', tint: 'sage', label: 'foto · body algodão' },
      { id: 'j7', name: 'Macaquinho Flora', nameParts: ['Macaquinho', 'Flora'], col: 'Jardim Encantado', price: 'R$ 179', tint: 'clay', label: 'foto · macaquinho' },
      { id: 'j8', name: 'Camisola Jasmim', nameParts: ['Camisola', 'Jasmim'], col: 'Jardim Encantado', price: 'R$ 159', tint: 'rose', label: 'foto · camisola noite' },
    ],
  },
  doce: {
    id: 'doce',
    name: ['Doce', 'Aventura'],
    eyebrow: 'Coleção nº 12 · Meninos 1–12',
    tint: 'ochre',
    intro: 'Para os que voltam para casa com terra no joelho e história pra contar. Linho cru, sarjas leves e cores que combinam com mato, mar e fim de tarde. Tudo desenhado para aguentar o segundo, o terceiro e o quarto filho.',
    count: 18,
    products: [
      { id: 'd1', name: 'Macacão Explorador', nameParts: ['Macacão', 'Explorador'], col: 'Doce Aventura', price: 'R$ 159', tint: 'ochre', label: 'foto · macacão linho' },
      { id: 'd2', name: 'Bermuda Cipó', nameParts: ['Bermuda', 'Cipó'], col: 'Doce Aventura', price: 'R$ 109', tint: 'moss', label: 'foto · bermuda' },
      { id: 'd3', name: 'Camisa Marinheiro', nameParts: ['Camisa', 'Marinheiro'], col: 'Doce Aventura', price: 'R$ 139', tint: 'sage', label: 'foto · camisa risca' },
      { id: 'd4', name: 'Calça Trilha', nameParts: ['Calça', 'Trilha'], col: 'Doce Aventura', price: 'R$ 169', tint: 'clay', label: 'foto · calça sarja' },
      { id: 'd5', name: 'Suéter Cabana', nameParts: ['Suéter', 'Cabana'], col: 'Doce Aventura', price: 'R$ 199', tint: 'ink', label: 'foto · tricot trança' },
      { id: 'd6', name: 'Camiseta Pomar', nameParts: ['Camiseta', 'Pomar'], col: 'Doce Aventura', price: 'R$ 79', tint: 'moss', label: 'foto · camiseta' },
    ],
  },
};

export const GENDER_DATA: Record<string, GenderData> = {
  meninas: {
    id: 'meninas',
    label: ['Para', 'meninas'],
    eyebrow: 'todos os produtos · 1m–14',
    tint: 'rose',
    intro: 'Tudo o que temos para as meninas hoje — coleção atual e arquivo. Filtre por idade, coleção ou tipo de peça.',
    collections: ['jardim'],
  },
  meninos: {
    id: 'meninos',
    label: ['Para', 'meninos'],
    eyebrow: 'todos os produtos · 1m–14',
    tint: 'ochre',
    intro: 'Tudo o que temos para os meninos hoje — coleção atual e arquivo. Filtre por idade, coleção ou tipo de peça.',
    collections: ['doce'],
  },
};

export interface MedidaRow {
  manequim: string;
  torax: number;
  cintura: number;
  comprimento: number;
}

export const TABELA_MEDIDAS: MedidaRow[] = [
  { manequim: '1m',  torax: 40, cintura: 39, comprimento: 32 },
  { manequim: '3m',  torax: 44, cintura: 41, comprimento: 35 },
  { manequim: '6m',  torax: 46, cintura: 43, comprimento: 38 },
  { manequim: '9m',  torax: 48, cintura: 44, comprimento: 41 },
  { manequim: '1',   torax: 50, cintura: 48, comprimento: 44 },
  { manequim: '2',   torax: 53, cintura: 52, comprimento: 50 },
  { manequim: '4',   torax: 57, cintura: 56, comprimento: 60 },
  { manequim: '6',   torax: 61, cintura: 58, comprimento: 65 },
  { manequim: '8',   torax: 66, cintura: 60, comprimento: 70 },
  { manequim: '10',  torax: 70, cintura: 62, comprimento: 75 },
  { manequim: '12',  torax: 75, cintura: 64, comprimento: 80 },
  { manequim: '14',  torax: 78, cintura: 66, comprimento: 85 },
];

export const SIZES_MENINAS = TABELA_MEDIDAS.map(r => r.manequim);

export interface SizeTable {
  id: string;
  name: string;
  columns: string[];
  rows: { size: string; values: Record<string, number> }[];
}

export const DEFAULT_SIZE_TABLES: SizeTable[] = [
  {
    id: 'padrao-meninas',
    name: 'Padrão meninas',
    columns: ['tórax', 'cintura', 'comprimento'],
    rows: TABELA_MEDIDAS.map(r => ({
      size: r.manequim,
      values: { 'tórax': r.torax, 'cintura': r.cintura, 'comprimento': r.comprimento },
    })),
  },
];

export const TESTIMONIALS = [
  { q: 'A Manu vive nas roupas da Pingo. O tecido é macio de um jeito que parece carinho — e ela mesma escolhe o que vai vestir.', name: 'Marina Vasques', role: 'mãe da Manuela, 4' },
  { q: 'Comprei o primeiro macacão do Theo na coleção Doce Aventura. Hoje guardo ele numa caixa — vai virar herança do irmão.', name: 'Beatriz Andrade', role: 'mãe do Theo, 2' },
  { q: 'O cuidado com o acabamento se nota. As peças sobrevivem a três crianças sem perder a graça.', name: 'Luiza Caetano', role: 'mãe da Aurora, Liz e Cora' },
];

export interface HomepageSection {
  id: string;
  visible: boolean;
  imageUrls: string[];
}

export const HOMEPAGE_SECTION_IDS = [
  'meninas', 'meninos', 'queridos', 'manifesto',
  'colecoes', 'fases', 'depoimentos', 'instagram',
] as const;

export type HomepageSectionId = typeof HOMEPAGE_SECTION_IDS[number];

export const DEFAULT_HOMEPAGE_CONFIG: Record<HomepageSectionId, HomepageSection> =
  HOMEPAGE_SECTION_IDS.reduce(
    (acc, id) => { acc[id] = { id, visible: true, imageUrls: [] }; return acc; },
    {} as Record<HomepageSectionId, HomepageSection>
  );

export const MOCK_ORDERS = [
  { num: 'PDL-23491', date: 'maio · 2026', status: 'em trânsito', statusKind: 'transit', desc: 'Vestido Margarida + Conjunto Pétala', items: 2, total: 'R$ 408' },
  { num: 'PDL-21204', date: 'março · 2026', status: 'entregue', statusKind: 'entregue', desc: 'Macacão Explorador', items: 1, total: 'R$ 159' },
  { num: 'PDL-19877', date: 'janeiro · 2026', status: 'entregue', statusKind: 'entregue', desc: 'Saia Roseiral + Body Bordado + Camisola Jasmim', items: 3, total: 'R$ 407' },
  { num: 'PDL-17331', date: 'novembro · 2025', status: 'entregue', statusKind: 'entregue', desc: 'Camisa Borboleta', items: 1, total: 'R$ 129' },
];

export const MOCK_ADDRESSES = [
  { id: 'casa', label: 'Casa', primary: true, line1: 'Rua das Acácias, 128 · apto 42', line2: 'Jardim Paulistano · São Paulo/SP', cep: '04546-001' },
  { id: 'vovo', label: 'Casa da vovó', primary: false, line1: 'Rua Florença, 88', line2: 'Lourdes · Belo Horizonte/MG', cep: '30170-040' },
];

export function parsePrice(s: string): number {
  return parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
}

export function formatPrice(n: number): string {
  return 'R$ ' + n.toLocaleString('pt-BR');
}

export function getProductById(id: string) {
  const catalog = getCatalog();
  const hp = catalog.find(p => p.id === id);
  if (hp) return hp;
  const cols = getCollections();
  for (const col of Object.values(cols)) {
    const p = col.products.find(p => p.id === id);
    if (p) return p;
  }
  return HOME_PRODUCTS[0];
}

export function getCatalog(): Product[] {
  if (typeof window === 'undefined') return HOME_PRODUCTS;
  try {
    const saved = localStorage.getItem('pdl_admin_catalog');
    return saved ? JSON.parse(saved) : HOME_PRODUCTS;
  } catch {
    return HOME_PRODUCTS;
  }
}

export function getCollections(): Record<string, Collection> {
  if (typeof window === 'undefined') return COLLECTIONS;
  try {
    const saved = localStorage.getItem('pdl_admin_collections');
    return saved ? JSON.parse(saved) : COLLECTIONS;
  } catch {
    return COLLECTIONS;
  }
}

// ─── Supabase async fetchers ────────────────────────────────

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    nameParts: (row.name_parts as [string, string]) ?? [row.name as string, ''],
    col: row.col as string,
    price: row.price as string,
    tint: row.tint as string,
    label: row.label as string,
    installments: row.installments as string | undefined,
    desc: row.description as string | undefined,
    sizes: row.sizes as string[] | undefined,
    unavail: row.unavail as string[] | undefined,
    stock: row.stock as Record<string, number> | undefined,
    galleryLabels: row.gallery_labels as string[] | undefined,
    imageUrl: row.image_url as string | undefined,
    gender: row.gender as 'meninas' | 'meninos' | 'unissex' | undefined,
    type: (row.product_type ?? row.type) as string | undefined,
    sizeTableId: (row.size_table_id ?? row.sizeTableId) as string | undefined,
  };
}

export async function fetchCatalog(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=*`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return HOME_PRODUCTS;
    const rows = await res.json();
    return rows.map(rowToProduct);
  } catch {
    return HOME_PRODUCTS;
  }
}

export async function fetchCollections(): Promise<Record<string, Collection>> {
  try {
    const [colRes, prodRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/collections?select=*`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=*`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }),
    ]);
    if (!colRes.ok || !prodRes.ok) return COLLECTIONS;
    const colRows: Record<string, unknown>[] = await colRes.json();
    const prodRows: Record<string, unknown>[] = await prodRes.json();
    const products = prodRows.map(rowToProduct);
    const result: Record<string, Collection> = {};
    for (const row of colRows) {
      const id = row.id as string;
      const colProducts = products.filter(p => p.col === (row.name as string[]).join(' '));
      result[id] = {
        id,
        name: row.name as [string, string],
        eyebrow: row.eyebrow as string,
        tint: row.tint as string,
        intro: row.intro as string,
        count: (row.count as number) ?? colProducts.length,
        products: colProducts,
        imageUrl: row.image_url as string | undefined,
      };
    }
    return result;
  } catch {
    return COLLECTIONS;
  }
}

export async function fetchProductById(id: string): Promise<Product> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return getProductById(id);
    const rows = await res.json();
    if (!rows.length) return getProductById(id);
    return rowToProduct(rows[0]);
  } catch {
    return getProductById(id);
  }
}

export interface InstagramPost {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

export async function fetchInstagramFeed(): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink&limit=6&access_token=${token}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []) as InstagramPost[];
  } catch {
    return [];
  }
}

export async function fetchHomepageConfig(): Promise<Record<HomepageSectionId, HomepageSection>> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/homepage_config?select=*`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return DEFAULT_HOMEPAGE_CONFIG;
    const rows: { id: string; visible: boolean; image_urls: string[] }[] = await res.json();
    const result = { ...DEFAULT_HOMEPAGE_CONFIG };
    for (const row of rows) {
      if (row.id in result) {
        result[row.id as HomepageSectionId] = {
          id: row.id,
          visible: row.visible,
          imageUrls: row.image_urls ?? [],
        };
      }
    }
    return result;
  } catch {
    return DEFAULT_HOMEPAGE_CONFIG;
  }
}


export async function fetchSizeTables(): Promise<SizeTable[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/size_tables?select=*&order=name`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return DEFAULT_SIZE_TABLES;
    const rows = await res.json();
    if (!rows.length) return DEFAULT_SIZE_TABLES;
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      columns: r.columns as string[],
      rows: r.rows as SizeTable['rows'],
    }));
  } catch {
    return DEFAULT_SIZE_TABLES;
  }
}

export async function fetchSizeTableById(id: string | undefined): Promise<SizeTable | null> {
  if (!id) return null;
  try {
    const all = await fetchSizeTables();
    return all.find(t => t.id === id) ?? null;
  } catch {
    return null;
  }
}
