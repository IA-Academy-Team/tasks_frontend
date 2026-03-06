import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  signInWithEmail,
  signOutCurrentSession,
  type AuthenticatedUser,
} from "../../modules/auth/api/auth.api";
import { useSession } from "../../modules/auth/providers/SessionProvider";

interface AuthContextType {
  user: AuthenticatedUser | null;
  login: (email: string, password: string) => Promise<AuthenticatedUser | null>;
  logout: () => Promise<void>;
  register: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<null>;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { session, isHydrating, refreshSession, clearSession } = useSession();

  const value = useMemo<AuthContextType>(() => ({
    user: session?.user ?? null,
    isReady: !isHydrating,
    login: async (email: string, password: string) => {
      await signInWithEmail(email, password);
      const currentSession = await refreshSession();
      return currentSession?.user ?? null;
    },
    logout: async () => {
      try {
        await signOutCurrentSession();
      } finally {
        clearSession();
      }
    },
    register: async () => null,
  }), [clearSession, isHydrating, refreshSession, session]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
