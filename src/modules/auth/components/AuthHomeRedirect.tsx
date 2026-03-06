import { Navigate } from "react-router";
import { useAuth } from "../../../app/context/AuthContext";
import { getDefaultRouteForRole } from "../lib/auth-routing";

export function AuthHomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
}
