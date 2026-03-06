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
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeResponse {
  data: EmployeeSummary;
}

export interface EmployeesResponse {
  data: EmployeeSummary[];
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
  phoneNumber?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

export interface UpdateEmployeeStatusPayload {
  isActive: boolean;
}

export const listEmployees = (status: EmployeeStatusFilter) =>
  api.get<EmployeesResponse>(`${API_PREFIX}/employees?status=${status}`);

export const createEmployee = (payload: CreateEmployeePayload) =>
  api.post<EmployeeResponse>(`${API_PREFIX}/employees`, payload);

export const updateEmployee = (employeeId: number, payload: UpdateEmployeePayload) =>
  api.patch<EmployeeResponse>(`${API_PREFIX}/employees/${employeeId}`, payload);

export const updateEmployeeStatus = (
  employeeId: number,
  payload: UpdateEmployeeStatusPayload,
) => api.patch<EmployeeResponse>(`${API_PREFIX}/employees/${employeeId}/status`, payload);

