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

export type ComplianceFilter = "all" | "on_time" | "estimate_delayed" | "date_overdue";
export type ComplianceStatus = Exclude<ComplianceFilter, "all">;

export interface TaskComplianceReportRow {
  taskId: number;
  title: string;
  projectId: number;
  projectName: string;
  areaId: number;
  areaName: string;
  assigneeEmployeeId: number | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  status: string;
  priority: string;
  plannedStartDate: string;
  dueDate: string;
  completedAt: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  deviationMinutes: number | null;
  isEstimateDelayed: boolean | null;
  isDateOverdue: boolean;
  complianceStatus: ComplianceStatus;
  complianceLabel: string;
}

export interface TaskComplianceReportData {
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
    projectId: number | null;
    areaId: number | null;
    employeeId: number | null;
    compliance: ComplianceFilter;
    limit: number;
  };
  summary: {
    totalTasks: number;
    onTimeTasks: number;
    estimateDelayedTasks: number;
    dateOverdueTasks: number;
  };
  rows: TaskComplianceReportRow[];
}

export interface TaskComplianceReportResponse {
  data: TaskComplianceReportData;
}

export interface TaskComplianceReportQuery extends AdminDashboardQuery {
  compliance?: ComplianceFilter;
  limit?: number;
}

export type OverdueAlertReason = "DATE_OVERDUE" | "ESTIMATE_OVERDUE";

export interface OverdueAlert {
  taskId: number;
  title: string;
  projectId: number;
  projectName: string;
  areaId: number;
  areaName: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  status: string;
  priority: string;
  dueDate: string;
  estimatedMinutes: number | null;
  actualMinutes: number;
  deviationMinutes: number | null;
  reason: OverdueAlertReason;
  reasonLabel: string;
  daysOverdue: number | null;
}

export interface OverdueAlertsData {
  generatedAt: string;
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
    projectId: number | null;
    areaId: number | null;
    employeeId: number | null;
    limit: number;
  };
  counters: {
    totalAlerts: number;
    dateOverdueAlerts: number;
    estimateOverdueAlerts: number;
  };
  alerts: OverdueAlert[];
}

export interface OverdueAlertsResponse {
  data: OverdueAlertsData;
}

export interface OverdueAlertsQuery extends AdminDashboardQuery {
  limit?: number;
}

const buildCommonAnalyticsQuery = (query: AdminDashboardQuery) => {
  const params = new URLSearchParams();

  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.projectId !== undefined) params.set("projectId", String(query.projectId));
  if (query.areaId !== undefined) params.set("areaId", String(query.areaId));
  if (query.employeeId !== undefined) params.set("employeeId", String(query.employeeId));

  return params.toString();
};

const withQueryString = (path: string, queryString: string) =>
  queryString ? `${path}?${queryString}` : path;

export const getEmployeeDashboard = () =>
  api.get<EmployeeDashboardResponse>(`${API_PREFIX}/analytics/dashboard/employee`);

export const getAdminDashboard = (query: AdminDashboardQuery = {}) =>
  api.get<AdminDashboardResponse>(
    withQueryString(
      `${API_PREFIX}/analytics/dashboard/admin`,
      buildCommonAnalyticsQuery(query),
    ),
  );

export const getTaskComplianceReport = (query: TaskComplianceReportQuery = {}) => {
  const params = new URLSearchParams(buildCommonAnalyticsQuery(query));
  if (query.compliance) params.set("compliance", query.compliance);
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  return api.get<TaskComplianceReportResponse>(
    withQueryString(`${API_PREFIX}/analytics/reports/compliance`, params.toString()),
  );
};

export const getOverdueAlerts = (query: OverdueAlertsQuery = {}) => {
  const params = new URLSearchParams(buildCommonAnalyticsQuery(query));
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  return api.get<OverdueAlertsResponse>(
    withQueryString(`${API_PREFIX}/analytics/alerts/overdue`, params.toString()),
  );
};
