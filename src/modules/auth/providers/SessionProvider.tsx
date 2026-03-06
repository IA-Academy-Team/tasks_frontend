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
  api,
  ApiError,
  AUTH_HANDLER_BASE_PATH,
} from "../../../shared/api/api";

type UnknownRecord = Record<string, unknown>;

export interface ServerSession {
  user: UnknownRecord;
  session: UnknownRecord;
}

interface SessionContextValue {
  session: ServerSession | null;
  isHydrating: boolean;
  hasServerSession: boolean;
  refreshSession: () => Promise<ServerSession | null>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

const parseServerSession = (value: unknown): ServerSession | null => {
  if (!isRecord(value)) return null;
  if (!isRecord(value.user) || !isRecord(value.session)) return null;

  return {
    user: value.user,
    session: value.session,
  };
};

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
      const response = await api.get<unknown>(`${AUTH_HANDLER_BASE_PATH}/get-session`);
      const nextSession = parseServerSession(response);

      startTransition(() => {
        setSession(nextSession);
      });

      return nextSession;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
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
