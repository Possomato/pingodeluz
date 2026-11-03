/**
 * Conferência do valor pago contra o total do pedido.
 *
 * Funções puras, sem dependência de provedor nem de banco, para poderem
 * ser testadas isoladamente.
 */

/** Provedores devolvem reais em ponto flutuante; o domínio usa centavos. */
export function reaisToCentavos(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  return Math.round(value * 100);
}

/**
 * `true` quando o valor pago bate com o do pedido. Se o provedor não
 * informou valor, não há como contestar — não vira alarme falso.
 */
export function paidAmountMatches(
  paidCentavos: number | undefined,
  expectedCentavos: number
): boolean {
  if (paidCentavos === undefined) return true;
  return paidCentavos === expectedCentavos;
}
