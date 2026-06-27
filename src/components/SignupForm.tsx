'use client';

import { useState } from 'react';
import { createClient } from '@/lib/auth';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign up with email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-8),
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (authError) throw authError;

      // Create profile
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: name,
        });

        if (profileError) throw profileError;
      }

      // Redirect to perfil
      window.location.href = '/perfil';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="text"
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ padding: '10px', borderRadius: 4, border: '1px solid #ccc' }}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ padding: '10px', borderRadius: 4, border: '1px solid #ccc' }}
      />
      {error && <div style={{ color: 'red', fontSize: 12 }}>{error}</div>}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px',
          background: loading ? '#ccc' : '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Criando...' : 'Criar Conta'}
      </button>
    </form>
  );
}
