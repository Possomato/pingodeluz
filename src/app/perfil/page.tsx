'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import PdlImg from '@/components/PdlImg';
import { IconChevronLeft, IconBag, IconGoogle, IconArrowRight } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { getAddressesAction, saveAddressAction, deleteAddressAction, type Address } from '@/app/actions/addresses';

function PerfilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cartCount } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'Casa', zip: '', street: '', complement: '', neighborhood: '', city: '', state: '' });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    getAddressesAction().then(setAddresses);
  }, [user]);

  const handleGoogle = async () => {
    setSigningIn(true);
    const redirect = searchParams.get('redirect') ?? '/perfil';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirect}`,
      },
    });
    // Page will redirect; no need to setSigningIn(false)
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return null;
  }

  const userName = user?.user_metadata?.full_name ?? user?.email ?? 'Cliente';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const userInitial = userName.charAt(0).toUpperCase();

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
          <div className="pdl-login-logo" style={{ maxWidth: '200px', width: '100%', height: 'auto' }}>
            <Image
              src="/logo-transparente.png"
              alt="Pingo de Luz"
              width={200}
              height={100}
              priority
              style={{ width: '100%', height: 'auto' }}
            />
          </div>

          <h2 className="pdl-login-welcome">Bem-vinda <em>de volta.</em></h2>
          <div className="pdl-login-sub">
            Entre para ver seus pedidos, salvar endereços e acompanhar as peças favoritas.
          </div>

          <button className="pdl-google-btn" onClick={handleGoogle} disabled={signingIn}>
            {signingIn ? (
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
          <div className="pdl-profile-avatar">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={userName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              userInitial
            )}
          </div>
          <div className="pdl-profile-info">
            <div className="greeting">olá, mãe</div>
            <div className="name">{userName}</div>
            <div className="email">{user.email}</div>
          </div>
        </div>

        <div className="pdl-profile-stats">
          <div className="pdl-stat"><div className="v">0</div><div className="l">pedidos</div></div>
          <div className="pdl-stat"><div className="v">0</div><div className="l">favoritos</div></div>
          <div className="pdl-stat"><div className="v">0</div><div className="l">endereços</div></div>
        </div>

        <div className="pdl-profile-section">
          <h3><span>Meus <em>endereços</em></span></h3>
          {addresses.map(a => (
            <div key={a.id} style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--cream-warm)', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.05 }}>{a.label}</div>
              <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                {a.street}{a.complement ? `, ${a.complement}` : ''}<br />
                {a.neighborhood} · {a.city}/{a.state} · {a.zip}
              </div>
              <button
                onClick={async () => {
                  await deleteAddressAction(a.id);
                  setAddresses(prev => prev.filter(x => x.id !== a.id));
                }}
                style={{ marginTop: 6, fontSize: 11, color: 'var(--terra)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                remover
              </button>
            </div>
          ))}

          {!showAddrForm && (
            <button
              onClick={() => setShowAddrForm(true)}
              style={{ marginTop: 8, fontSize: 13, fontFamily: 'var(--editorial)', fontStyle: 'italic', color: 'var(--terra)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
              + adicionar endereço
            </button>
          )}

          {showAddrForm && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['label', 'zip', 'street', 'complement', 'neighborhood', 'city', 'state'] as const).map(field => (
                <div key={field}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>{field}</div>
                  <input
                    value={newAddr[field]}
                    onChange={e => setNewAddr(prev => ({ ...prev, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={async () => {
                    await saveAddressAction(newAddr);
                    const updated = await getAddressesAction();
                    setAddresses(updated);
                    setShowAddrForm(false);
                    setNewAddr({ label: 'Casa', zip: '', street: '', complement: '', neighborhood: '', city: '', state: '' });
                  }}
                  style={{ padding: '10px 16px', background: 'var(--ink)', color: 'var(--cream-warm)', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'var(--sans)', border: 'none', cursor: 'pointer' }}>
                  salvar endereço
                </button>
                <button
                  onClick={() => setShowAddrForm(false)}
                  style={{ padding: '10px 16px', background: 'none', color: 'var(--muted)', borderRadius: 999, fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
                  cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pdl-profile-section">
          <h3><span>Meus <em>pedidos</em></span><span className="action">ver todos</span></h3>
          <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Seus pedidos aparecerão aqui.</div>
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

        <div className="pdl-logout" onClick={handleLogout}>sair da conta</div>

        <div style={{ marginTop: 24, padding: '14px 22px 24px', fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Conta vinculada ao Google
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense>
      <PerfilContent />
    </Suspense>
  );
}
