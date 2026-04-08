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
  reportedActualMinutes: number | null;
  completionEvidence: string | null;
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

export type TaskRecurrenceFrequency = "daily" | "weekly" | "monthly" | "range_interval";

export interface TaskCreateRecurrence {
  frequency: TaskRecurrenceFrequency;
  every?: number;
  untilDate: string;
}

export interface CreateTaskResponse {
  data: {
    task: TaskSummary;
    createdCount: number;
    createdTaskIds: number[];
  };
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
  actualMinutes?: number | null;
  completionEvidence?: string | null;
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
  recurrence?: TaskCreateRecurrence;
}

export interface CreateStandaloneTaskPayload {
  title: string;
  description?: string | null;
  plannedStartDate: string;
  dueDate: string;
  assigneeEmployeeId?: number | null;
  taskPriorityId?: number;
  estimatedMinutes?: number | null;
  recurrence?: TaskCreateRecurrence;
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
  includeStandalone?: boolean;
}) => {
  const query = new URLSearchParams();
  query.set("status", params.status);
  if (params.projectId !== undefined) {
    query.set("projectId", String(params.projectId));
  }
  if (params.includeDeleted !== undefined) {
    query.set("includeDeleted", String(params.includeDeleted));
  }
  if (params.includeStandalone !== undefined) {
    query.set("includeStandalone", String(params.includeStandalone));
  }
  return query.toString();
};

const withNullableString = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
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
  includeStandalone?: boolean;
}) => api.get<TasksResponse>(`${API_PREFIX}/tasks?${buildTasksQuery(params)}`);

export const listStandaloneTasks = (params: {
  status: TaskStatusFilter;
  includeDeleted?: boolean;
}) => api.get<TasksResponse>(`${API_PREFIX}/tasks/standalone?${buildTasksQuery(params)}`);

export const getTaskById = (taskId: number) =>
  api.get<TaskResponse>(`${API_PREFIX}/tasks/${taskId}`);

export const createTask = (payload: CreateTaskPayload) =>
  api.post<CreateTaskResponse>(`${API_PREFIX}/tasks`, {
    projectId: payload.projectId,
    title: payload.title,
    description: withNullableString(payload.description),
    plannedStartDate: payload.plannedStartDate,
    dueDate: payload.dueDate,
    taskPriorityId: payload.taskPriorityId ?? 2,
    assigneeMembershipId: withNullableInt(payload.assigneeMembershipId),
    estimatedMinutes: withNullableInt(payload.estimatedMinutes),
    recurrence: payload.recurrence
      ? {
          frequency: payload.recurrence.frequency,
          every: payload.recurrence.every ?? 1,
          untilDate: payload.recurrence.untilDate,
        }
      : undefined,
  }, {
    toast: {
      successMessage: "Tarea creada correctamente.",
      errorMessage: "No fue posible crear la tarea.",
    },
  });

export const createStandaloneTask = (payload: CreateStandaloneTaskPayload) =>
  api.post<CreateTaskResponse>(`${API_PREFIX}/tasks/standalone`, {
    title: payload.title,
    description: withNullableString(payload.description),
    plannedStartDate: payload.plannedStartDate,
    dueDate: payload.dueDate,
    assigneeEmployeeId: withNullableInt(payload.assigneeEmployeeId),
    taskPriorityId: payload.taskPriorityId ?? 2,
    estimatedMinutes: withNullableInt(payload.estimatedMinutes),
    recurrence: payload.recurrence
      ? {
          frequency: payload.recurrence.frequency,
          every: payload.recurrence.every ?? 1,
          untilDate: payload.recurrence.untilDate,
        }
      : undefined,
  }, {
    toast: {
      successMessage: "Tarea suelta creada correctamente.",
      errorMessage: "No fue posible crear la tarea suelta.",
    },
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
  }, {
    toast: {
      successMessage: "Tarea actualizada correctamente.",
      errorMessage: "No fue posible actualizar la tarea.",
    },
  });

export const deleteTask = (taskId: number) =>
  api.delete<DeleteTaskResponse>(`${API_PREFIX}/tasks/${taskId}`, {
    toast: {
      successMessage: "Tarea eliminada correctamente.",
      errorMessage: "No fue posible eliminar la tarea.",
    },
  });

export const transitionTaskStatus = (
  taskId: number,
  payload: TransitionTaskStatusPayload,
) => api.patch<TransitionTaskStatusResponse>(`${API_PREFIX}/tasks/${taskId}/status`, {
  toStatus: payload.toStatus,
  actualMinutes: withNullableInt(payload.actualMinutes),
  completionEvidence: withNullableString(payload.completionEvidence),
  notes: payload.notes ?? null,
}, {
  toast: {
    successMessage: "Estado de tarea actualizado.",
    errorMessage: "No fue posible cambiar el estado de la tarea.",
  },
});

export const getTaskHistory = (taskId: number) =>
  api.get<TaskHistoryResponse>(`${API_PREFIX}/tasks/${taskId}/history`);
