'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import { IconX, IconArrowRight, Sparkle } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { formatCentavos } from '@/lib/money';
import { amountUntilFreeShipping, type ShippingConfig } from '@/lib/pricing';

/**
 * Mini-sacola. Abre ao adicionar uma peça e deixa a pessoa decidir:
 * seguir comprando, revisar a sacola ou ir direto ao pagamento — sem
 * tirá-la da página em que estava.
 */
export default function BagDrawer({ shipping }: { shipping: ShippingConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const { cart, cartCount, subtotalCentavos, bagOpen, closeBag, updateQty, removeItem, lastAddedKey } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);

  // Navegar fecha a sacola: ela pertence à página em que foi aberta.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      closeBag();
    }
  }, [pathname, closeBag]);

  useEffect(() => {
    if (!bagOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeBag(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [bagOpen, closeBag]);

  const missing = amountUntilFreeShipping(subtotalCentavos, shipping);
  const progress = shipping.freeAboveCentavos > 0
    ? Math.min(100, Math.round((subtotalCentavos / shipping.freeAboveCentavos) * 100))
    : 100;

  const go = (path: string) => {
    closeBag();
    router.push(path);
  };

  return (
    <>
      <div className={`pdl-bag-backdrop ${bagOpen ? 'open' : ''}`} onClick={closeBag} aria-hidden />
      <div
        ref={panelRef}
        className={`pdl-app pdl-bag ${bagOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Sua sacola"
        aria-hidden={!bagOpen}
        tabIndex={-1}
        style={{ padding: 0, maxWidth: 'none' }}
      >
        <div className="pdl-bag-handle" aria-hidden />
        <div className="pdl-bag-head">
          <div>
            {lastAddedKey && cart.some((i) => `${i.pid}-${i.size}` === lastAddedKey) && (
              <div className="pdl-bag-added"><Sparkle size={10} /> adicionado à sacola</div>
            )}
            <h3>Sua <em>sacola</em> {cartCount > 0 && <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>· {cartCount}</span>}</h3>
          </div>
          <button className="pdl-bag-close" onClick={closeBag} aria-label="Fechar sacola"><IconX size={16} /></button>
        </div>

        {cart.length === 0 ? (
          <div className="pdl-bag-empty">Sua sacola está esperando os primeiros pingos de luz.</div>
        ) : (
          <div className="pdl-bag-items">
            {cart.map((it) => (
              <div key={`${it.pid}-${it.size}`} className="pdl-bag-item">
                <PdlImg tint={it.tint} imageUrl={it.imageUrl} />
                <div style={{ minWidth: 0 }}>
                  <div className="pdl-bag-item-name">{it.name}</div>
                  <div className="pdl-bag-item-meta">{it.col} · tam. {it.size}</div>
                  <div className="pdl-bag-item-bot">
                    <div className="pdl-qty">
                      <button onClick={() => updateQty(it.pid, it.size, -1)} aria-label={`Diminuir quantidade de ${it.name}`}>−</button>
                      <span className="val">{it.qty}</span>
                      <button onClick={() => updateQty(it.pid, it.size, +1)} aria-label={`Aumentar quantidade de ${it.name}`}>+</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <span className="pdl-bag-item-price">{formatCentavos(it.priceCentavos * it.qty)}</span>
                      <button className="pdl-cart-item-remove" onClick={() => removeItem(it.pid, it.size)}>remover</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pdl-bag-foot">
          {cart.length > 0 && (
            <div className="pdl-ship">
              {missing > 0
                ? <>Faltam <strong>{formatCentavos(missing)}</strong> para o frete grátis.</>
                : <>Frete <strong>por nossa conta</strong> neste pedido.</>}
              <div className={`pdl-ship-bar ${missing === 0 ? 'full' : ''}`}><i style={{ width: `${progress}%` }} /></div>
            </div>
          )}
          {cart.length > 0 && (
            <div className="pdl-bag-total">
              <span className="lbl">Subtotal <em>· frete e cupom na próxima etapa</em></span>
              <span>{formatCentavos(subtotalCentavos)}</span>
            </div>
          )}
          <div className="pdl-bag-actions">
            {cart.length > 0 ? (
              <>
                <button className="pdl-btn pdl-btn--primary pdl-btn--lg pdl-btn--block" onClick={() => go('/checkout')}>
                  finalizar compra <IconArrowRight size={13} />
                </button>
                <button className="pdl-btn pdl-btn--ghost pdl-btn--block" onClick={() => go('/carrinho')}>
                  ver sacola
                </button>
              </>
            ) : (
              <button className="pdl-btn pdl-btn--primary pdl-btn--lg pdl-btn--block" onClick={() => go('/')}>
                começar a explorar
              </button>
            )}
          </div>
          {cart.length > 0 && (
            <div className="pdl-bag-sub">
              <button className="pdl-link" onClick={closeBag}>continuar comprando</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
