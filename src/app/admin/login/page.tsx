'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { checkIsAdminAction } from '@/app/actions/admin-session';

/**
 * Entrada do painel via Supabase Auth.
 *
 * A versão anterior comparava a senha contra uma constante no próprio
 * bundle do navegador (uma constante `ADMIN_PASSWORD`) e guardava um
 * booleano no localStorage. Qualquer visitante lia a senha no código-
 * fonte e qualquer visitante podia forjar o booleano.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Já logado e administrador? Vai direto para o painel.
  useEffect(() => {
    if (loading || !user) return;
    checkIsAdminAction().then((isAdmin) => {
      if (isAdmin) router.replace('/admin/dashboard');
      else setError('Esta conta não tem acesso ao painel.');
    });
  }, [user, loading, router]);

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('E-mail ou senha incorretos.');
      setBusy(false);
      return;
    }

    if (await checkIsAdminAction()) {
      router.replace('/admin/dashboard');
    } else {
      await supabase.auth.signOut();
      setError('Esta conta não tem acesso ao painel.');
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin/dashboard` },
    });
  };

  return (
    <div className="adm-login">
      <form className="adm-login-box" onSubmit={signInWithPassword}>
        <div className="adm-login-title">Pingo de Luz <em>· Admin</em></div>
        <div className="adm-login-sub">Entre com sua conta de administrador.</div>

        <div className="adm-field" style={{ marginBottom: 8 }}>
          <label htmlFor="adm-email">E-mail</label>
          <input
            id="adm-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
          />
        </div>

        <div className="adm-field" style={{ marginBottom: 8 }}>
          <label htmlFor="adm-pass">Senha</label>
          <input
            id="adm-pass"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
          />
        </div>

        {error && <div className="adm-login-error" role="alert">{error}</div>}

        <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
          <button
            type="submit"
            className="adm-btn adm-btn-primary"
            style={{ width: '100%', padding: '10px' }}
            disabled={busy}
          >
            {busy ? 'entrando…' : 'Entrar'}
          </button>
          <button
            type="button"
            className="adm-btn"
            style={{ width: '100%', padding: '10px' }}
            onClick={signInWithGoogle}
          >
            Entrar com Google
          </button>
        </div>
      </form>
    </div>
  );
}
