/**
 * CPF: máscara e validação dos dígitos verificadores.
 *
 * Funções puras. O CPF é pedido no pagamento porque Pix, boleto e
 * cartão exigem a identificação de quem paga.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** "12345678909" → "123.456.789-09", aceitando digitação parcial. */
export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function isValidCPF(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11) return false;
  // 000.000.000-00, 111.111.111-11… passam na conta mas não existem.
  if (/^(\d)\1{10}$/.test(d)) return false;

  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(d[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return (rest === 10 ? 0 : rest) === Number(d[length]);
  };

  return check(9) && check(10);
}
