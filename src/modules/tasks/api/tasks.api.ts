import { api, API_PREFIX } from "../../../shared/api/api";

export type TaskStatusFilter = "all" | "assigned" | "in_progress" | "done";
export type TaskWorkflowStatus = "assigned" | "in_progress" | "done";

export interface TaskSummary {
  id: number;
  projectId: number;
  projectName: string;
  taskStatusId: number;
  status: string;
  taskPriorityId: number;
  priority: string;
  title: string;
  description: string | null;
  plannedStartDate: string;
  dueDate: string;
  estimatedMinutes: number | null;
  actualMinutes: number;
  deviationMinutes: number | null;
  isEstimateDelayed: boolean | null;
  isDateOverdue: boolean;
  completedAt: string | null;
  hasOpenWorkSession: boolean;
  assigneeMembershipId: number | null;
  assigneeEmployeeId: number | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  deletedAt: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  data: TaskSummary[];
}

export interface TaskResponse {
  data: TaskSummary;
}

export interface DeleteTaskResponse {
  data: {
    id: number;
    deletedAt: string;
  };
}

export interface TaskStatusTransition {
  id: number;
  taskId: number;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: number;
  changedAt: string;
  notes: string | null;
}

export interface TransitionTaskStatusPayload {
  toStatus: TaskWorkflowStatus;
  notes?: string | null;
}

export interface TransitionTaskStatusResponse {
  data: {
    task: TaskSummary;
    transition: TaskStatusTransition;
  };
}

export interface TaskHistoryEntry {
  id: number;
  taskId: number;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  changedByUserId: number;
  changedByName: string;
  changedByEmail: string;
  notes: string | null;
}

export interface TaskHistoryResponse {
  data: TaskHistoryEntry[];
}

export interface CreateTaskPayload {
  projectId: number;
  title: string;
  description?: string | null;
  plannedStartDate: string;
  dueDate: string;
  taskPriorityId?: number;
  assigneeMembershipId?: number | null;
  estimatedMinutes?: number | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  plannedStartDate?: string;
  dueDate?: string;
  taskPriorityId?: number;
  assigneeMembershipId?: number | null;
  estimatedMinutes?: number | null;
}

const buildTasksQuery = (params: {
  projectId?: number;
  status: TaskStatusFilter;
  includeDeleted?: boolean;
}) => {
  const query = new URLSearchParams();
  query.set("status", params.status);
  if (params.projectId !== undefined) {
    query.set("projectId", String(params.projectId));
  }
  if (params.includeDeleted !== undefined) {
    query.set("includeDeleted", String(params.includeDeleted));
  }
  return query.toString();
};

const withNullableString = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const withNullableInt = (value?: number | null): number | null | undefined => {
  if (value === undefined) return undefined;
  return value === null ? null : value;
};

export const listTasks = (params: {
  projectId?: number;
  status: TaskStatusFilter;
  includeDeleted?: boolean;
}) => api.get<TasksResponse>(`${API_PREFIX}/tasks?${buildTasksQuery(params)}`);

export const getTaskById = (taskId: number) =>
  api.get<TaskResponse>(`${API_PREFIX}/tasks/${taskId}`);

export const createTask = (payload: CreateTaskPayload) =>
  api.post<TaskResponse>(`${API_PREFIX}/tasks`, {
    projectId: payload.projectId,
    title: payload.title,
    description: withNullableString(payload.description),
    plannedStartDate: payload.plannedStartDate,
    dueDate: payload.dueDate,
    taskPriorityId: payload.taskPriorityId ?? 2,
    assigneeMembershipId: withNullableInt(payload.assigneeMembershipId),
    estimatedMinutes: withNullableInt(payload.estimatedMinutes),
  });

export const updateTask = (taskId: number, payload: UpdateTaskPayload) =>
  api.patch<TaskResponse>(`${API_PREFIX}/tasks/${taskId}`, {
    title: payload.title,
    description: payload.description !== undefined
      ? withNullableString(payload.description)
      : undefined,
    plannedStartDate: payload.plannedStartDate,
    dueDate: payload.dueDate,
    taskPriorityId: payload.taskPriorityId,
    assigneeMembershipId: withNullableInt(payload.assigneeMembershipId),
    estimatedMinutes: withNullableInt(payload.estimatedMinutes),
  });

export const deleteTask = (taskId: number) =>
  api.delete<DeleteTaskResponse>(`${API_PREFIX}/tasks/${taskId}`);

export const transitionTaskStatus = (
  taskId: number,
  payload: TransitionTaskStatusPayload,
) => api.patch<TransitionTaskStatusResponse>(`${API_PREFIX}/tasks/${taskId}/status`, {
  toStatus: payload.toStatus,
  notes: payload.notes ?? null,
});

export const getTaskHistory = (taskId: number) =>
  api.get<TaskHistoryResponse>(`${API_PREFIX}/tasks/${taskId}/history`);
