'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import PdlHeader from '@/components/PdlHeader';
import PdlFooter from '@/components/PdlFooter';
import { IconChevronLeft, IconBag, IconGoogle, IconArrowRight } from '@/components/Icons';
import { useCart } from '@/context/CartContext';
import { formatCEP, isValidCEP, fetchCEPData, extractAddressFromCEP } from '@/lib/cep';
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
  const [showMenu, setShowMenu] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [validCEP, setValidCEP] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState({ label: 'Casa', zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });

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

  const handleCEPChange = async (value: string) => {
    const formatted = formatCEP(value);
    setNewAddr(prev => ({ ...prev, zip: formatted }));
    setCepError(null);
    setValidCEP(null);

    if (!isValidCEP(formatted)) {
      if (formatted.length === 8 || (formatted.length === 9 && formatted.includes('-'))) {
        setCepError('CEP inválido');
      }
      return;
    }

    setCepLoading(true);
    const data = await fetchCEPData(formatted);
    setCepLoading(false);

    if (!data) {
      setCepError('CEP não encontrado');
      return;
    }

    const extracted = extractAddressFromCEP(data);
    setNewAddr(prev => ({
      ...prev,
      street: extracted.street,
      neighborhood: extracted.neighborhood,
      city: extracted.city,
      state: extracted.state,
    }));
    setValidCEP(formatted);
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
          <div style={{ maxWidth: '200px', margin: '0 auto 6px', width: '100%' }}>
            <Image
              src="/logo-transparente.png"
              alt="Pingo de Luz"
              width={200}
              height={100}
              priority
              style={{ width: '100%', height: 'auto', display: 'block' }}
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
      <PdlHeader scrolled={scrolled} onMenu={() => setShowMenu(!showMenu)} />

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
          <button
            onClick={() => {
              setShowEditName(true);
              setEditingName(userName);
            }}
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontFamily: 'var(--editorial)',
              fontStyle: 'italic',
              color: 'var(--terra)',
              background: 'none',
              border: 'none',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Alterar meu nome
          </button>
        </div>

        <div className="pdl-profile-section">
          <h3><span>Meus <em>endereços</em></span></h3>
          {addresses.map(a => (
            <div key={a.id} style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--cream-warm)', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.05 }}>{a.label}</div>
              <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                {a.street}, {a.number}{a.complement ? ` - ${a.complement}` : ''}<br />
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
              {/* Rótulo */}
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Rótulo</div>
                <input
                  value={newAddr.label}
                  onChange={e => setNewAddr(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="Casa, Trabalho, etc"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* CEP */}
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>CEP</div>
                <input
                  value={newAddr.zip}
                  onChange={e => handleCEPChange(e.target.value)}
                  onBlur={() => {
                    if (newAddr.zip && !isValidCEP(newAddr.zip)) {
                      setCepError('CEP inválido');
                    }
                  }}
                  placeholder="00000-000"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: `1px solid ${cepError ? 'red' : 'var(--border)'}`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'var(--sans)',
                  }}
                />
                {cepLoading && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Buscando...</div>}
                {cepError && <div style={{ fontSize: 12, color: 'red', marginTop: 4 }}>{cepError}</div>}
              </div>

              {/* Logradouro */}
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Logradouro</div>
                <input
                  value={newAddr.street}
                  onChange={e => setNewAddr(prev => ({ ...prev, street: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* Número */}
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Número</div>
                <input
                  value={newAddr.number}
                  onChange={e => setNewAddr(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="Ex: 123"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* Complemento */}
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Complemento (opcional)</div>
                <input
                  value={newAddr.complement}
                  onChange={e => setNewAddr(prev => ({ ...prev, complement: e.target.value }))}
                  placeholder="Apto, Sala, etc"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* Bairro */}
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Bairro</div>
                <input
                  value={newAddr.neighborhood}
                  onChange={e => setNewAddr(prev => ({ ...prev, neighborhood: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* Cidade */}
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Cidade</div>
                <input
                  value={newAddr.city}
                  onChange={e => setNewAddr(prev => ({ ...prev, city: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* Estado */}
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.05, color: 'var(--muted)', marginBottom: 3 }}>Estado (sigla)</div>
                <input
                  value={newAddr.state}
                  onChange={e => setNewAddr(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                  placeholder="SP"
                  maxLength={2}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--sans)' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={async () => {
                    if (!validCEP || cepError) {
                      setCepError('CEP inválido');
                      return;
                    }
                    await saveAddressAction(newAddr);
                    const updated = await getAddressesAction();
                    setAddresses(updated);
                    setShowAddrForm(false);
                    setNewAddr({ label: 'Casa', zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
                    setCepError(null);
                    setValidCEP(null);
                  }}
                  disabled={!validCEP || !!cepError}
                  style={{
                    padding: '10px 16px',
                    background: !validCEP || cepError ? '#ccc' : 'var(--ink)',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--sans)',
                    border: 'none',
                    cursor: !validCEP || cepError ? 'not-allowed' : 'pointer',
                  }}>
                  Salvar endereço
                </button>
                <button
                  onClick={() => {
                    setShowAddrForm(false);
                    setCepError(null);
                    setValidCEP(null);
                  }}
                  style={{ padding: '10px 16px', background: 'none', color: 'var(--muted)', borderRadius: 999, fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
                  Cancelar
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
          <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Suas peças favoritas aparecerão aqui.</div>
        </div>

        <div className="pdl-profile-section" style={{ paddingTop: 16 }}>
          <h3><span>Ajuda</span></h3>
          <div className="pdl-profile-row"><span className="lbl">Falar com a gente</span><span className="meta">WhatsApp</span></div>
          <div className="pdl-profile-row"><span className="lbl">Trocas e devoluções</span><span className="meta"><IconArrowRight size={11} /></span></div>
          <div className="pdl-profile-row"><span className="lbl">Guia de tamanhos</span><span className="meta"><IconArrowRight size={11} /></span></div>
        </div>

        {showEditName && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 320,
              width: '90%',
            }}>
              <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Alterar nome</h3>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Seu nome"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 14,
                  marginBottom: 16,
                  fontFamily: 'var(--sans)',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    if (editingName.trim()) {
                      const { error } = await supabase.auth.updateUser({
                        data: { full_name: editingName },
                      });
                      if (!error) {
                        setUser(u => u ? { ...u, user_metadata: { ...u.user_metadata, full_name: editingName } } : null);
                        setShowEditName(false);
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--ink)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => setShowEditName(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--cream-warm)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, marginBottom: 24, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pdl-logout" onClick={handleLogout} style={{ display: 'block !important', width: 'fit-content !important', margin: '0 auto 12px !important' }}>sair da conta</div>
          <div style={{ fontFamily: 'var(--editorial)', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)' }}>
            Conta vinculada ao Google
          </div>
        </div>
      </div>

      <PdlFooter />
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
