'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  name: string;
  email: string;
  initial: string;
  since: string;
}

interface UserContextType {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const MOCK_USER: User = {
  name: 'Marina Vasques',
  email: 'marina.vasques@gmail.com',
  initial: 'M',
  since: 'desde abril de 2024',
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (u: User) => setUser(u);
  const logout = () => setUser(null);

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
