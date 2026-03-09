import {
  api,
  AUTH_BASE_PATH,
  AUTH_HANDLER_BASE_PATH,
} from "../../../shared/api/api";

export type AuthRole = "admin" | "employee";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: AuthRole;
  roleId: number;
  isActive: boolean;
  emailVerified: boolean;
  phoneNumber: string | null;
  image: string | null;
}

export interface AuthenticatedSession {
  id: number;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface CurrentSessionResponse {
  authenticated: boolean;
  data: {
    session: AuthenticatedSession;
    user: AuthenticatedUser;
  } | null;
}

interface SignInEmailResponse {
  token: string;
  redirect: boolean;
  url?: string;
  user: Record<string, unknown>;
}

export const signInWithEmail = (email: string, password: string) =>
  api.post<SignInEmailResponse>(`${AUTH_HANDLER_BASE_PATH}/sign-in/email`, {
    email,
    password,
    rememberMe: true,
  }, {
    toast: {
      successMessage: "Inicio de sesion exitoso.",
      errorMessage: "No fue posible iniciar sesion.",
    },
  });

export const signOutCurrentSession = () =>
  api.post(`${AUTH_HANDLER_BASE_PATH}/sign-out`, undefined, {
    toast: {
      successMessage: "Sesion cerrada correctamente.",
      errorMessage: "No fue posible cerrar sesion.",
    },
  });

export const getCurrentSession = () =>
  api.get<CurrentSessionResponse>(`${AUTH_BASE_PATH}/session`);
