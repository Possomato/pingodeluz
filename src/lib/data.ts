import { createPublicClient } from './supabase';
import { DEFAULT_SHIPPING_CONFIG, type ShippingConfig } from './pricing';

/**
 * Leitura do catálogo e da configuração da loja.
 *
 * Regra desta camada (ADR-6): quando o banco falha, o erro sobe. Não
 * existe catálogo de mentira embutido no código — uma loja que mostra
 * produtos inexistentes é pior do que uma loja que avisa que está fora
 * do ar. As páginas tratam o vazio e o erro explicitamente.
 */

// ─── Tipos ───────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  nameParts: [string, string];
  /** Nome da coleção a que pertence, como texto exibível. */
  col: string;
  collectionId?: string;
  /** Fonte da verdade do preço, em centavos (ADR-2). */
  priceCentavos: number;
  tint: string;
  label: string;
  desc?: string;
  sizes?: string[];
  /** Tamanho → quantidade disponível. Ausente ou 0 = esgotado. */
  stock?: Record<string, number>;
  galleryLabels?: string[];
  imageUrl?: string;
  imageUrls?: string[];
  gender?: 'meninas' | 'meninos' | 'unissex';
  type?: string;
  sizeTableId?: string;
  /** Conteúdo editorial por peça; vazio esconde a seção na página. */
  composition?: string;
  careInfo?: string;
  madeBy?: string;
  active: boolean;
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
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
}

/**
 * Textos das páginas /genero/meninas e /genero/meninos. É conteúdo
 * editorial fixo da marca, não dado de catálogo — os produtos vêm do
 * banco, filtrados por `gender`.
 */
export const GENDER_DATA: Record<string, GenderData> = {
  meninas: {
    id: 'meninas',
    label: ['Para', 'meninas'],
    eyebrow: 'todos os produtos',
    tint: 'rose',
    intro: 'Tudo o que temos para as meninas hoje — coleção atual e arquivo. Filtre por idade, coleção ou tipo de peça.',
  },
  meninos: {
    id: 'meninos',
    label: ['Para', 'meninos'],
    eyebrow: 'todos os produtos',
    tint: 'ochre',
    intro: 'Tudo o que temos para os meninos hoje — coleção atual e arquivo. Filtre por idade, coleção ou tipo de peça.',
  },
};

export const AGE_GROUPS: { label: string; sizes: string[] }[] = [
  { label: '0–2 anos', sizes: ['1m', '3m', '6m', '9m', '1', '2'] },
  { label: '3–6 anos', sizes: ['3', '4', '5', '6'] },
  { label: '7–12 anos', sizes: ['7', '8', '9', '10', '11', '12'] },
  { label: '12+ anos', sizes: ['13', '14'] },
];

// ─── Tabelas de medidas ──────────────────────────────────────

export interface SizeTable {
  id: string;
  name: string;
  columns: string[];
  columnTypes: Record<string, 'crianca' | 'vestido'>;
  rows: { size: string; values: Record<string, number> }[];
}

type StoredColumn = string | { name: string; type: 'crianca' | 'vestido' };

/** Colunas foram gravadas ora como string, ora como objeto. Aceita as duas. */
export function parseStoredColumns(raw: StoredColumn[]): {
  columns: string[];
  columnTypes: Record<string, 'crianca' | 'vestido'>;
} {
  const columns: string[] = [];
  const columnTypes: Record<string, 'crianca' | 'vestido'> = {};
  for (const c of raw) {
    if (typeof c === 'string') {
      columns.push(c);
    } else {
      columns.push(c.name);
      columnTypes[c.name] = c.type;
    }
  }
  return { columns, columnTypes };
}

// ─── Parcelamento ────────────────────────────────────────────

export interface PaymentConfig {
  maxParcelas: number;
  /** Valor mínimo de cada parcela, em centavos. */
  parcelaMinimaCentavos: number;
  juros: 'sem' | number;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  maxParcelas: 3,
  parcelaMinimaCentavos: 5000,
  juros: 'sem',
};

/** "em 3x de R$ 90 sem juros" — ou null se não parcela. */
export function calcInstallments(priceCentavos: number, config: PaymentConfig): string | null {
  if (!priceCentavos || priceCentavos <= 0) return null;

  for (let n = config.maxParcelas; n >= 2; n--) {
    const parcela = priceCentavos / n;
    if (parcela >= config.parcelaMinimaCentavos) {
      const parcelaFmt = (parcela / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const jurosText = config.juros === 'sem' ? 'sem juros' : `${config.juros}% a.m.`;
      return `em ${n}x de R$ ${parcelaFmt} ${jurosText}`;
    }
  }
  return null;
}

// ─── Vitrine ─────────────────────────────────────────────────

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

// ─── Mapeamento banco → domínio ──────────────────────────────

type Row = Record<string, unknown>;

export function rowToProduct(row: Row): Product {
  const nameParts = (row.name_parts as string[] | null) ?? [];
  return {
    id: row.id as string,
    name: row.name as string,
    nameParts: [nameParts[0] ?? (row.name as string), nameParts[1] ?? ''],
    col: (row.col as string) ?? '',
    collectionId: (row.collection_id as string | null) ?? undefined,
    priceCentavos: (row.price_centavos as number) ?? 0,
    tint: (row.tint as string) ?? 'rose',
    label: (row.label as string) ?? '',
    desc: (row.description as string | null) ?? undefined,
    sizes: (row.sizes as string[] | null) ?? [],
    stock: (row.stock as Record<string, number> | null) ?? {},
    galleryLabels: (row.gallery_labels as string[] | null) ?? [],
    imageUrl: (row.image_url as string | null) ?? undefined,
    imageUrls: (row.image_urls as string[] | null) ?? [],
    gender: (row.gender as Product['gender']) ?? undefined,
    type: (row.product_type as string | null) ?? undefined,
    sizeTableId: (row.size_table_id as string | null) ?? undefined,
    composition: (row.composition as string | null) ?? undefined,
    careInfo: (row.care_info as string | null) ?? undefined,
    madeBy: (row.made_by as string | null) ?? undefined,
    active: (row.active as boolean) ?? true,
  };
}

/** Um tamanho está disponível se houver estoque registrado para ele. */
export function isSizeAvailable(product: Product, size: string): boolean {
  return (product.stock?.[size] ?? 0) > 0;
}

/** Produto esgotado: nenhum tamanho com estoque. */
export function isSoldOut(product: Product): boolean {
  const stock = product.stock ?? {};
  return !Object.values(stock).some((qty) => qty > 0);
}

// ─── Leituras ────────────────────────────────────────────────

export async function fetchCatalog(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) throw new Error(`Falha ao carregar o catálogo: ${error.message}`);
  return (data ?? []).map(rowToProduct);
}

export async function fetchCollections(): Promise<Record<string, Collection>> {
  const supabase = createPublicClient();

  const [colRes, prodRes] = await Promise.all([
    supabase.from('collections').select('*'),
    supabase.from('products').select('*').eq('active', true).order('name'),
  ]);

  if (colRes.error) throw new Error(`Falha ao carregar coleções: ${colRes.error.message}`);
  if (prodRes.error) throw new Error(`Falha ao carregar produtos: ${prodRes.error.message}`);

  const products = (prodRes.data ?? []).map(rowToProduct);
  const result: Record<string, Collection> = {};

  for (const row of colRes.data ?? []) {
    const id = row.id as string;
    const nameParts = (row.name as string[] | null) ?? [];
    const displayName = nameParts.join(' ');

    // `collection_id` é a ligação correta; o casamento por nome existe
    // para os produtos cadastrados antes de a coluna ser usada.
    const colProducts = products.filter(
      (p) => p.collectionId === id || (!p.collectionId && p.col === displayName)
    );

    result[id] = {
      id,
      name: [nameParts[0] ?? '', nameParts[1] ?? ''],
      eyebrow: (row.eyebrow as string) ?? '',
      tint: (row.tint as string) ?? 'rose',
      intro: (row.intro as string) ?? '',
      count: colProducts.length,
      products: colProducts,
      imageUrl: (row.image_url as string | null) ?? undefined,
    };
  }

  return result;
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();

  if (error) throw new Error(`Falha ao carregar o produto: ${error.message}`);
  return data ? rowToProduct(data) : null;
}

export async function fetchHomepageConfig(): Promise<Record<HomepageSectionId, HomepageSection>> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('homepage_config').select('*');

  // A vitrine tem um padrão razoável (tudo visível, sem imagem), então
  // aqui um erro degrada em vez de derrubar a home.
  if (error) return DEFAULT_HOMEPAGE_CONFIG;

  const result = { ...DEFAULT_HOMEPAGE_CONFIG };
  for (const row of data ?? []) {
    const id = row.id as HomepageSectionId;
    if (id in result) {
      result[id] = {
        id,
        visible: row.visible as boolean,
        imageUrls: (row.image_urls as string[] | null) ?? [],
      };
    }
  }
  return result;
}

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('payment_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) return DEFAULT_PAYMENT_CONFIG;

  return {
    maxParcelas: data.max_parcelas as number,
    parcelaMinimaCentavos: Math.round(Number(data.parcela_minima) * 100),
    juros: data.juros === 'sem' ? 'sem' : parseFloat(data.juros as string),
  };
}

export async function fetchShippingConfig(): Promise<ShippingConfig> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('shipping_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) return DEFAULT_SHIPPING_CONFIG;

  return {
    flatCentavos: data.flat_centavos as number,
    freeAboveCentavos: data.free_above_centavos as number,
    pixDiscountPercent: data.pix_discount_percent as number,
    shippingInfo:
      (data.shipping_info as string | null) ?? DEFAULT_SHIPPING_CONFIG.shippingInfo,
  };
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('visible', true)
    .order('sort');

  if (error) return [];

  return (data ?? []).map((row) => ({
    id: row.id as string,
    quote: row.quote as string,
    author: row.author as string,
    role: (row.role as string) ?? '',
  }));
}

export async function fetchSizeTables(): Promise<SizeTable[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('size_tables').select('*').order('name');

  if (error) return [];

  return (data ?? []).map((r) => {
    const { columns, columnTypes } = parseStoredColumns((r.columns as StoredColumn[]) ?? []);
    return {
      id: r.id as string,
      name: r.name as string,
      columns,
      columnTypes,
      rows: (r.rows as SizeTable['rows']) ?? [],
    };
  });
}

export async function fetchSizeTableById(id: string | undefined): Promise<SizeTable | null> {
  if (!id) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('size_tables').select('*').eq('id', id).maybeSingle();

  if (error || !data) return null;

  const { columns, columnTypes } = parseStoredColumns((data.columns as StoredColumn[]) ?? []);
  return {
    id: data.id as string,
    name: data.name as string,
    columns,
    columnTypes,
    rows: (data.rows as SizeTable['rows']) ?? [],
  };
}

// ─── Instagram ───────────────────────────────────────────────

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
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []) as InstagramPost[];
  } catch {
    // Feed de terceiro é decoração: se cair, a seção some silenciosamente.
    return [];
  }
}
