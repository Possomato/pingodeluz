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
}

export interface Collection {
  id: string;
  name: [string, string];
  eyebrow: string;
  tint: string;
  intro: string;
  count: number;
  products: Product[];
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
  { id: 'p1', name: 'Vestido Margarida', nameParts: ['Vestido', 'Margarida'], col: 'Jardim Encantado', price: 'R$ 189', tint: 'rose', label: 'foto · vestido florido em musselina', installments: 'em 3x de R$ 63 sem juros', desc: 'Vestido de musselina dupla com bordado de margaridas à mão na barra. Cintura solta, mangas bufantes e fita de seda nas costas.', sizes: ['1', '2', '3', '4', '6', '8'], unavail: ['8'], galleryLabels: ['frente', 'costas', 'bordado', 'detalhe da fita'] },
  { id: 'p2', name: 'Macacão Explorador', nameParts: ['Macacão', 'Explorador'], col: 'Doce Aventura', price: 'R$ 159', tint: 'ochre', label: 'foto · macacão linho cru', installments: 'em 3x de R$ 53 sem juros', desc: 'Macacão de linho cru com bolsos chapados e botões de coco. Tecido envelhece com o uso — fica mais bonito a cada lavagem.', sizes: ['1', '2', '3', '4', '6', '8'], unavail: [], galleryLabels: ['frente', 'costas', 'bolso', 'detalhe botão'] },
  { id: 'p3', name: 'Camisa Borboleta', nameParts: ['Camisa', 'Borboleta'], col: 'Jardim Encantado', price: 'R$ 129', tint: 'sage', label: 'foto · camisa bordada' },
  { id: 'p4', name: 'Bermuda Cipó', nameParts: ['Bermuda', 'Cipó'], col: 'Doce Aventura', price: 'R$ 109', tint: 'moss', label: 'foto · bermuda algodão' },
  { id: 'p5', name: 'Conjunto Pétala', nameParts: ['Conjunto', 'Pétala'], col: 'Jardim Encantado', price: 'R$ 219', tint: 'clay', label: 'foto · conjunto blusa + saia' },
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
    eyebrow: 'todos os produtos · 0–12 anos',
    tint: 'rose',
    intro: 'Tudo o que temos para as meninas hoje — coleção atual e arquivo. Filtre por idade, coleção ou tipo de peça.',
    collections: ['jardim'],
  },
  meninos: {
    id: 'meninos',
    label: ['Para', 'meninos'],
    eyebrow: 'todos os produtos · 0–12 anos',
    tint: 'ochre',
    intro: 'Tudo o que temos para os meninos hoje — coleção atual e arquivo. Filtre por idade, coleção ou tipo de peça.',
    collections: ['doce'],
  },
};

export const TESTIMONIALS = [
  { q: 'A Manu vive nas roupas da Pingo. O tecido é macio de um jeito que parece carinho — e ela mesma escolhe o que vai vestir.', name: 'Marina Vasques', role: 'mãe da Manuela, 4' },
  { q: 'Comprei o primeiro macacão do Theo na coleção Doce Aventura. Hoje guardo ele numa caixa — vai virar herança do irmão.', name: 'Beatriz Andrade', role: 'mãe do Theo, 2' },
  { q: 'O cuidado com o acabamento se nota. As peças sobrevivem a três crianças sem perder a graça.', name: 'Luiza Caetano', role: 'mãe da Aurora, Liz e Cora' },
];

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
