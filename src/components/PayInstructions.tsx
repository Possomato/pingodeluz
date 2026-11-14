'use client';

import { useEffect, useState } from 'react';
import { getPaymentInstructionsAction } from '@/app/actions/checkout';
import type { PaymentInstructions } from '@/lib/payments';

/**
 * Como pagar um pedido ainda em aberto: o Pix (QR code + copia e cola)
 * ou o boleto. Usado na confirmação e na página do pedido, para quem
 * fechou a aba e voltou depois.
 *
 * Escrito para quem não tem intimidade com Pix: um botão grande de
 * copiar, passos numerados em linguagem simples e nenhuma pressa.
 */

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Navegadores antigos ou sem permissão: cai no método clássico.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function formatDeadline(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 4000);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <>
      <button
        type="button"
        className={`pdl-btn pdl-btn--lg pdl-btn--block ${state === 'copied' ? 'pdl-btn--ok' : 'pdl-btn--primary'}`}
        onClick={async () => setState((await copyText(text)) ? 'copied' : 'failed')}
      >
        {state === 'copied' ? `✓ ${copiedLabel}` : label}
      </button>
      <div role="status" aria-live="polite" className="pdl-pay-hint" style={{ textAlign: 'center', minHeight: 20 }}>
        {state === 'copied' && 'Agora abra o aplicativo do seu banco e cole o código.'}
        {state === 'failed' && 'Não deu para copiar sozinho. Toque no código abaixo, selecione tudo e copie.'}
      </div>
    </>
  );
}

export default function PayInstructions({ orderId, totalLabel }: { orderId: string; totalLabel: string }) {
  const [data, setData] = useState<PaymentInstructions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPaymentInstructionsAction(orderId)
      .then((r) => { if (!cancelled) setData(r); })
      .catch(() => { /* sem instruções: o resto da tela continua valendo */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) return <div className="pdl-pay-box" aria-busy="true"><div className="pdl-pay-hint">Preparando seu pagamento…</div></div>;
  if (!data) return null;

  const deadline = formatDeadline(data.expiresAt);

  if (data.kind === 'pix') {
    return (
      <section className="pdl-pay-box" aria-label="Pagamento por Pix">
        <h3 className="pdl-pay-box-title">Falta só pagar o <em>Pix</em></h3>
        <p className="pdl-pay-box-total">Valor: <strong>{totalLabel}</strong></p>

        <CopyButton text={data.code} label="Copiar código Pix" copiedLabel="Código copiado" />

        <ol className="pdl-pay-steps">
          <li><span>Toque em <strong>Copiar código Pix</strong>, aqui em cima.</span></li>
          <li><span>Abra o <strong>aplicativo do seu banco</strong> e entre em <strong>Pix</strong>.</span></li>
          <li><span>Escolha <strong>Pix Copia e Cola</strong>, cole o código e confirme.</span></li>
        </ol>

        {data.qrCodeBase64 && (
          <div className="pdl-pay-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/png;base64,${data.qrCodeBase64}`} alt="QR code do Pix" width={220} height={220} />
            <div className="pdl-pay-hint">
              Está no computador? Aponte a câmera do aplicativo do banco para este código.
            </div>
          </div>
        )}

        <details className="pdl-pay-code">
          <summary>Ver o código por extenso</summary>
          <textarea readOnly value={data.code} rows={4} onFocus={(e) => e.currentTarget.select()} aria-label="Código Pix copia e cola" />
        </details>

        <p className="pdl-pay-hint" style={{ textAlign: 'center' }}>
          Não precisa ter pressa{deadline ? <>: o código vale até <strong>{deadline}</strong></> : null}.
          Assim que o banco confirmar, esta página avisa sozinha.
        </p>
      </section>
    );
  }

  return (
    <section className="pdl-pay-box" aria-label="Pagamento por boleto">
      <h3 className="pdl-pay-box-title">Seu <em>boleto</em> está pronto</h3>
      <p className="pdl-pay-box-total">Valor: <strong>{totalLabel}</strong></p>

      <a href={data.url} target="_blank" rel="noopener noreferrer" className="pdl-btn pdl-btn--primary pdl-btn--lg pdl-btn--block">
        Abrir o boleto
      </a>

      {data.digitableLine && (
        <>
          <div className="pdl-pay-label" style={{ marginTop: 18 }}>Ou pague digitando o código de barras</div>
          <div className="pdl-pay-line">{data.digitableLine.replace(/(\d{5})(?=\d)/g, '$1 ')}</div>
          <CopyButton text={data.digitableLine} label="Copiar código de barras" copiedLabel="Código copiado" />
        </>
      )}

      <ol className="pdl-pay-steps">
        <li><span>Pague no <strong>aplicativo do banco</strong>, no caixa eletrônico ou em uma <strong>lotérica</strong>.</span></li>
        <li><span>O banco leva até <strong>2 dias úteis</strong> para nos avisar.</span></li>
        <li><span>Quando confirmar, você recebe um e-mail e começamos a preparar o pedido.</span></li>
      </ol>

      {deadline && <p className="pdl-pay-hint" style={{ textAlign: 'center' }}>O boleto vence em <strong>{deadline}</strong>.</p>}
    </section>
  );
}
