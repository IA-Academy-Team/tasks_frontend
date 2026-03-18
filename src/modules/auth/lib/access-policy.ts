import type { AuthRole } from "../api/auth.api";

export type FrontendResource =
  | "dashboard"
  | "areas"
  | "employees"
  | "projects"
  | "standaloneTasks"
  | "projectBoard"
  | "profile";

const ROLE_POLICIES: Record<AuthRole, FrontendResource[]> = {
  admin: ["dashboard", "areas", "employees", "projects", "standaloneTasks", "projectBoard", "profile"],
  employee: ["dashboard", "projects", "standaloneTasks", "projectBoard", "profile"],
};

export const getAllowedResources = (role: AuthRole): FrontendResource[] =>
  ROLE_POLICIES[role];

export const canAccessResource = (
  role: AuthRole,
  resource: FrontendResource,
): boolean => ROLE_POLICIES[role].includes(resource);
