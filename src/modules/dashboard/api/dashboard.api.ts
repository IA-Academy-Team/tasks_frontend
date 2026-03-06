import { api, API_PREFIX } from "../../../shared/api/api";

export interface EmployeeDashboardSummary {
  assignedTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  upcomingTasks: number;
  activeTasksAccumulatedMinutes: number;
}

export interface EmployeeDashboardUpcomingTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  projectId: number;
  projectName: string;
  dueDate: string;
  estimatedMinutes: number | null;
  actualMinutes: number;
}

export interface EmployeeDashboardData {
  summary: EmployeeDashboardSummary;
  upcomingTasks: EmployeeDashboardUpcomingTask[];
}

export interface EmployeeDashboardResponse {
  data: EmployeeDashboardData;
}

export interface DashboardAggregate {
  totalTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  completionRate: number;
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
  totalDeviationMinutes: number;
}

export interface AdminDashboardEmployeeProductivity extends DashboardAggregate {
  employeeId: number;
  userId: number;
  employeeName: string;
  employeeEmail: string;
}

export interface AdminDashboardAreaProductivity extends DashboardAggregate {
  areaId: number;
  areaName: string;
}

export interface AdminDashboardData {
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
    projectId: number | null;
    areaId: number | null;
    employeeId: number | null;
  };
  teamSummary: DashboardAggregate;
  employeeProductivity: AdminDashboardEmployeeProductivity[];
  areaProductivity: AdminDashboardAreaProductivity[];
}

export interface AdminDashboardResponse {
  data: AdminDashboardData;
}

export interface AdminDashboardQuery {
  dateFrom?: string;
  dateTo?: string;
  projectId?: number;
  areaId?: number;
  employeeId?: number;
}

const buildAdminDashboardQuery = (query: AdminDashboardQuery) => {
  const params = new URLSearchParams();

  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.projectId !== undefined) params.set("projectId", String(query.projectId));
  if (query.areaId !== undefined) params.set("areaId", String(query.areaId));
  if (query.employeeId !== undefined) params.set("employeeId", String(query.employeeId));

  return params.toString();
};

export const getEmployeeDashboard = () =>
  api.get<EmployeeDashboardResponse>(`${API_PREFIX}/analytics/dashboard/employee`);

export const getAdminDashboard = (query: AdminDashboardQuery = {}) =>
  api.get<AdminDashboardResponse>(
    `${API_PREFIX}/analytics/dashboard/admin?${buildAdminDashboardQuery(query)}`,
  );
