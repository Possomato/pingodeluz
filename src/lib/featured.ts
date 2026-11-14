import { isSoldOut, type Product } from './data';

/**
 * Qual peça abre a home.
 *
 * Regra: a mais vendida (em pedidos pagos) entre as que têm estoque —
 * não adianta chamar atenção para algo que a pessoa não consegue
 * comprar. Sem vendas ainda, vale a primeira com estoque; sem estoque
 * em nenhuma, a mais vendida mesmo assim. Função pura, para teste.
 */
export function pickFeatured(
  products: Product[],
  /** id do produto → unidades vendidas em pedidos pagos. */
  sales: Record<string, number>
): Product | null {
  if (!products.length) return null;

  const bySales = [...products].sort((a, b) => (sales[b.id] ?? 0) - (sales[a.id] ?? 0));
  return bySales.find((p) => !isSoldOut(p)) ?? bySales[0];
}

/** Soma as unidades por produto a partir dos itens dos pedidos. */
export function countSales(orders: { items: unknown }[]): Record<string, number> {
  const sales: Record<string, number> = {};
  for (const order of orders) {
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items as { id?: unknown; qty?: unknown }[]) {
      if (typeof item?.id !== 'string') continue;
      sales[item.id] = (sales[item.id] ?? 0) + (typeof item.qty === 'number' ? item.qty : 1);
    }
  }
  return sales;
}
