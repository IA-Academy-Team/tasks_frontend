import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft,
  CalendarClock,
  ChartPie,
  Check,
  CheckCircle2,
  ChevronDown,
  FilePlus2,
  KanbanSquare,
  LayoutGrid,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../shared/api/api";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { TaskCompletionDialog } from "../components/tasks/TaskCompletionDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../components/ui/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../components/ui/chart";
import { listEmployees, type EmployeeSummary } from "../../modules/employees/api/employees.api";
import {
  assignProjectMembership,
  getProjectById,
  listProjectMemberships,
  reassignProjectTasks,
  type ProjectMembership,
  type ProjectSummary,
} from "../../modules/projects/api/projects.api";
import {
  createTask,
  deleteTask,
  getTaskHistory,
  listTasks,
  transitionTaskStatus,
  updateTask,
  type TaskHistoryEntry,
  type TaskWorkflowStatus,
  type TaskStatusFilter,
  type TaskSummary,
} from "../../modules/tasks/api/tasks.api";

const KANBAN_COLUMNS: { key: TaskWorkflowStatus; title: string }[] = [
  { key: "assigned", title: "Asignada" },
  { key: "in_progress", title: "En proceso" },
  { key: "done", title: "Terminada" },
];

const WORKFLOW_LABELS: Record<TaskWorkflowStatus, string> = {
  assigned: "Asignada",
  in_progress: "En proceso",
  done: "Terminada",
};

const WORKFLOW_TRANSITIONS: Record<TaskWorkflowStatus, TaskWorkflowStatus[]> = {
  assigned: ["in_progress"],
  in_progress: ["done"],
  done: [],
};

const getTransitionValidationMessage = (
  fromStatus: TaskWorkflowStatus,
  toStatus: TaskWorkflowStatus,
) => {
  if (fromStatus === "assigned" && toStatus === "done") {
    return "No puedes marcar una tarea como Terminada directamente desde Asignada. Primero pásala a En proceso.";
  }

  return `Transición no permitida: ${WORKFLOW_LABELS[fromStatus]} → ${WORKFLOW_LABELS[toStatus]}.`;
};

const getTaskTransitionApiErrorMessage = (code: string | undefined): string | null => {
  if (code === "TASK_TRANSITION_NOT_ALLOWED") {
    return "La transición de estado no está permitida para esta tarea.";
  }

  if (code === "TASK_STATUS_UNCHANGED") {
    return "La tarea ya se encuentra en ese estado.";
  }

  if (code === "TASK_WORK_SESSION_NOT_OPEN") {
    return "No se pudo finalizar la tarea porque no tenía una sesión activa. Reintenta y, si persiste, actualiza el tablero.";
  }

  if (code === "TASK_WORK_SESSION_ALREADY_OPEN") {
    return "La tarea ya tenía una sesión activa y se reintentó iniciar de nuevo. Actualiza el tablero e inténtalo otra vez.";
  }

  return null;
};

const STATUS_NAME_TO_KEY: Record<string, TaskWorkflowStatus> = {
  Asignada: "assigned",
  "En proceso": "in_progress",
  Terminada: "done",
};

const getStatusKeyFromTask = (task: TaskSummary): TaskWorkflowStatus | null =>
  STATUS_NAME_TO_KEY[task.status] ?? null;

const formatMinutes = (minutes: number): string => {
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Hace un momento";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
};

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const inferDateRangeFromHours = (hours: number) => {
  const start = new Date();
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return {
    plannedStartDate: toInputDate(start),
    dueDate: toInputDate(end),
  };
};

const getComplianceBadge = (task: TaskSummary): { label: string; className: string } => {
  if (task.isDateOverdue) {
    return { label: "Atraso por fecha", className: "text-destructive" };
  }

  if (task.isEstimateDelayed === true) {
    return { label: "Atraso estimado", className: "text-warning" };
  }

  return { label: "En tiempo", className: "text-success" };
};

type ProjectTaskViewMode = "grid" | "kanban" | "analytics";
type TaskRecurrenceMode = "none" | "daily" | "weekly" | "monthly" | "range_interval";

const statusChartConfig = {
  Asignada: { label: "Asignada", color: "var(--chart-1)" },
  "En proceso": { label: "En proceso", color: "var(--chart-4)" },
  Terminada: { label: "Terminada", color: "var(--chart-2)" },
} satisfies ChartConfig;

const barChartConfig = {
  tareas: { label: "Tareas", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function ProjectBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [memberships, setMemberships] = useState<ProjectMembership[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>("all");
  const [taskViewMode, setTaskViewMode] = useState<ProjectTaskViewMode>("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPlannedStartDate, setTaskPlannedStartDate] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState("");
  const [taskAreaId, setTaskAreaId] = useState("");
  const [taskAssigneeEmployeeId, setTaskAssigneeEmployeeId] = useState("");
  const [taskRecurrenceMode, setTaskRecurrenceMode] = useState<TaskRecurrenceMode>("none");
  const [taskRecurrenceEvery, setTaskRecurrenceEvery] = useState("1");
  const [taskRecurrenceUntilDate, setTaskRecurrenceUntilDate] = useState("");
  const [isTaskAssigneeSelectOpen, setIsTaskAssigneeSelectOpen] = useState(false);
  const [taskAssigneeSearchTerm, setTaskAssigneeSearchTerm] = useState("");
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [pendingCompletionTask, setPendingCompletionTask] = useState<TaskSummary | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryEntry[]>([]);
  const [isLoadingTaskHistory, setIsLoadingTaskHistory] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [isTaskReassignModalOpen, setIsTaskReassignModalOpen] = useState(false);
  const [sourceEmployeeId, setSourceEmployeeId] = useState("");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskSummary | null>(null);

  const numericProjectId = Number(projectId);

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskDescription("");
    setTaskPlannedStartDate("");
    setTaskDueDate("");
    setTaskEstimatedHours("");
    setTaskAreaId(project?.areaId ? String(project.areaId) : "");
    setTaskAssigneeEmployeeId("");
    setTaskRecurrenceMode("none");
    setTaskRecurrenceEvery("1");
    setTaskRecurrenceUntilDate("");
  };

  const loadProject = useCallback(async () => {
    if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) {
      navigate("/projects", { replace: true });
      return;
    }

    try {
      setError("");
      const response = await getProjectById(numericProjectId);
      setProject(response?.data ?? null);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar el proyecto.");
      }
      setProject(null);
    }
  }, [navigate, numericProjectId]);

  const loadMemberships = useCallback(async () => {
    if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) return;
    try {
      const response = await listProjectMemberships(numericProjectId, "all");
      setMemberships(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar las membresias.");
      }
    }
  }, [numericProjectId]);

  const loadTasks = useCallback(async () => {
    if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) return;
    try {
      const response = await listTasks({
        projectId: numericProjectId,
        status: taskStatusFilter,
      });
      setTasks(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar las tareas del proyecto.");
      }
    }
  }, [numericProjectId, taskStatusFilter]);

  const loadEmployees = useCallback(async () => {
    if (!isAdmin) {
      setEmployees([]);
      return;
    }

    try {
      const response = await listEmployees("active");
      setEmployees(response?.data ?? []);
    } catch {
      setEmployees([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await Promise.all([loadProject(), loadMemberships(), loadEmployees(), loadTasks()]);
      setIsLoading(false);
    };
    void initialize();
  }, [loadEmployees, loadMemberships, loadProject, loadTasks, projectId]);

  useEffect(() => {
    void loadMemberships();
  }, [loadMemberships, projectId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks, projectId, taskStatusFilter]);

  useEffect(() => {
    if (selectedTaskId === null) {
      setTaskHistory([]);
      return;
    }

    const selectedStillExists = tasks.some((task) => task.id === selectedTaskId);
    if (!selectedStillExists) {
      setSelectedTaskId(null);
      setTaskHistory([]);
    }
  }, [selectedTaskId, tasks]);

  const assignableEmployees = useMemo(() => {
    return employees.filter((employee) => employee.role === "employee");
  }, [employees]);

  const activeMemberships = useMemo(
    () => memberships.filter((membership) => membership.isActive),
    [memberships],
  );

  const taskReassignSourceOptions = useMemo(() => {
    const employeeById = new Map<number, { id: number; label: string }>();
    activeMemberships.forEach((membership) => {
      employeeById.set(membership.employeeId, {
        id: membership.employeeId,
        label: `${membership.employeeName} (${membership.employeeEmail})`,
      });
    });
    return [...employeeById.values()];
  }, [activeMemberships]);

  const taskReassignTargetOptions = useMemo(
    () => assignableEmployees.map((employee) => ({
      id: employee.id,
      label: `${employee.name} (${employee.email})`,
    })),
    [assignableEmployees],
  );

  const taskAreaOptions = useMemo(() => {
    const options = new Map<number, string>();

    if (project?.areaId) {
      options.set(project.areaId, project.areaName);
    }

    memberships.forEach((membership) => {
      if (membership.currentAreaId && membership.currentAreaName) {
        options.set(membership.currentAreaId, membership.currentAreaName);
      }
    });

    employees.forEach((employee) => {
      if (employee.areaIds.length > 0 && employee.areaNames.length > 0) {
        employee.areaIds.forEach((areaId, index) => {
          const areaName = employee.areaNames[index];
          if (areaName) {
            options.set(areaId, areaName);
          }
        });
        return;
      }

      if (employee.currentAreaId && employee.currentAreaName) {
        options.set(employee.currentAreaId, employee.currentAreaName);
      }
    });

    return [...options.entries()].map(([id, name]) => ({ id, name }));
  }, [employees, memberships, project]);

  const taskAssigneeEmployeeOptions = useMemo(() => {
    const selectedAreaId = Number(taskAreaId);
    const assignableEmployeesList = employees.filter(
      (employee) => employee.role === "employee",
    );

    if (!Number.isInteger(selectedAreaId) || selectedAreaId <= 0) {
      return assignableEmployeesList;
    }

    return assignableEmployeesList.filter((employee) => (
      employee.currentAreaId === selectedAreaId || employee.areaIds.includes(selectedAreaId)
    ));
  }, [employees, taskAreaId]);

  const taskAssigneeSearchOptions = useMemo(
    () => taskAssigneeEmployeeOptions.map((employee) => ({
      value: String(employee.id),
      label: `${employee.name} (${employee.email})`,
    })),
    [taskAssigneeEmployeeOptions],
  );

  const visibleTaskAssigneeOptions = useMemo(() => {
    const normalizedTerm = taskAssigneeSearchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      return taskAssigneeSearchOptions.slice(0, 6);
    }

    return taskAssigneeSearchOptions.filter((option) => option.label.toLowerCase().includes(normalizedTerm));
  }, [taskAssigneeSearchOptions, taskAssigneeSearchTerm]);

  const selectedTaskAssigneeOption = useMemo(
    () => taskAssigneeSearchOptions.find((option) => option.value === taskAssigneeEmployeeId),
    [taskAssigneeEmployeeId, taskAssigneeSearchOptions],
  );

  const kanbanTasks = useMemo(() => {
    const grouped: Record<TaskWorkflowStatus, TaskSummary[]> = {
      assigned: [],
      in_progress: [],
      done: [],
    };

    tasks.forEach((task) => {
      const statusKey = getStatusKeyFromTask(task);
      if (statusKey) {
        grouped[statusKey].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const taskStatusDistribution = useMemo(() => ([
    { status: "Asignada", value: kanbanTasks.assigned.length, fill: "var(--chart-1)" },
    { status: "En proceso", value: kanbanTasks.in_progress.length, fill: "var(--chart-4)" },
    { status: "Terminada", value: kanbanTasks.done.length, fill: "var(--chart-2)" },
  ]), [kanbanTasks]);

  const taskPriorityDistribution = useMemo(() => {
    const counters = new Map<string, number>();

    tasks.forEach((task) => {
      counters.set(task.priority, (counters.get(task.priority) ?? 0) + 1);
    });

    return [...counters.entries()].map(([name, tareas]) => ({ name, tareas }));
  }, [tasks]);

  const projectTaskAnalytics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAhead = new Date(today);
    sevenDaysAhead.setDate(today.getDate() + 7);

    const completedLast7 = tasks.filter((task) => (
      task.completedAt
      && !Number.isNaN(new Date(task.completedAt).getTime())
      && new Date(task.completedAt) >= sevenDaysAgo
    )).length;

    const updatedLast7 = tasks.filter((task) => {
      const createdAt = new Date(task.createdAt).getTime();
      const updatedAt = new Date(task.updatedAt).getTime();
      return (
        !Number.isNaN(createdAt)
        && !Number.isNaN(updatedAt)
        && updatedAt >= sevenDaysAgo.getTime()
        && updatedAt > createdAt
      );
    }).length;

    const createdLast7 = tasks.filter((task) => {
      const createdAt = new Date(task.createdAt).getTime();
      return !Number.isNaN(createdAt) && createdAt >= sevenDaysAgo.getTime();
    }).length;

    const dueSoonNext7 = tasks.filter((task) => {
      const normalizedStatus = task.status.trim().toLowerCase();
      if (normalizedStatus === "terminada") {
        return false;
      }
      const dueDate = new Date(`${task.dueDate.slice(0, 10)}T00:00:00`);
      if (Number.isNaN(dueDate.getTime())) {
        return false;
      }
      return dueDate >= today && dueDate <= sevenDaysAhead;
    }).length;

    const recentActivity = [...tasks]
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 6)
      .map((task) => {
        const updatedAtMs = new Date(task.updatedAt).getTime();
        const createdAtMs = new Date(task.createdAt).getTime();
        const completedAtMs = task.completedAt ? new Date(task.completedAt).getTime() : NaN;
        let action = "actualizó la tarea";

        if (!Number.isNaN(completedAtMs) && Math.abs(updatedAtMs - completedAtMs) <= 5 * 60 * 1000) {
          action = "finalizó la tarea";
        } else if (!Number.isNaN(createdAtMs) && Math.abs(updatedAtMs - createdAtMs) <= 5 * 60 * 1000) {
          action = "creó la tarea";
        }

        return {
          id: task.id,
          title: task.title,
          assigneeName: task.assigneeName ?? "Sin asignar",
          status: task.status,
          action,
          relativeTime: formatRelativeTime(task.updatedAt),
        };
      });

    const employeeCounter = new Map<string, number>();
    tasks.forEach((task) => {
      const key = task.assigneeName ?? "Sin asignar";
      employeeCounter.set(key, (employeeCounter.get(key) ?? 0) + 1);
    });
    const totalEmployeeTasks = tasks.length || 1;
    const tasksByEmployee = [...employeeCounter.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / totalEmployeeTasks) * 100),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);

    return {
      completedLast7,
      updatedLast7,
      createdLast7,
      dueSoonNext7,
      recentActivity,
      tasksByEmployee,
    };
  }, [tasks]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const loadTaskHistory = useCallback(async (taskId: number) => {
    setIsLoadingTaskHistory(true);
    try {
      const response = await getTaskHistory(taskId);
      setTaskHistory(response?.data ?? []);
    } catch (incomingError) {
      setTaskHistory([]);
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar el historial de estados.");
      }
    } finally {
      setIsLoadingTaskHistory(false);
    }
  }, []);

  const handleSelectTask = (taskId: number) => {
    setError("");
    setSelectedTaskId(taskId);
    void loadTaskHistory(taskId);
  };

  useEffect(() => {
    const rawTaskId = searchParams.get("taskId");
    if (!rawTaskId) {
      return;
    }

    const taskIdFromQuery = Number(rawTaskId);
    if (!Number.isInteger(taskIdFromQuery) || taskIdFromQuery <= 0) {
      return;
    }

    const taskExistsInBoard = tasks.some((task) => task.id === taskIdFromQuery);
    if (!taskExistsInBoard || selectedTaskId === taskIdFromQuery) {
      return;
    }

    setSelectedTaskId(taskIdFromQuery);
    void loadTaskHistory(taskIdFromQuery);
  }, [loadTaskHistory, searchParams, selectedTaskId, tasks]);

  const handleReassignTasks = async () => {
    if (!project) return;

    const fromEmployeeId = Number(sourceEmployeeId);
    const toEmployeeId = Number(targetEmployeeId);

    if (!Number.isInteger(fromEmployeeId) || fromEmployeeId <= 0) {
      toast.error("Selecciona el empleado origen.");
      return;
    }

    if (!Number.isInteger(toEmployeeId) || toEmployeeId <= 0) {
      toast.error("Selecciona el empleado destino.");
      return;
    }

    if (fromEmployeeId === toEmployeeId) {
      toast.error("El empleado origen y destino deben ser distintos.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await reassignProjectTasks(project.id, { fromEmployeeId, toEmployeeId });
      const reassignedCount = response?.data?.reassignedTasks ?? 0;
      setSuccess(`Se reasignaron ${reassignedCount} tareas pendientes.`);
      setIsTaskReassignModalOpen(false);
      setSourceEmployeeId("");
      setTargetEmployeeId("");
      await Promise.all([loadTasks(), loadMemberships()]);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible reasignar las tareas.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const startTaskEdit = (task: TaskSummary) => {
    const currentMembership = activeMemberships.find(
      (membership) => membership.id === task.assigneeMembershipId,
    );

    setSelectedTaskId(task.id);
    void loadTaskHistory(task.id);
    setEditingTaskId(task.id);
    setTaskDescription(task.description ?? "");
    setTaskPlannedStartDate(task.plannedStartDate);
    setTaskDueDate(task.dueDate);
    setTaskEstimatedHours(task.estimatedMinutes ? String(Number((task.estimatedMinutes / 60).toFixed(1))) : "");
    setTaskAreaId(
      currentMembership?.currentAreaId
        ? String(currentMembership.currentAreaId)
        : project?.areaId
          ? String(project.areaId)
          : "",
    );
    setTaskAssigneeEmployeeId(task.assigneeEmployeeId ? String(task.assigneeEmployeeId) : "");
    setError("");
    setSuccess("");
    setIsTaskModalOpen(true);
  };

  const openCreateTaskModal = () => {
    resetTaskForm();
    if (project?.areaId) {
      setTaskAreaId(String(project.areaId));
    }
    setError("");
    setSuccess("");
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!project) return;

    const description = taskDescription.trim();
    if (!description) {
      toast.error("La descripcion de la tarea es obligatoria.");
      return;
    }

    const estimatedHours = taskEstimatedHours.trim()
      ? Number(taskEstimatedHours)
      : null;
    const selectedEmployeeId = taskAssigneeEmployeeId
      ? Number(taskAssigneeEmployeeId)
      : null;
    const recurrenceEveryValue = taskRecurrenceEvery.trim()
      ? Number(taskRecurrenceEvery)
      : 1;
    const hasRecurrence = !editingTaskId && taskRecurrenceMode !== "none";
    const estimatedMinutes = estimatedHours === null ? null : Math.round(estimatedHours * 60);

    if (estimatedHours !== null && (!Number.isFinite(estimatedHours) || estimatedHours <= 0)) {
      toast.error("La estimacion de horas debe ser positiva.");
      return;
    }

    let resolvedTaskPlannedStartDate = taskPlannedStartDate;
    let resolvedTaskDueDate = taskDueDate;

    if (!resolvedTaskPlannedStartDate || !resolvedTaskDueDate) {
      if (estimatedHours === null || estimatedHours <= 0) {
        toast.error("Si no defines fechas, la estimación de horas es obligatoria.");
        return;
      }

      const inferred = inferDateRangeFromHours(estimatedHours);
      resolvedTaskPlannedStartDate = resolvedTaskPlannedStartDate || inferred.plannedStartDate;
      resolvedTaskDueDate = resolvedTaskDueDate || inferred.dueDate;
    }

    if (new Date(resolvedTaskDueDate).getTime() < new Date(resolvedTaskPlannedStartDate).getTime()) {
      toast.error("La fecha fin no puede ser menor a la fecha inicio.");
      return;
    }

    if (selectedEmployeeId === null) {
      toast.error("Selecciona un empleado para asignar la tarea.");
      return;
    }

    if (hasRecurrence) {
      if (!Number.isInteger(recurrenceEveryValue) || recurrenceEveryValue <= 0) {
        toast.error("La recurrencia debe tener un intervalo entero mayor a 0.");
        return;
      }

      if (!taskRecurrenceUntilDate) {
        toast.error("Define una fecha final para la recurrencia.");
        return;
      }

      if (taskRecurrenceUntilDate < resolvedTaskDueDate) {
        toast.error("La fecha final de recurrencia debe ser mayor o igual a la fecha de fin.");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      let assigneeMembershipId = activeMemberships.find(
        (membership) => membership.employeeId === selectedEmployeeId,
      )?.id ?? null;

      if (assigneeMembershipId === null) {
        const membershipResponse = await assignProjectMembership(project.id, { employeeId: selectedEmployeeId });
        assigneeMembershipId = membershipResponse?.data?.id ?? null;
      }

      if (!assigneeMembershipId) {
        throw new Error("No se pudo determinar una membresia activa para el empleado seleccionado.");
      }

      if (editingTaskId) {
        await updateTask(editingTaskId, {
          title: description.slice(0, 80),
          description,
          plannedStartDate: resolvedTaskPlannedStartDate,
          dueDate: resolvedTaskDueDate,
          taskPriorityId: 2,
          assigneeMembershipId,
          estimatedMinutes,
        });
        setSuccess("Tarea actualizada correctamente.");
      } else {
        const createResponse = await createTask({
          projectId: project.id,
          title: description.slice(0, 80),
          description,
          plannedStartDate: resolvedTaskPlannedStartDate,
          dueDate: resolvedTaskDueDate,
          taskPriorityId: 2,
          assigneeMembershipId,
          estimatedMinutes,
          recurrence: hasRecurrence
            ? {
                frequency: taskRecurrenceMode,
                every: recurrenceEveryValue,
                untilDate: taskRecurrenceUntilDate,
              }
            : undefined,
        });
        const createdCount = createResponse?.data?.createdCount ?? 1;
        setSuccess(
          createdCount > 1
            ? `Se crearon ${createdCount} tareas recurrentes.`
            : "Tarea creada correctamente.",
        );
      }

      resetTaskForm();
      setIsTaskModalOpen(false);
      await Promise.all([loadTasks(), loadMemberships()]);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible guardar la tarea.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (task: TaskSummary) => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await deleteTask(task.id);
      setSuccess("Tarea eliminada logicamente.");
      await loadTasks();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible eliminar la tarea.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeTaskTransition = async (
    taskId: number,
    toStatus: TaskWorkflowStatus,
    completionPayload?: { actualMinutes: number; completionEvidence: string | null },
  ) => {
    const taskToMove = tasks.find((task) => task.id === taskId);
    if (!taskToMove) {
      return;
    }

    const currentStatus = getStatusKeyFromTask(taskToMove);
    if (!currentStatus || currentStatus === toStatus) {
      return;
    }
    const allowedTargets = WORKFLOW_TRANSITIONS[currentStatus];
    if (!allowedTargets.includes(toStatus)) {
      setError(getTransitionValidationMessage(currentStatus, toStatus));
      return;
    }

    const previousTasks = tasks;
    const optimisticStatusLabel = WORKFLOW_LABELS[toStatus];

    setError("");
    setSuccess("");
    setMovingTaskId(taskId);
    setTasks((currentTasks) => {
      const moved = currentTasks.map((task) => (
        task.id === taskId
          ? {
              ...task,
              status: optimisticStatusLabel,
            }
          : task
      ));

      if (taskStatusFilter !== "all" && toStatus !== taskStatusFilter) {
        return moved.filter((task) => task.id !== taskId);
      }

      return moved;
    });

    try {
      const response = await transitionTaskStatus(taskId, {
        toStatus,
        notes: toStatus === "done" ? "Finalización confirmada desde modal de cierre." : null,
        actualMinutes: toStatus === "done" ? (completionPayload?.actualMinutes ?? null) : undefined,
        completionEvidence: toStatus === "done" ? (completionPayload?.completionEvidence ?? null) : undefined,
      });
      const updatedTask = response?.data?.task;

      if (!updatedTask) {
        throw new Error("Transition response missing task payload");
      }

      setTasks((currentTasks) => {
        const nextTasks = currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
        const alreadyPresent = nextTasks.some((task) => task.id === updatedTask.id);
        const shouldIncludeInFilter = taskStatusFilter === "all" || toStatus === taskStatusFilter;

        if (!alreadyPresent && shouldIncludeInFilter) {
          return [...nextTasks, updatedTask];
        }

        return nextTasks;
      });
      if (selectedTaskId === taskId) {
        void loadTaskHistory(taskId);
      }
      setSuccess(
        toStatus === "done"
          ? "Tarea finalizada con tiempo real confirmado."
          : `Tarea movida a ${WORKFLOW_LABELS[toStatus]}.`,
      );
      if (toStatus === "done") {
        setIsCompletionModalOpen(false);
        setPendingCompletionTask(null);
      }
    } catch (incomingError) {
      setTasks(previousTasks);
      if (incomingError instanceof ApiError) {
        if (incomingError.code === "TASK_TRANSITION_NOT_ALLOWED") {
          setError(getTransitionValidationMessage(currentStatus, toStatus));
        } else {
          const friendlyMessage = getTaskTransitionApiErrorMessage(incomingError.code);
          setError(friendlyMessage ?? incomingError.message);
        }
      } else {
        setError("No fue posible mover la tarea.");
      }
    } finally {
      setMovingTaskId(null);
      setIsCompletingTask(false);
    }
  };

  const handleTaskDrop = async (taskId: number, toStatus: TaskWorkflowStatus) => {
    const taskToMove = tasks.find((task) => task.id === taskId);
    if (!taskToMove) {
      return;
    }

    const currentStatus = getStatusKeyFromTask(taskToMove);
    if (!currentStatus) {
      return;
    }

    const allowedTargets = WORKFLOW_TRANSITIONS[currentStatus];
    if (!allowedTargets.includes(toStatus)) {
      setError(getTransitionValidationMessage(currentStatus, toStatus));
      return;
    }

    if (toStatus === "done") {
      setPendingCompletionTask(taskToMove);
      setIsCompletionModalOpen(true);
      return;
    }

    await executeTaskTransition(taskId, toStatus);
  };

  const handleConfirmTaskCompletion = async (payload: {
    actualMinutes: number;
    completionEvidence: string | null;
  }) => {
    if (!pendingCompletionTask) return;
    setIsCompletingTask(true);
    await executeTaskTransition(pendingCompletionTask.id, "done", payload);
  };

  const handleColumnDrop = (event: DragEvent<HTMLDivElement>, toStatus: TaskWorkflowStatus) => {
    event.preventDefault();
    const rawTaskId = event.dataTransfer.getData("application/task-id");
    const taskId = Number(rawTaskId);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return;
    }

    void handleTaskDrop(taskId, toStatus);
  };

  if (isLoading) {
    return <div className="size-full flex items-center justify-center">Cargando proyecto...</div>;
  }

  if (!project) {
    return (
      <div className="size-full flex flex-col items-center justify-center gap-3">
        <p className="text-foreground">Proyecto no disponible.</p>
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="app-btn-secondary"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-hero flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/projects")}
              className="p-2 hover:bg-secondary rounded-xl transition-colors text-foreground"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                Area: {project.areaName} · Estado: {project.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="app-content">
        <section className="app-panel overflow-hidden">
          <div className="app-panel-header">
            <h3 className="text-lg font-semibold text-foreground">Tareas del proyecto</h3>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setTaskViewMode("grid")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    taskViewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="size-3.5" />
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setTaskViewMode("kanban")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    taskViewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <KanbanSquare className="size-3.5" />
                  Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setTaskViewMode("analytics")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    taskViewMode === "analytics" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ChartPie className="size-3.5" />
                  Gráficas
                </button>
              </div>
              <select
                value={taskStatusFilter}
                onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)}
                className="app-control h-9 min-w-40"
              >
                <option value="all">Todas</option>
                <option value="assigned">Asignadas</option>
                <option value="in_progress">En proceso</option>
                <option value="done">Terminadas</option>
              </select>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsTaskReassignModalOpen(true)}
                    className="app-btn-secondary"
                  >
                    <RefreshCcw className="size-4" />
                    Tareas
                  </button>
                  <button
                    type="button"
                    onClick={openCreateTaskModal}
                    className="app-btn-primary"
                  >
                    <Plus className="size-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay tareas para este filtro.</div>
          ) : (
            <>
              {taskViewMode === "kanban" && (
                <div className="app-band p-5 border-b border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {KANBAN_COLUMNS.map((column) => (
                      <div
                        key={column.key}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleColumnDrop(event, column.key)}
                        className="rounded-xl border border-border bg-background/80 min-h-[220px] flex flex-col"
                      >
                        <div className="px-3 py-2 border-b border-border bg-primary/5 flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{column.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {kanbanTasks[column.key].length}
                          </span>
                        </div>
                        <div className="p-3 space-y-2 flex-1">
                          {kanbanTasks[column.key].length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin tareas</p>
                          ) : (
                            kanbanTasks[column.key].map((task) => (
                              <article
                                key={task.id}
                                draggable={movingTaskId === null}
                                onClick={() => handleSelectTask(task.id)}
                                onDragStart={(event) => {
                                  event.dataTransfer.setData("application/task-id", String(task.id));
                                  event.dataTransfer.effectAllowed = "move";
                                }}
                                className={`rounded-lg border bg-card p-3 shadow-sm transition-opacity ${
                                  selectedTaskId === task.id ? "border-primary ring-1 ring-primary/40" : "border-border"
                                } ${
                                  movingTaskId === task.id ? "opacity-50" : ""
                                }`}
                              >
                                <p className="text-sm font-medium text-foreground">{task.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.assigneeName
                                    ? `${task.assigneeName} · ${task.priority}`
                                    : `Sin asignar · ${task.priority}`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Limite: {task.dueDate}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Real: {formatMinutes(task.actualMinutes)}
                                </p>
                                {task.completionEvidence ? (
                                  <p className="text-xs text-primary mt-1 line-clamp-1">
                                    Evidencia: {task.completionEvidence}
                                  </p>
                                ) : null}
                                <p className={`text-xs mt-1 ${getComplianceBadge(task).className}`}>
                                  {getComplianceBadge(task).label}
                                </p>
                              </article>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {taskViewMode === "grid" && (
                <div className="overflow-x-auto">
                  <table className="app-table">
                    <thead className="app-table-head">
                      <tr>
                        <th className="app-th">Tarea</th>
                        <th className="app-th">Estado</th>
                        <th className="app-th">Prioridad</th>
                        <th className="app-th">Asignado</th>
                        <th className="app-th">Fechas</th>
                        <th className="app-th">Estimado</th>
                        <th className="app-th">Real</th>
                        <th className="app-th">Cumplimiento</th>
                        {isAdmin && <th className="app-th">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr
                          key={task.id}
                          className={`app-row cursor-pointer ${
                            selectedTaskId === task.id ? "bg-primary/5" : ""
                          }`}
                          onClick={() => handleSelectTask(task.id)}
                        >
                          <td className="app-td">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-muted-foreground">{task.description ?? "Sin descripcion"}</p>
                            {task.completionEvidence ? (
                              <p className="mt-1 text-xs text-primary line-clamp-1">
                                Evidencia: {task.completionEvidence}
                              </p>
                            ) : null}
                          </td>
                          <td className="app-td">{task.status}</td>
                          <td className="app-td">{task.priority}</td>
                          <td className="app-td">
                            {task.assigneeName ? `${task.assigneeName} (${task.assigneeEmail})` : "Sin asignar"}
                          </td>
                          <td className="app-td">
                            <p>Inicio: {task.plannedStartDate}</p>
                            <p>Limite: {task.dueDate}</p>
                          </td>
                          <td className="app-td">
                            {task.estimatedMinutes ? `${task.estimatedMinutes} min` : "-"}
                          </td>
                          <td className="app-td">{formatMinutes(task.actualMinutes)}</td>
                          <td className="app-td">
                            <span className={getComplianceBadge(task).className}>
                              {getComplianceBadge(task).label}
                            </span>
                            {task.deviationMinutes !== null && (
                              <p className="text-xs text-muted-foreground">
                                Desvio: {task.deviationMinutes > 0 ? "+" : ""}{task.deviationMinutes} min
                              </p>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="app-td">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => startTaskEdit(task)}
                                  className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
                                  aria-label="Editar tarea"
                                  title="Editar"
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteTask(task)}
                                  className="inline-flex size-8 items-center justify-center rounded-md border border-destructive/45 bg-destructive/12 text-destructive transition-colors hover:bg-destructive/18"
                                  aria-label="Eliminar tarea"
                                  title="Eliminar"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {taskViewMode === "analytics" && (
                <div className="p-5 space-y-4">
                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-xl border border-border bg-background/95 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{projectTaskAnalytics.completedLast7} finalizadas</p>
                          <p className="text-xs text-muted-foreground">en los últimos 7 días</p>
                        </div>
                        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-success/14 text-success">
                          <CheckCircle2 className="size-4" />
                        </span>
                      </div>
                    </article>

                    <article className="rounded-xl border border-border bg-background/95 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{projectTaskAnalytics.updatedLast7} actualizadas</p>
                          <p className="text-xs text-muted-foreground">en los últimos 7 días</p>
                        </div>
                        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/14 text-primary">
                          <RefreshCcw className="size-4" />
                        </span>
                      </div>
                    </article>

                    <article className="rounded-xl border border-border bg-background/95 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{projectTaskAnalytics.createdLast7} creadas</p>
                          <p className="text-xs text-muted-foreground">en los últimos 7 días</p>
                        </div>
                        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-accent/14 text-accent">
                          <FilePlus2 className="size-4" />
                        </span>
                      </div>
                    </article>

                    <article className="rounded-xl border border-border bg-background/95 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{projectTaskAnalytics.dueSoonNext7} vencen pronto</p>
                          <p className="text-xs text-muted-foreground">en los próximos 7 días</p>
                        </div>
                        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-warning/14 text-warning">
                          <CalendarClock className="size-4" />
                        </span>
                      </div>
                    </article>
                  </section>

                  <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <article className="rounded-xl border border-border bg-background p-4">
                      <h4 className="text-base font-semibold text-foreground">Resumen de estado</h4>
                      <p className="text-sm text-muted-foreground">Instantánea del estado actual de las tareas.</p>
                      <div className="mt-3 grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_210px]">
                        <ChartContainer config={statusChartConfig} className="h-[240px] w-full">
                          <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                            <Pie
                              data={taskStatusDistribution}
                              dataKey="value"
                              nameKey="status"
                              innerRadius={52}
                              outerRadius={86}
                              strokeWidth={2}
                            />
                          </PieChart>
                        </ChartContainer>
                        <div className="space-y-2">
                          {taskStatusDistribution.map((statusItem) => (
                            <div key={statusItem.status} className="flex items-center justify-between gap-2 text-sm">
                              <span className="inline-flex items-center gap-2 text-muted-foreground">
                                <span className="size-2.5 rounded-sm" style={{ backgroundColor: statusItem.fill }} />
                                {statusItem.status}
                              </span>
                              <span className="font-semibold text-foreground">{statusItem.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>

                    <article className="rounded-xl border border-border bg-background p-4">
                      <h4 className="text-base font-semibold text-foreground">Actividad reciente</h4>
                      <p className="text-sm text-muted-foreground">Últimos cambios registrados dentro del proyecto.</p>
                      <div className="mt-3 space-y-2">
                        {projectTaskAnalytics.recentActivity.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
                        ) : (
                          projectTaskAnalytics.recentActivity.map((activity) => (
                            <article
                              key={activity.id}
                              className="flex items-start gap-3 rounded-lg border border-border/80 bg-card/65 px-3 py-2.5"
                            >
                              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/14 text-xs font-bold text-primary">
                                {activity.assigneeName.slice(0, 1).toUpperCase()}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground">
                                  <span className="font-semibold">{activity.assigneeName}</span>
                                  {" "}
                                  {activity.action}
                                  {" "}
                                  <span className="font-semibold text-primary">{activity.title}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{activity.relativeTime} · {activity.status}</p>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </article>

                    <article className="rounded-xl border border-border bg-background p-4">
                      <h4 className="text-base font-semibold text-foreground">Desglose de prioridad</h4>
                      <p className="text-sm text-muted-foreground">Distribución actual por nivel de prioridad.</p>
                      <ChartContainer config={barChartConfig} className="h-[260px] w-full">
                        <BarChart data={taskPriorityDistribution}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} tareas`} />} />
                          <Bar dataKey="tareas" fill="var(--color-tareas)" radius={8} />
                        </BarChart>
                      </ChartContainer>
                    </article>

                    <article className="rounded-xl border border-border bg-background p-4">
                      <h4 className="text-base font-semibold text-foreground">Tareas por empleado</h4>
                      <p className="text-sm text-muted-foreground">Carga operativa de los miembros del proyecto.</p>
                      <div className="mt-4 space-y-3">
                        {projectTaskAnalytics.tasksByEmployee.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin tareas asignadas para este proyecto.</p>
                        ) : (
                          projectTaskAnalytics.tasksByEmployee.map((row) => (
                            <div key={row.name} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="truncate text-foreground">{row.name}</span>
                                <span className="text-muted-foreground">{row.count} tareas</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-secondary/80">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${Math.max(8, row.percent)}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  </section>
                </div>
              )}
            </>
          )}
        </section>

      </div>

      <Dialog open={isTaskReassignModalOpen} onOpenChange={setIsTaskReassignModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reasignar tareas del proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reasigna todas las tareas pendientes de un empleado a otro
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Empleado origen</label>
                <select
                  value={sourceEmployeeId}
                  onChange={(event) => setSourceEmployeeId(event.target.value)}
                  className="app-control"
                >
                  <option value="">Selecciona empleado</option>
                  {taskReassignSourceOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Empleado destino</label>
                <select
                  value={targetEmployeeId}
                  onChange={(event) => setTargetEmployeeId(event.target.value)}
                  className="app-control"
                >
                  <option value="">Selecciona empleado</option>
                  {taskReassignTargetOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setIsTaskReassignModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="app-btn-primary"
                onClick={() => {
                  void handleReassignTasks();
                }}
                disabled={isSubmitting}
              >
                Reasignar tareas
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTaskModalOpen}
        onOpenChange={(open) => {
          setIsTaskModalOpen(open);
          if (!open && !isSubmitting) {
            resetTaskForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTaskId ? "Editar tarea" : "Crear tarea"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleTaskSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Descripcion</label>
              <textarea
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
                className="app-control min-h-24"
                rows={3}
                placeholder="Describe brevemente la tarea"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimacion de horas</label>
              <input
                type="number"
                min={1}
                step="0.5"
                value={taskEstimatedHours}
                onChange={(event) => setTaskEstimatedHours(event.target.value)}
                className="app-control"
                placeholder="Ejemplo: 4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grupo/Area</label>
              <select
                value={taskAreaId}
                onChange={(event) => {
                  setTaskAreaId(event.target.value);
                  setTaskAssigneeEmployeeId("");
                }}
                className="app-control"
              >
                <option value="">Selecciona grupo/area</option>
                {taskAreaOptions.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={taskPlannedStartDate}
                onChange={(event) => setTaskPlannedStartDate(event.target.value)}
                className="app-control"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de fin</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
                className="app-control"
              />
            </div>
            {!editingTaskId && (
              <div className="md:col-span-2 rounded-xl border border-border bg-background/70 p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Repetición (opcional)</label>
                    <select
                      value={taskRecurrenceMode}
                      onChange={(event) => setTaskRecurrenceMode(event.target.value as TaskRecurrenceMode)}
                      className="app-control"
                    >
                      <option value="none">No repetir</option>
                      <option value="daily">Cada día</option>
                      <option value="weekly">Cada semana</option>
                      <option value="monthly">Cada mes</option>
                      <option value="range_interval">Rango cada cierto tiempo</option>
                    </select>
                  </div>

                  {taskRecurrenceMode !== "none" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Cada cuántos {taskRecurrenceMode === "weekly"
                            ? "semanas"
                            : taskRecurrenceMode === "monthly"
                              ? "meses"
                              : "días"}
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={taskRecurrenceEvery}
                          onChange={(event) => setTaskRecurrenceEvery(event.target.value)}
                          className="app-control"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Repetir hasta</label>
                        <input
                          type="date"
                          value={taskRecurrenceUntilDate}
                          onChange={(event) => setTaskRecurrenceUntilDate(event.target.value)}
                          className="app-control"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Empleado</label>
              <Popover open={isTaskAssigneeSelectOpen} onOpenChange={setIsTaskAssigneeSelectOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-expanded={isTaskAssigneeSelectOpen}
                    className="app-control inline-flex h-10 w-full items-center justify-between gap-2 bg-card/95"
                    disabled={taskAssigneeSearchOptions.length === 0}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Search className={cn("size-4 shrink-0", isTaskAssigneeSelectOpen ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("truncate", selectedTaskAssigneeOption ? "text-foreground" : "text-muted-foreground")}>
                        {selectedTaskAssigneeOption?.label ?? "Buscar empleado..."}
                      </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  avoidCollisions={false}
                  sideOffset={6}
                  className="z-[120] w-[var(--radix-popover-trigger-width)] border-border/90 bg-card/98 p-0"
                >
                  <Command className="bg-card">
                    <CommandInput
                      value={taskAssigneeSearchTerm}
                      onValueChange={setTaskAssigneeSearchTerm}
                      placeholder="Buscar empleado..."
                    />
                    <CommandList>
                      <CommandEmpty>Sin empleados disponibles.</CommandEmpty>
                      <CommandGroup>
                        {visibleTaskAssigneeOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.label}
                            onSelect={() => {
                              setTaskAssigneeEmployeeId(option.value);
                              setTaskAssigneeSearchTerm("");
                              setIsTaskAssigneeSelectOpen(false);
                            }}
                            className="gap-2"
                          >
                            <Check
                              className={cn(
                                "size-4 text-primary transition-opacity",
                                taskAssigneeEmployeeId === option.value ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="truncate">{option.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {taskAreaId && taskAssigneeEmployeeOptions.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  No hay empleados activos asignados a esa area.
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsTaskModalOpen(false);
                  resetTaskForm();
                }}
                className="app-btn-secondary"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="app-btn-primary"
              >
                {isSubmitting ? "Guardando..." : editingTaskId ? "Actualizar" : "Crear tarea"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProjectDetailModalOpen} onOpenChange={setIsProjectDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del proyecto</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <p><span className="font-medium">Nombre:</span> {project.name}</p>
            <p><span className="font-medium">Area:</span> {project.areaName}</p>
            <p><span className="font-medium">Estado:</span> {project.status}</p>
            <p><span className="font-medium">Descripcion:</span> {project.description ?? "Sin descripcion"}</p>
            <p><span className="font-medium">Inicio:</span> {project.startDate ?? "-"}</p>
            <p><span className="font-medium">Fin:</span> {project.endDate ?? "-"}</p>
            <p><span className="font-medium">Cierre:</span> {project.closedAt ?? "-"}</p>
            <p><span className="font-medium">Miembros activos:</span> {project.activeMemberCount}</p>
            <p><span className="font-medium">Tareas activas:</span> {project.totalTaskCount}</p>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={pendingDeleteTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteTask(null);
          }
        }}
        title="Eliminar tarea"
        description={
          pendingDeleteTask
            ? `Se eliminará lógicamente "${pendingDeleteTask.title}".`
            : ""
        }
        confirmLabel="Eliminar"
        variant="destructive"
        isProcessing={isSubmitting}
        onConfirm={() => {
          if (!pendingDeleteTask) {
            return;
          }
          const taskToDelete = pendingDeleteTask;
          setPendingDeleteTask(null);
          void handleDeleteTask(taskToDelete);
        }}
      />

      <TaskCompletionDialog
        open={isCompletionModalOpen}
        onOpenChange={(open) => {
          setIsCompletionModalOpen(open);
          if (!open && !isCompletingTask) {
            setPendingCompletionTask(null);
          }
        }}
        taskTitle={pendingCompletionTask?.title ?? "Tarea"}
        initialActualMinutes={pendingCompletionTask?.reportedActualMinutes ?? pendingCompletionTask?.actualMinutes ?? pendingCompletionTask?.estimatedMinutes ?? null}
        isSubmitting={isCompletingTask}
        onConfirm={handleConfirmTaskCompletion}
      />
    </div>
  );
}
