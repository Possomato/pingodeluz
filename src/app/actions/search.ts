'use server';

import { fetchCatalog } from '@/lib/data';
import { searchProducts, type SearchResult } from '@/lib/search';

/**
 * Sugestões do campo de busca.
 *
 * Roda no servidor: antes, o componente baixava o catálogo inteiro para
 * o navegador só para filtrar localmente — o que cresce mal e mostra
 * dados velhos enquanto a aba fica aberta.
 */
export async function searchSuggestionsAction(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const catalog = await fetchCatalog();
  return searchProducts(query, catalog).slice(0, 6);
}
