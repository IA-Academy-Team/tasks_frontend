import type { PropsWithChildren } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

interface RoleGuardProps extends PropsWithChildren {
  allowedRoles: UserRole[];
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
