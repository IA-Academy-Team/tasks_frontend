import type { AuthRole } from "../api/auth.api";

export const getDefaultRouteForRole = (role: AuthRole) =>
  role === "admin" ? "/app/admin/dashboard" : "/app/employee/dashboard";
