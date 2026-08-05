'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

export interface User {
  id: string;
  name: string;
  email: string;
  initial: string;
  avatarUrl?: string;
  /** "desde abril de 2024" — texto pronto para exibição. */
  since: string;
}

interface UserContextType {
  user: User | null;
  /** false enquanto a sessão ainda está sendo lida. */
  loading: boolean;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

function toUser(u: SupabaseUser): User {
  const meta = u.user_metadata ?? {};
  const name: string =
    meta.full_name || meta.name || u.email?.split('@')[0] || 'Visitante';

  return {
    id: u.id,
    name,
    email: u.email ?? '',
    initial: name.trim().charAt(0).toUpperCase() || '?',
    avatarUrl: meta.avatar_url,
    since: u.created_at
      ? `desde ${new Date(u.created_at).toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric',
        })}`
      : '',
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? toUser(data.user) : null);
      setLoading(false);
    });

    // Mantém o contexto em dia com login, logout e refresh de token
    // acontecendo em qualquer aba.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toUser(session.user) : null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await createClient().auth.signOut();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser precisa estar dentro de UserProvider');
  return ctx;
}
