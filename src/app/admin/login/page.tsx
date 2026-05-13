'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';

export default function AdminLoginPage() {
  const { login, isAuthenticated } = useAdmin();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace('/admin/produtos');
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(password);
    if (ok) {
      router.push('/admin/produtos');
    } else {
      setError(true);
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 400);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="adm-login">
      <form className="adm-login-box" onSubmit={handleSubmit}>
        <div className="adm-login-title">Pingo de Luz <em>· Admin</em></div>
        <div className="adm-login-sub">Entre com a senha de administrador.</div>
        <div className="adm-field" style={{ marginBottom: 8 }}>
          <label>Senha</label>
          <input
            ref={inputRef}
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            className={shake ? 'adm-shake' : ''}
            placeholder="••••••••"
          />
        </div>
        {error && <div className="adm-login-error">Senha incorreta. Tente novamente.</div>}
        <div style={{ marginTop: 20 }}>
          <button type="submit" className="adm-btn adm-btn-primary" style={{ width: '100%', padding: '10px' }}>
            Entrar
          </button>
        </div>
      </form>
    </div>
  );
}
