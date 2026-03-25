import { api, API_PREFIX } from "../../../shared/api/api";

export type ProjectStatusFilter = "all" | "active" | "closed";
export type ProjectStatusUpdate = "active" | "closed";
export type MembershipStatusFilter = "all" | "active" | "inactive";

export interface ProjectSummary {
  id: number;
  areaId: number | null;
  areaName: string;
  projectStatusId: number;
  status: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  closedAt: string | null;
  activeMemberCount: number;
  totalTaskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMembership {
  id: number;
  projectId: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  employeeIsActive: boolean;
  currentAreaId: number | null;
  currentAreaName: string | null;
  assignedByUserId: number;
  endedByUserId: number | null;
  assignedAt: string;
  unassignedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReassignMembershipResult {
  fromMembership: ProjectMembership;
  toMembership: ProjectMembership;
}

export interface ProjectsResponse {
  data: ProjectSummary[];
}

export interface ProjectResponse {
  data: ProjectSummary;
}

export interface DeleteProjectResponse {
  data: {
    id: number;
    mode: "deleted" | "archived";
  };
}

export interface ProjectMembershipsResponse {
  data: ProjectMembership[];
}

export interface ProjectMembershipResponse {
  data: ProjectMembership;
}

export interface ReassignProjectMembershipResponse {
  data: ReassignMembershipResult;
}

export interface CreateProjectPayload {
  areaId?: number | null;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateProjectPayload {
  areaId?: number | null;
  name?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateProjectStatusPayload {
  status: ProjectStatusUpdate;
  endDate?: string | null;
}

export interface AssignProjectMembershipPayload {
  employeeId: number;
}

export interface ReassignProjectMembershipPayload {
  toEmployeeId: number;
}

const withNullableDate = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const buildProjectsQuery = (params: {
  status: ProjectStatusFilter;
  areaId?: number;
}) => {
  const query = new URLSearchParams();
  query.set("status", params.status);
  if (params.areaId !== undefined) {
    query.set("areaId", String(params.areaId));
  }
  return query.toString();
};

export const listProjects = (params: { status: ProjectStatusFilter; areaId?: number }) =>
  api.get<ProjectsResponse>(`${API_PREFIX}/projects?${buildProjectsQuery(params)}`);

export const getProjectById = (projectId: number) =>
  api.get<ProjectResponse>(`${API_PREFIX}/projects/${projectId}`);

export const createProject = (payload: CreateProjectPayload) =>
  api.post<ProjectResponse>(`${API_PREFIX}/projects`, {
    areaId: payload.areaId ?? null,
    name: payload.name,
    description: payload.description ?? null,
    startDate: withNullableDate(payload.startDate),
    endDate: withNullableDate(payload.endDate),
  }, {
    toast: {
      successMessage: "Proyecto creado correctamente.",
      errorMessage: "No fue posible crear el proyecto.",
    },
  });

export const updateProject = (projectId: number, payload: UpdateProjectPayload) =>
  api.patch<ProjectResponse>(`${API_PREFIX}/projects/${projectId}`, {
    areaId: payload.areaId,
    name: payload.name,
    description: payload.description,
    startDate: withNullableDate(payload.startDate),
    endDate: withNullableDate(payload.endDate),
  }, {
    toast: {
      successMessage: "Proyecto actualizado correctamente.",
      errorMessage: "No fue posible actualizar el proyecto.",
    },
  });

export const updateProjectStatus = (projectId: number, payload: UpdateProjectStatusPayload) =>
  api.patch<ProjectResponse>(`${API_PREFIX}/projects/${projectId}/status`, {
    status: payload.status,
    endDate: withNullableDate(payload.endDate),
  }, {
    toast: {
      successMessage: "Estado del proyecto actualizado.",
      errorMessage: "No fue posible actualizar el estado del proyecto.",
    },
  });

export const deleteProject = (projectId: number) =>
  api.delete<DeleteProjectResponse>(`${API_PREFIX}/projects/${projectId}`, {
    toast: {
      successMessage: "Proyecto eliminado permanentemente.",
      errorMessage: "No fue posible eliminar el proyecto.",
    },
  });

export const listProjectMemberships = (
  projectId: number,
  status: MembershipStatusFilter = "all",
) => api.get<ProjectMembershipsResponse>(`${API_PREFIX}/projects/${projectId}/memberships?status=${status}`);

export const assignProjectMembership = (projectId: number, payload: AssignProjectMembershipPayload) =>
  api.post<ProjectMembershipResponse>(`${API_PREFIX}/projects/${projectId}/memberships`, payload, {
    toast: {
      successMessage: "Miembro asignado al proyecto.",
      errorMessage: "No fue posible asignar el miembro al proyecto.",
    },
  });

export const unassignProjectMembership = (projectId: number, membershipId: number) =>
  api.patch<ProjectMembershipResponse>(
    `${API_PREFIX}/projects/${projectId}/memberships/${membershipId}/unassign`,
    {},
    {
      toast: {
        successMessage: "Membresia desasignada correctamente.",
        errorMessage: "No fue posible desasignar la membresia.",
      },
    },
  );

export const reassignProjectMembership = (
  projectId: number,
  membershipId: number,
  payload: ReassignProjectMembershipPayload,
) => api.patch<ReassignProjectMembershipResponse>(
  `${API_PREFIX}/projects/${projectId}/memberships/${membershipId}/reassign`,
  payload,
  {
    toast: {
      successMessage: "Membresia reasignada correctamente.",
      errorMessage: "No fue posible reasignar la membresia.",
    },
  },
);
