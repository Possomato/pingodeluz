/**
 * Dinheiro é sempre um `integer` em centavos dentro do sistema (ADR-2).
 * Formatar é trabalho da borda da UI; nada além deste módulo deve
 * converter string em número ou vice-versa.
 */

/** 18990 → "R$ 189,90" · 18900 → "R$ 189" (esconde centavos redondos). */
export function formatCentavos(centavos: number): string {
  const safe = Math.round(centavos || 0);
  const reais = safe / 100;
  const hasCents = safe % 100 !== 0;
  return (
    'R$ ' +
    reais.toLocaleString('pt-BR', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/** Sempre com centavos: 18900 → "R$ 189,00". Para totais e recibos. */
export function formatCentavosExact(centavos: number): string {
  return (
    'R$ ' +
    (Math.round(centavos || 0) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * "R$ 1.234,56" | "1234.56" | "189" → centavos.
 * Aceita vírgula ou ponto como separador decimal e ignora o resto.
 */
export function parseCentavosFromInput(input: string): number {
  if (!input) return 0;

  const cleaned = String(input).replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  // O último separador é o decimal; os anteriores são de milhar.
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalPos = Math.max(lastComma, lastDot);

  let normalized: string;
  if (decimalPos === -1) {
    normalized = cleaned;
  } else {
    const intPart = cleaned.slice(0, decimalPos).replace(/[.,]/g, '');
    const fracPart = cleaned.slice(decimalPos + 1).replace(/[.,]/g, '');
    normalized = `${intPart}.${fracPart}`;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** 18990 → "189,90". Preenche o input de preço do admin. */
export function centavosToInput(centavos: number): string {
  return (Math.round(centavos || 0) / 100).toFixed(2).replace('.', ',');
}

/** Percentual sobre um valor, arredondado ao centavo. */
export function percentOf(centavos: number, percent: number): number {
  return Math.round((centavos * percent) / 100);
}
