'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconBag, IconGoogle, IconArrowRight } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { useUser, MOCK_USER } from '@/context/UserContext';
import { MOCK_ORDERS, MOCK_ADDRESSES } from '@/lib/data';

export default function PerfilPage() {
  const router = useRouter();
  const { cartCount } = useCart();
  const { user, login, logout } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => {
      login(MOCK_USER);
      setLoading(false);
    }, 1100);
  };

  if (!user) {
    return (
      <div className="pdl-app">
        <div className={`pdl-back-bar ${scrolled ? 'solid' : ''}`}>
          <button onClick={() => router.back()} aria-label="Voltar"><IconChevronLeft size={18} /></button>
          <span className="pdl-back-title">Entrar</span>
          <button onClick={() => router.push('/carrinho')} aria-label="Sacola" style={{ position: 'relative' }}>
            <IconBag size={16} />
            {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
          </button>
        </div>

        <div className="pdl-login">
          <div className="pdl-login-logo">
            <span className="pdl-login-spark">Pingo</span>
            <em>de luz</em>
          </div>

          <h2 className="pdl-login-welcome">Bem-vinda <em>de volta.</em></h2>
          <div className="pdl-login-sub">
            Entre para ver seus pedidos, salvar endereços e acompanhar as peças favoritas.
          </div>

          <button className="pdl-google-btn" onClick={handleGoogle} disabled={loading}>
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'pdl-spin 0.8s linear infinite' }}>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="44" strokeDashoffset="22" />
                </svg>
                entrando…
              </>
            ) : (
              <>
                <IconGoogle size={18} />
                Entrar com Google
              </>
            )}
          </button>

          <div className="pdl-login-foot">
            Ao continuar, você concorda com os <a href="#">Termos</a> e nossa <a href="#">Política de privacidade</a>. Não criamos senha — você entra sempre com sua conta Google.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdl-app">
      <div className={`pdl-back-bar ${scrolled ? 'solid' : ''}`}>
        <button onClick={() => router.back()} aria-label="Voltar"><IconChevronLeft size={18} /></button>
        <span className="pdl-back-title">Sua conta</span>
        <button onClick={() => router.push('/carrinho')} aria-label="Sacola" style={{ position: 'relative' }}>
          <IconBag size={16} />
          {cartCount > 0 && <span className="pdl-bag-count">{cartCount}</span>}
        </button>
      </div>

      <div className="pdl-profile">
        <div className="pdl-profile-hero">
          <div className="pdl-profile-avatar">{user.initial}</div>
          <div className="pdl-profile-info">
            <div className="greeting">olá, mãe</div>
            <div className="name">{user.name}</div>
            <div className="email">{user.email}</div>
          </div>
        </div>

        <div className="pdl-profile-stats">
          <div className="pdl-stat"><div className="v">{MOCK_ORDERS.length}</div><div className="l">pedidos</div></div>
          <div className="pdl-stat"><div className="v">7</div><div className="l">favoritos</div></div>
          <div className="pdl-stat"><div className="v">{MOCK_ADDRESSES.length}</div><div className="l">endereços</div></div>
        </div>

        <div className="pdl-profile-section">
          <h3><span>Meus <em>endereços</em></span><span className="action">+ novo</span></h3>
          {MOCK_ADDRESSES.map(a => (
            <div key={a.id} className={`pdl-address-card ${a.primary ? 'primary' : ''}`}>
              <div className="head">
                <span className="label">{a.label}</span>
                {a.primary && <span className="badge">principal</span>}
              </div>
              <div className="body">{a.line1}<br />{a.line2}<br />CEP {a.cep}</div>
            </div>
          ))}
          <div className="pdl-address-add">+ adicionar novo endereço</div>
        </div>

        <div className="pdl-profile-section">
          <h3><span>Meus <em>pedidos</em></span><span className="action">ver todos</span></h3>
          {MOCK_ORDERS.map(o => (
            <div key={o.num} className="pdl-order-card">
              <div>
                <div className="top">
                  <span className="num">{o.num}</span>
                  <span className={`status ${o.statusKind}`}>{o.status}</span>
                </div>
                <div className="desc">{o.desc}</div>
                <div className="meta">{o.items} {o.items === 1 ? 'peça' : 'peças'} · {o.date}</div>
              </div>
              <div className="total">{o.total}<IconArrowRight size={11} /></div>
            </div>
          ))}
        </div>

        <div className="pdl-profile-section">
          <h3><span>Meus <em>favoritos</em></span><span className="action">ver todos</span></h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <div><PdlImg tint="rose" style={{ aspectRatio: '3/4', borderRadius: 3 }} /><div style={{ fontFamily: 'var(--editorial)', fontSize: 12, color: 'var(--ink)', marginTop: 6 }}>Vestido Margarida</div></div>
            <div><PdlImg tint="sage" style={{ aspectRatio: '3/4', borderRadius: 3 }} /><div style={{ fontFamily: 'var(--editorial)', fontSize: 12, color: 'var(--ink)', marginTop: 6 }}>Camisa Borboleta</div></div>
            <div><PdlImg tint="ochre" style={{ aspectRatio: '3/4', borderRadius: 3 }} /><div style={{ fontFamily: 'var(--editorial)', fontSize: 12, color: 'var(--ink)', marginTop: 6 }}>Vestido Lavanda</div></div>
          </div>
        </div>

        <div className="pdl-profile-section" style={{ paddingBottom: 12 }}>
          <h3><span>Preferências</span></h3>
          <div className="pdl-profile-row"><span className="lbl">Tamanhos dos pequenos</span><span className="meta">2 · 4</span></div>
          <div className="pdl-profile-row"><span className="lbl">Newsletter <em>· coleções novas</em></span><span className="meta">ativada</span></div>
          <div className="pdl-profile-row"><span className="lbl">Cartões salvos</span><span className="meta">1 cartão</span></div>
          <div className="pdl-profile-row"><span className="lbl">Notificações</span><span className="meta">e-mail</span></div>
        </div>

        <div className="pdl-profile-section" style={{ paddingTop: 16 }}>
          <h3><span>Ajuda</span></h3>
          <div className="pdl-profile-row"><span className="lbl">Falar com a gente</span><span className="meta">WhatsApp</span></div>
          <div className="pdl-profile-row"><span className="lbl">Trocas e devoluções</span><span className="meta"><IconArrowRight size={11} /></span></div>
          <div className="pdl-profile-row"><span className="lbl">Guia de tamanhos</span><span className="meta"><IconArrowRight size={11} /></span></div>
        </div>

        <div className="pdl-logout" onClick={() => { logout(); router.push('/'); }}>sair da conta</div>

        <div style={{ marginTop: 24, padding: '14px 22px 24px', fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Conta vinculada ao Google · {user.since}
        </div>
      </div>
    </div>
  );
}
