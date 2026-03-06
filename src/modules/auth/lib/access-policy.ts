import type { AuthRole } from "../api/auth.api";

export type FrontendResource =
  | "dashboard"
  | "projects"
  | "projectBoard"
  | "profile"
  | "members";

const ROLE_POLICIES: Record<AuthRole, FrontendResource[]> = {
  admin: ["dashboard", "projects", "projectBoard", "profile", "members"],
  employee: ["dashboard", "projects", "projectBoard", "profile"],
};

export const getAllowedResources = (role: AuthRole): FrontendResource[] =>
  ROLE_POLICIES[role];

export const canAccessResource = (
  role: AuthRole,
  resource: FrontendResource,
): boolean => ROLE_POLICIES[role].includes(resource);
