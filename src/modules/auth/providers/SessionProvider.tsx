import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  ApiError,
} from "../../../shared/api/api";
import {
  getCurrentSession,
  type AuthenticatedSession,
  type AuthenticatedUser,
} from "../api/auth.api";

export interface ServerSession {
  user: AuthenticatedUser;
  session: AuthenticatedSession;
}

interface SessionContextValue {
  session: ServerSession | null;
  isHydrating: boolean;
  hasServerSession: boolean;
  refreshSession: () => Promise<ServerSession | null>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<ServerSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  const clearSession = () => {
    startTransition(() => {
      setSession(null);
    });
  };

  const refreshSession = async () => {
    try {
      const response = await getCurrentSession();
      const nextSession = response?.data ?? null;

      startTransition(() => {
        setSession(nextSession);
      });

      return nextSession;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error("Unable to bootstrap server session", error);
      }

      startTransition(() => {
        setSession(null);
      });

      return null;
    } finally {
      startTransition(() => {
        setIsHydrating(false);
      });
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isHydrating,
      hasServerSession: Boolean(session),
      refreshSession,
      clearSession,
    }),
    [isHydrating, session],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
