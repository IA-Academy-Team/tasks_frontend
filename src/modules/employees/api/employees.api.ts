import { api, API_PREFIX } from "../../../shared/api/api";

export type EmployeeStatusFilter = "all" | "active" | "inactive";

export interface EmployeeSummary {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: "admin" | "employee";
  roleId: number;
  isActive: boolean;
  emailVerified: boolean;
  phoneNumber: string | null;
  image: string | null;
  employeeStatusId: number;
  employeeStatus: string;
  deactivatedAt: string | null;
  currentAreaId: number | null;
  currentAreaName: string | null;
  areaIds: number[];
  areaNames: string[];
  assignedAreaIds: number[];
  assignedAreaNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeResponse {
  data: EmployeeSummary;
}

export interface EmployeesResponse {
  data: EmployeeSummary[];
}

export interface EmployeeAreaAssignment {
  id: number;
  employeeId: number;
  areaId: number;
  areaName: string;
  assignedByUserId: number;
  endedByUserId: number | null;
  assignedAt: string;
  endedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeProjectMembership {
  id: number;
  employeeId: number;
  projectId: number;
  projectName: string;
  projectStatus: string;
  projectAreaId: number;
  projectAreaName: string;
  assignedByUserId: number;
  endedByUserId: number | null;
  assignedAt: string;
  unassignedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeAreaAssignmentsResponse {
  data: EmployeeAreaAssignment[];
}

export interface EmployeeAreaAssignmentResponse {
  data: EmployeeAreaAssignment;
}

export interface EmployeeProjectMembershipsResponse {
  data: EmployeeProjectMembership[];
}

export interface DeleteEmployeeResponse {
  data: {
    id: number;
    mode: "deleted" | "archived";
  };
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  isActive?: boolean;
}

export interface UpdateEmployeePayload {
  name?: string;
  password?: string;
  phoneNumber?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

export interface UpdateEmployeeStatusPayload {
  isActive: boolean;
}

export interface AssignEmployeeAreaPayload {
  areaId: number;
}

export interface UnassignEmployeeAreaPayload {
  areaId?: number;
}

export const listEmployees = (status: EmployeeStatusFilter) =>
  api.get<EmployeesResponse>(`${API_PREFIX}/employees?status=${status}`);

export const createEmployee = (payload: CreateEmployeePayload) =>
  api.post<EmployeeResponse>(`${API_PREFIX}/employees`, payload, {
    toast: {
      successMessage: "Empleado creado correctamente.",
    },
  });

export const updateEmployee = (employeeId: number, payload: UpdateEmployeePayload) =>
  api.patch<EmployeeResponse>(`${API_PREFIX}/employees/${employeeId}`, payload, {
    toast: {
      successMessage: "Empleado actualizado correctamente.",
      errorMessage: "No fue posible actualizar el empleado.",
    },
  });

export const updateEmployeeStatus = (
  employeeId: number,
  payload: UpdateEmployeeStatusPayload,
) => api.patch<EmployeeResponse>(`${API_PREFIX}/employees/${employeeId}/status`, payload, {
  toast: {
    successMessage: payload.isActive ? "Empleado activado correctamente." : "Empleado desactivado correctamente.",
    errorMessage: "No fue posible actualizar el estado del empleado.",
  },
});

export const listEmployeeAreaAssignments = (
  employeeId: number,
  status: EmployeeStatusFilter = "all",
) => api.get<EmployeeAreaAssignmentsResponse>(
  `${API_PREFIX}/employees/${employeeId}/area-assignments?status=${status}`,
);

export const assignEmployeeArea = (
  employeeId: number,
  payload: AssignEmployeeAreaPayload,
) => api.post<EmployeeAreaAssignmentResponse>(
  `${API_PREFIX}/employees/${employeeId}/area-assignments`,
  payload,
  {
    toast: {
      successMessage: "Area asignada correctamente.",
      errorMessage: "No fue posible asignar el area.",
    },
  },
);

export const unassignEmployeeArea = (
  employeeId: number,
  payload: UnassignEmployeeAreaPayload = {},
) => api.patch<EmployeeAreaAssignmentResponse>(
  `${API_PREFIX}/employees/${employeeId}/area-assignments/unassign`,
  payload,
  {
    toast: {
      successMessage: "Empleado retirado del area correctamente.",
      errorMessage: "No fue posible retirar el empleado del area.",
    },
  },
);

export const listEmployeeProjectMemberships = (
  employeeId: number,
  status: EmployeeStatusFilter = "all",
) => api.get<EmployeeProjectMembershipsResponse>(
  `${API_PREFIX}/employees/${employeeId}/project-memberships?status=${status}`,
);

export const deleteEmployee = (employeeId: number) =>
  api.delete<DeleteEmployeeResponse>(`${API_PREFIX}/employees/${employeeId}`, {
    toast: {
      successMessage: "Empleado eliminado correctamente.",
      errorMessage: "No fue posible eliminar el empleado.",
    },
  });
