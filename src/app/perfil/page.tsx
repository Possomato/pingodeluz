'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import ProductCard from '@/components/ProductCard';
import LoginPanel from '@/components/LoginPanel';
import HeartButton from '@/components/HeartButton';
import { IconArrowRight } from '@/components/Icons';
import { formatCEP, isValidCEP, fetchCEPData, extractAddressFromCEP } from '@/lib/cep';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { getAddressesAction, saveAddressAction, deleteAddressAction, type Address } from '@/app/actions/addresses';
import { formatCentavos } from '@/lib/money';
import { getFavoriteProductsAction } from '@/app/actions/favorites';
import { getMyOrdersAction, type Order } from '@/app/actions/orders';
import type { Product } from '@/lib/data';

/** Status do banco → rótulo em português e classe do chip. */
const ORDER_STATUS: Record<string, { label: string; kind: string }> = {
  pendente: { label: 'aguardando pagamento', kind: 'pendente' },
  pago: { label: 'pagamento confirmado', kind: 'pago' },
  enviado: { label: 'em trânsito', kind: 'transit' },
  entregue: { label: 'entregue', kind: 'entregue' },
  cancelado: { label: 'cancelado', kind: 'cancelado' },
  recusado: { label: 'pagamento recusado', kind: 'cancelado' },
  reembolsado: { label: 'reembolsado', kind: 'cancelado' },
};

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EMPTY_ADDR = { label: 'Casa', zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
type AddrForm = typeof EMPTY_ADDR;

function PerfilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof AddrForm, boolean>>>({});
  const [newAddr, setNewAddr] = useState<AddrForm>(EMPTY_ADDR);
  const [favoritedProducts, setFavoritedProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Precisa ser o mesmo client do LoginPanel, senão o onAuthStateChange
  // daqui não dispara quando o login por código conclui. Ver lib/supabase.
  const supabase = createClient();

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

  useEffect(() => {
    if (!user) return;
    getFavoriteProductsAction()
      .then(setFavoritedProducts)
      .catch(() => setFavoritedProducts([]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getMyOrdersAction()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const setField = (k: keyof AddrForm, v: string) => {
    setNewAddr(prev => ({ ...prev, [k]: v }));
    setValidationErrors(prev => ({ ...prev, [k]: false }));
  };

  const handleCEPChange = async (value: string) => {
    const formatted = formatCEP(value);
    setField('zip', formatted);
    setCepError(null);

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
    setValidationErrors(prev => ({ ...prev, street: false, neighborhood: false, city: false, state: false }));
    document.getElementById('addr-number')?.focus();
  };

  const saveNewAddress = async () => {
    const errors: Partial<Record<keyof AddrForm, boolean>> = {};
    if (!newAddr.label.trim()) errors.label = true;
    if (!newAddr.zip.trim() || cepError || !isValidCEP(newAddr.zip)) errors.zip = true;
    if (!newAddr.street.trim()) errors.street = true;
    if (!newAddr.number.trim()) errors.number = true;
    if (!newAddr.neighborhood.trim()) errors.neighborhood = true;
    if (!newAddr.city.trim()) errors.city = true;
    if (!newAddr.state.trim()) errors.state = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setSaving(true);
    try {
      await saveAddressAction(newAddr);
      const updated = await getAddressesAction();
      setAddresses(updated);
      setShowAddrForm(false);
      setNewAddr(EMPTY_ADDR);
      setCepError(null);
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveName = async () => {
    if (!editingName.trim()) return;
    const { error } = await supabase.auth.updateUser({ data: { full_name: editingName.trim() } });
    if (!error) {
      setUser(u => u ? { ...u, user_metadata: { ...u.user_metadata, full_name: editingName.trim() } } : null);
      setShowEditName(false);
    }
  };

  if (loading) {
    return <PageWrapper footer={false}><div style={{ minHeight: '60vh' }} /></PageWrapper>;
  }

  if (!user) {
    // Sem `redirect` explícito, o login termina na home. Quem veio do
    // checkout continua voltando para lá.
    return (
      <PageWrapper>
        <LoginPanel redirectTo={searchParams.get('redirect') ?? '/'} />
      </PageWrapper>
    );
  }

  const userName = user.user_metadata?.full_name ?? user.email ?? 'Cliente';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const userInitial = userName.charAt(0).toUpperCase();
  const provider = user.app_metadata?.provider;

  const addrField = (id: keyof AddrForm, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="pdl-field-group">
      <label className="pdl-field-label" htmlFor={`addr-${id}`}>{label}</label>
      <input
        id={`addr-${id}`}
        className={`pdl-field${validationErrors[id] ? ' pdl-field--error' : ''}`}
        value={newAddr[id]}
        onChange={e => setField(id, e.target.value)}
        aria-invalid={!!validationErrors[id]}
        {...extra}
      />
    </div>
  );

  return (
    <PageWrapper>
      <div className="pdl-profile">
        <div className="pdl-profile-hero">
          <div className="pdl-profile-avatar">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            className="pdl-link"
            onClick={() => { setShowEditName(true); setEditingName(userName); }}
          >
            alterar meu nome
          </button>
        </div>

        <section className="pdl-profile-section">
          <h3><span>Meus <em>pedidos</em></span></h3>
          {ordersLoading ? (
            <div className="pdl-profile-empty">Carregando…</div>
          ) : orders.length === 0 ? (
            <div className="pdl-profile-empty">
              Você ainda não fez nenhum pedido. <Link href="/" className="pdl-link">Ver a coleção</Link>
            </div>
          ) : (
            <div>
              {orders.map(order => {
                const qty = order.items.reduce((n, i) => n + i.qty, 0);
                return (
                  <button
                    key={order.id}
                    className="pdl-order-card"
                    onClick={() => router.push(`/pedido/${order.id}`)}
                  >
                    <div className="top">
                      <span className="num">{order.orderNumber}</span>
                      <span className={`pdl-order-status ${ORDER_STATUS[order.status]?.kind ?? ''}`}>
                        {ORDER_STATUS[order.status]?.label ?? order.status}
                      </span>
                    </div>
                    <div className="desc">{order.items.map(i => i.name).join(' + ') || 'Pedido'}</div>
                    <div className="bot">
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}
                        {qty} {qty === 1 ? 'peça' : 'peças'}
                      </span>
                      <span className="total">{formatCentavos(order.totalCentavos)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="pdl-profile-section">
          <h3>
            <span>Meus <em>endereços</em></span>
            {!showAddrForm && (
              <button className="pdl-link" onClick={() => setShowAddrForm(true)}>+ adicionar</button>
            )}
          </h3>
          {addresses.length === 0 && !showAddrForm && (
            <div className="pdl-profile-empty">Nenhum endereço salvo ainda. Você também pode salvar um durante a compra.</div>
          )}
          {addresses.map(a => (
            <div key={a.id} className="pdl-address-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <div className="label">{a.label}</div>
                <button
                  className="pdl-cart-item-remove"
                  onClick={async () => {
                    await deleteAddressAction(a.id);
                    setAddresses(prev => prev.filter(x => x.id !== a.id));
                  }}
                >
                  remover
                </button>
              </div>
              <div className="body">
                {a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ''}<br />
                {a.neighborhood} · {a.city}/{a.state} · CEP {a.zip}
              </div>
            </div>
          ))}

          {showAddrForm && (
            <div className="pdl-address-form">
              <div className="pdl-form-row two">
                {addrField('label', 'nome do endereço', { placeholder: 'Casa, trabalho…' })}
                <div className="pdl-field-group">
                  <label className="pdl-field-label" htmlFor="addr-zip">
                    CEP {cepLoading && <span className="hint">buscando…</span>}
                  </label>
                  <input
                    id="addr-zip"
                    className={`pdl-field${validationErrors.zip || cepError ? ' pdl-field--error' : ''}`}
                    value={newAddr.zip}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    onChange={e => handleCEPChange(e.target.value)}
                    onBlur={() => { if (newAddr.zip && !isValidCEP(newAddr.zip)) setCepError('CEP inválido'); }}
                  />
                  {cepError && <span className="pdl-field-error">{cepError}</span>}
                </div>
              </div>
              <div className="pdl-form-row street">
                {addrField('street', 'endereço', { autoComplete: 'address-line1' })}
                {addrField('number', 'número', { inputMode: 'numeric' })}
              </div>
              <div className="pdl-form-row two">
                {addrField('complement', 'complemento', { placeholder: 'opcional' })}
                {addrField('neighborhood', 'bairro')}
              </div>
              <div className="pdl-form-row cep">
                {addrField('city', 'cidade', { autoComplete: 'address-level2' })}
                <div className="pdl-field-group">
                  <label className="pdl-field-label" htmlFor="addr-state">UF</label>
                  <select
                    id="addr-state"
                    className={`pdl-field${validationErrors.state ? ' pdl-field--error' : ''}`}
                    value={newAddr.state}
                    onChange={e => setField('state', e.target.value)}
                  >
                    <option value="">—</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              {Object.values(validationErrors).some(Boolean) && (
                <div className="pdl-field-error">Confira os campos destacados.</div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="pdl-btn pdl-btn--primary" onClick={saveNewAddress} disabled={saving}>
                  {saving ? 'salvando…' : 'salvar endereço'}
                </button>
                <button className="pdl-btn pdl-btn--ghost" onClick={() => { setShowAddrForm(false); setCepError(null); setValidationErrors({}); }}>
                  cancelar
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="pdl-profile-section">
          <h3><span>Meus <em>favoritos</em></span></h3>
          {favoritedProducts.length === 0 ? (
            <div className="pdl-profile-empty">Toque no coração de uma peça para guardá-la aqui.</div>
          ) : (
            <div className="pdl-fav-grid">
              {favoritedProducts.map(product => (
                <ProductCard key={product.id} p={product}>
                  <div className="pdl-prod-fav" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                    <HeartButton
                      productId={product.id}
                      initialFavorited={true}
                      onToggle={(newState) => {
                        // Desfavoritar tira o card da lista na hora.
                        if (!newState) setFavoritedProducts(prev => prev.filter(p => p.id !== product.id));
                      }}
                    />
                  </div>
                </ProductCard>
              ))}
            </div>
          )}
        </section>

        <section className="pdl-profile-section">
          <h3><span>Ajuda</span></h3>
          <a className="pdl-profile-row" href="mailto:atendimento@pingodeluz.com"><span>Falar com a gente</span><span className="meta">e-mail <IconArrowRight size={11} /></span></a>
          <Link className="pdl-profile-row" href="/trocas"><span>Envio, trocas e devoluções</span><span className="meta"><IconArrowRight size={11} /></span></Link>
          <Link className="pdl-profile-row" href="/privacidade"><span>Privacidade</span><span className="meta"><IconArrowRight size={11} /></span></Link>
        </section>

        {showEditName && (
          <div className="pdl-modal-backdrop" onClick={() => setShowEditName(false)}>
            <div className="pdl-modal" role="dialog" aria-modal="true" aria-label="Alterar nome" onClick={e => e.stopPropagation()}>
              <h3>Como quer ser <em style={{ fontStyle: 'italic', fontWeight: 400 }}>chamada?</em></h3>
              <input
                type="text"
                className="pdl-field"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                placeholder="Seu nome"
                autoFocus
              />
              <div className="pdl-modal-actions">
                <button className="pdl-btn pdl-btn--primary" style={{ flex: 1 }} onClick={saveName}>salvar</button>
                <button className="pdl-btn pdl-btn--ghost" style={{ flex: 1 }} onClick={() => setShowEditName(false)}>cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button className="pdl-logout" onClick={handleLogout} style={{ margin: 0 }}>sair da conta</button>
          <div className="pdl-profile-empty" style={{ marginTop: 8 }}>
            {provider === 'google' ? 'Conta vinculada ao Google' : 'Entrada por código no e-mail'}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function PerfilPage() {
  return (
    <Suspense>
      <PerfilContent />
    </Suspense>
  );
}
