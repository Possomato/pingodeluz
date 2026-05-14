import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load env manually since this runs outside Next.js
config({ path: '.env.local' });

// The env var may include a trailing /rest/v1/ path — strip it so the JS client works
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Inline data (mirrors src/lib/data.ts) ────────────────────────────────────

interface Product {
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
  stock?: Record<string, number>;
  galleryLabels?: string[];
  imageUrl?: string;
  gender?: 'meninas' | 'meninos' | 'unissex';
}

interface Collection {
  id: string;
  name: [string, string];
  eyebrow: string;
  tint: string;
  intro: string;
  count: number;
  products: Product[];
  imageUrl?: string;
}

const HOME_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Vestido Margarida', nameParts: ['Vestido', 'Margarida'], col: 'Jardim Encantado', price: 'R$ 189', tint: 'rose', label: 'foto · vestido florido em musselina', installments: 'em 3x de R$ 63 sem juros', desc: 'Vestido de musselina dupla com bordado de margaridas à mão na barra. Cintura solta, mangas bufantes e fita de seda nas costas.', sizes: ['1', '2', '3', '4', '6', '8'], unavail: ['8'], galleryLabels: ['frente', 'costas', 'bordado', 'detalhe da fita'] },
  { id: 'p2', name: 'Macacão Explorador', nameParts: ['Macacão', 'Explorador'], col: 'Doce Aventura', price: 'R$ 159', tint: 'ochre', label: 'foto · macacão linho cru', installments: 'em 3x de R$ 53 sem juros', desc: 'Macacão de linho cru com bolsos chapados e botões de coco. Tecido envelhece com o uso — fica mais bonito a cada lavagem.', sizes: ['1', '2', '3', '4', '6', '8'], unavail: [], galleryLabels: ['frente', 'costas', 'bolso', 'detalhe botão'] },
  { id: 'p3', name: 'Camisa Borboleta', nameParts: ['Camisa', 'Borboleta'], col: 'Jardim Encantado', price: 'R$ 129', tint: 'sage', label: 'foto · camisa bordada' },
  { id: 'p4', name: 'Bermuda Cipó', nameParts: ['Bermuda', 'Cipó'], col: 'Doce Aventura', price: 'R$ 109', tint: 'moss', label: 'foto · bermuda algodão' },
  { id: 'p5', name: 'Conjunto Pétala', nameParts: ['Conjunto', 'Pétala'], col: 'Jardim Encantado', price: 'R$ 219', tint: 'clay', label: 'foto · conjunto blusa + saia' },
];

const COLLECTIONS: Record<string, Collection> = {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a reverse map: product.col (display name) → collection key */
function buildColToKeyMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, col] of Object.entries(COLLECTIONS)) {
    map[col.name.join(' ')] = key;
  }
  return map;
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Resolved Supabase URL:', supabaseUrl);
  console.log('');

  // ── 1. Collections ──────────────────────────────────────────────────────────
  console.log('Seeding collections...');

  const collectionRows = Object.entries(COLLECTIONS).map(([key, c]) => ({
    id: key,
    slug: key,
    name: c.name,
    eyebrow: c.eyebrow,
    tint: c.tint,
    intro: c.intro,
    image_url: c.imageUrl ?? null,
    count: c.count ?? c.products?.length ?? 0,
  }));

  const { error: colError, data: colData } = await supabase
    .from('collections')
    .upsert(collectionRows, { onConflict: 'id' });

  if (colError) {
    console.error('  ERROR seeding collections:', colError.message);
    console.error('  Details:', JSON.stringify(colError, null, 2));
  } else {
    console.log(`  ✓ ${collectionRows.length} collections upserted`);
  }

  // ── 2. Products ─────────────────────────────────────────────────────────────
  console.log('Seeding products...');

  const colToKey = buildColToKeyMap();

  // Collect all unique products (HOME_PRODUCTS + all collection products)
  const productMap = new Map<string, { product: Product; collectionId: string | null }>();

  // HOME_PRODUCTS first
  for (const p of HOME_PRODUCTS) {
    productMap.set(p.id, {
      product: p,
      collectionId: colToKey[p.col] ?? null,
    });
  }

  // Collection products (may introduce new ids or overwrite with richer data)
  for (const [colKey, col] of Object.entries(COLLECTIONS)) {
    for (const p of col.products) {
      if (!productMap.has(p.id)) {
        productMap.set(p.id, { product: p, collectionId: colKey });
      }
    }
  }

  const productRows = Array.from(productMap.values()).map(({ product: p, collectionId }) => ({
    id: p.id,
    name: p.name,
    name_parts: p.nameParts,
    col: p.col,
    price: p.price,
    tint: p.tint,
    label: p.label,
    installments: p.installments ?? null,
    description: p.desc ?? null,
    sizes: p.sizes ?? [],
    unavail: p.unavail ?? [],
    stock: p.stock ?? {},
    gallery_labels: p.galleryLabels ?? [],
    image_url: p.imageUrl ?? null,
    gender: p.gender ?? null,
    collection_id: collectionId,
  }));

  const { error: prodError } = await supabase
    .from('products')
    .upsert(productRows, { onConflict: 'id' });

  if (prodError) {
    console.error('  ERROR seeding products:', prodError.message);
    console.error('  Details:', JSON.stringify(prodError, null, 2));
  } else {
    console.log(`  ✓ ${productRows.length} products upserted`);
  }

  console.log('');
  console.log('Done!');
}

seed().catch(console.error).finally(() => process.exit(0));
