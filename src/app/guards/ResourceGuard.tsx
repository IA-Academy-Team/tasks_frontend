import type { PropsWithChildren } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  canAccessResource,
  type FrontendResource,
} from "../../modules/auth/lib/access-policy";
import { getDefaultRouteForRole } from "../../modules/auth/lib/auth-routing";

interface ResourceGuardProps extends PropsWithChildren {
  resource: FrontendResource;
}

export function ResourceGuard({ resource, children }: ResourceGuardProps) {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessResource(user.role, resource)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

