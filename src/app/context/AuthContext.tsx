import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { getUsers, createUser } from '../store';

const AUTH_KEY = 'tasks-auth-user';

interface AuthContextType {
  user: User | null;
  login: (usernameOrEmail: string, password: string) => boolean;
  logout: () => void;
  register: (data: { name: string; username: string; email: string; password: string }) => User | null;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as User;
        const users = getUsers();
        const found = users.find((u) => u.id === parsed.id);
        if (found) setUser(found);
        else setUser({ ...parsed, role: parsed.role ?? 'trabajador' });
      }
    } finally {
      setIsReady(true);
    }
  }, []);

  const login = useCallback((usernameOrEmail: string, password: string): boolean => {
    const users = getUsers();
    const found = users.find(
      (u) =>
        (u.username === usernameOrEmail || u.email === usernameOrEmail) && u.password === password
    );
    if (found) {
      setUser(found);
      localStorage.setItem(AUTH_KEY, JSON.stringify(found));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  const register = useCallback(
    (data: { name: string; username: string; email: string; password: string }): User | null => {
      const allUsers = getUsers();
      if (allUsers.some((u) => u.username === data.username || u.email === data.email)) {
        return null;
      }
      const newUser = createUser({
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        role: 'trabajador',
      });
      setUser(newUser);
      localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
      return newUser;
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
