import type { PropsWithChildren } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { AuthRole } from "../../modules/auth/api/auth.api";

interface RoleGuardProps extends PropsWithChildren {
  allowedRoles: AuthRole[];
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
