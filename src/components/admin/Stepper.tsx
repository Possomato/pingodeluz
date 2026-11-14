'use client';

/**
 * Contador de estoque: − número +. Botões grandes para acertar com o
 * dedo, e o número continua editável para quem prefere digitar "12".
 */
export default function Stepper({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  /** Para leitores de tela: "Estoque do tamanho 4". */
  label: string;
  disabled?: boolean;
}) {
  const set = (n: number) => onChange(Math.max(0, Math.min(9999, Math.floor(n) || 0)));

  return (
    <div className={`adm-stepper${value === 0 && !disabled ? ' zero' : ''}`} role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - 1)} disabled={disabled || value <= 0} aria-label={`Diminuir — ${label}`}>−</button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => set(parseInt(e.target.value, 10))}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={label}
      />
      <button type="button" onClick={() => set(value + 1)} disabled={disabled} aria-label={`Aumentar — ${label}`}>+</button>
    </div>
  );
}
