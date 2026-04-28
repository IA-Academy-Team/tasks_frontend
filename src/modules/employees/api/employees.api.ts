import { api, API_PREFIX } from "../../../shared/api/api";

export type EmployeeAssignmentsStatusFilter = "all" | "active" | "inactive";

export interface EmployeeSummary {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: "admin" | "employee" | "leader";
  roleId: number;
  emailVerified: boolean;
  phoneNumber: string | null;
  image: string | null;
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
    mode: "deleted";
  };
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  role?: "employee" | "leader";
  phoneNumber?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

export interface UpdateEmployeePayload {
  name?: string;
  email?: string;
  phoneNumber?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

export interface AssignEmployeeAreaPayload {
  areaId: number;
}

export interface UnassignEmployeeAreaPayload {
  areaId?: number;
}

export const listEmployees = () =>
  api.get<EmployeesResponse>(`${API_PREFIX}/employees`);

export const createEmployee = (payload: CreateEmployeePayload) =>
  api.post<EmployeeResponse>(`${API_PREFIX}/employees`, payload, {
    toast: {
      successMessage: "Empleado creado correctamente.",
      showError: false,
    },
  });

export const updateEmployee = (employeeId: number, payload: UpdateEmployeePayload) =>
  api.patch<EmployeeResponse>(`${API_PREFIX}/employees/${employeeId}`, payload, {
    toast: {
      successMessage: "Empleado actualizado correctamente.",
      showError: false,
    },
  });

export const listEmployeeAreaAssignments = (
  employeeId: number,
  status: EmployeeAssignmentsStatusFilter = "all",
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
  status: EmployeeAssignmentsStatusFilter = "all",
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
