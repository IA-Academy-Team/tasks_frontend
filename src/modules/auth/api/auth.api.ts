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

interface RequestPasswordResetResponse {
  status: boolean;
  message: string;
}

interface ResetPasswordResponse {
  status: boolean;
}

export const signInWithEmail = (email: string, password: string) =>
  api.post<SignInEmailResponse>(`${AUTH_HANDLER_BASE_PATH}/sign-in/email`, {
    email,
    password,
    rememberMe: true,
  }, {
    toast: {
      successMessage: "Inicio de sesion exitoso.",
      showError: false,
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

export const requestPasswordReset = (email: string, redirectTo: string) =>
  api.post<RequestPasswordResetResponse>(`${AUTH_HANDLER_BASE_PATH}/request-password-reset`, {
    email,
    redirectTo,
  }, {
    toast: {
      showSuccess: false,
      showError: false,
    },
  });

export const resetPassword = (token: string, newPassword: string) =>
  api.post<ResetPasswordResponse>(`${AUTH_HANDLER_BASE_PATH}/reset-password`, {
    token,
    newPassword,
  }, {
    toast: {
      showSuccess: false,
      showError: false,
    },
  });
