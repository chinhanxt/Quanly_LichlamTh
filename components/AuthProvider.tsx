'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSessionUser } from '@/types/user';

interface AuthContextType {
  user: AuthSessionUser | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  switchAccount: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const LAST_USER_KEY = 'last_username';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (password: string) => {
    const hint = typeof window !== 'undefined' ? localStorage.getItem(LAST_USER_KEY) || '' : '';
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, hint }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Đăng nhập thất bại');
    }
    localStorage.setItem(LAST_USER_KEY, data.user.username);
    setUser(data.user);
  };

  const switchAccount = async (username: string) => {
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Không đổi được tài khoản');
    }
    localStorage.setItem(LAST_USER_KEY, data.user.username);
    setUser(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Đổi mật khẩu thất bại');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, switchAccount, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
