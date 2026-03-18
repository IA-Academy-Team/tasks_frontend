import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ChartPie, KanbanSquare, LayoutGrid, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../shared/api/api";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
  reassignProjectMembership,
  unassignProjectMembership,
  type MembershipStatusFilter,
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

const complianceChartConfig = {
  "En tiempo": { label: "En tiempo", color: "var(--chart-2)" },
  "Atraso estimado": { label: "Atraso estimado", color: "var(--chart-4)" },
  "Atraso por fecha": { label: "Atraso por fecha", color: "var(--chart-5)" },
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
  const [membershipStatusFilter, setMembershipStatusFilter] = useState<MembershipStatusFilter>("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>("all");
  const [taskViewMode, setTaskViewMode] = useState<ProjectTaskViewMode>("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [reassignMembershipId, setReassignMembershipId] = useState("");
  const [reassignEmployeeId, setReassignEmployeeId] = useState("");
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
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryEntry[]>([]);
  const [isLoadingTaskHistory, setIsLoadingTaskHistory] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [pendingUnassignMembership, setPendingUnassignMembership] = useState<ProjectMembership | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskSummary | null>(null);

  const numericProjectId = Number(projectId);

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskDescription("");
    setTaskPlannedStartDate("");
    setTaskDueDate("");
    setTaskEstimatedHours("");
    setTaskAreaId(project ? String(project.areaId) : "");
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
    try {
      const response = await listEmployees("active");
      setEmployees(response?.data ?? []);
    } catch {
      setEmployees([]);
    }
  }, []);

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
    return employees.filter((employee) => employee.role === "employee" && employee.isActive);
  }, [employees]);

  const activeMemberships = useMemo(
    () => memberships.filter((membership) => membership.isActive),
    [memberships],
  );

  const visibleMemberships = useMemo(() => {
    if (membershipStatusFilter === "active") {
      return memberships.filter((membership) => membership.isActive);
    }

    if (membershipStatusFilter === "inactive") {
      return memberships.filter((membership) => !membership.isActive);
    }

    return memberships;
  }, [membershipStatusFilter, memberships]);

  const taskAreaOptions = useMemo(() => {
    const options = new Map<number, string>();

    if (project) {
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
    if (!Number.isInteger(selectedAreaId) || selectedAreaId <= 0) {
      return [];
    }

    return employees.filter((employee) => (
      employee.role === "employee"
      && employee.isActive
      && (employee.currentAreaId === selectedAreaId || employee.areaIds.includes(selectedAreaId))
    ));
  }, [employees, taskAreaId]);

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

  const taskComplianceDistribution = useMemo(() => {
    const counters = {
      onTime: 0,
      estimateDelayed: 0,
      dateOverdue: 0,
    };

    tasks.forEach((task) => {
      if (task.isDateOverdue) {
        counters.dateOverdue += 1;
        return;
      }

      if (task.isEstimateDelayed === true) {
        counters.estimateDelayed += 1;
        return;
      }

      counters.onTime += 1;
    });

    return [
      { status: "En tiempo", value: counters.onTime, fill: "var(--chart-2)" },
      { status: "Atraso estimado", value: counters.estimateDelayed, fill: "var(--chart-4)" },
      { status: "Atraso por fecha", value: counters.dateOverdue, fill: "var(--chart-5)" },
    ];
  }, [tasks]);

  const taskPriorityDistribution = useMemo(() => {
    const counters = new Map<string, number>();

    tasks.forEach((task) => {
      counters.set(task.priority, (counters.get(task.priority) ?? 0) + 1);
    });

    return [...counters.entries()].map(([name, tareas]) => ({ name, tareas }));
  }, [tasks]);

  const taskAssigneeWorkload = useMemo(() => {
    const counters = new Map<string, number>();

    tasks.forEach((task) => {
      if (getStatusKeyFromTask(task) === "done") return;
      const key = task.assigneeName ?? "Sin asignar";
      counters.set(key, (counters.get(key) ?? 0) + 1);
    });

    return [...counters.entries()]
      .map(([name, tareas]) => ({ name, tareas }))
      .sort((a, b) => b.tareas - a.tareas)
      .slice(0, 8);
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

  const handleAssign = async () => {
    const employeeId = Number(assignEmployeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0 || !project) {
      toast.error("Selecciona un empleado valido para asignar.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await assignProjectMembership(project.id, { employeeId });
      setSuccess("Membresia asignada correctamente.");
      setAssignEmployeeId("");
      await loadMemberships();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible asignar la membresia.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async (membership: ProjectMembership) => {
    if (!project) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await unassignProjectMembership(project.id, membership.id);
      setSuccess("Membresia desasignada.");
      await loadMemberships();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible desasignar la membresia.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!project) return;
    const membershipId = Number(reassignMembershipId);
    const toEmployeeId = Number(reassignEmployeeId);

    if (!Number.isInteger(membershipId) || membershipId <= 0) {
      toast.error("Selecciona una membresia activa para reasignar.");
      return;
    }

    if (!Number.isInteger(toEmployeeId) || toEmployeeId <= 0) {
      toast.error("Selecciona un empleado destino valido.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await reassignProjectMembership(project.id, membershipId, { toEmployeeId });
      setSuccess("Membresia reasignada correctamente.");
      setReassignMembershipId("");
      setReassignEmployeeId("");
      await loadMemberships();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible reasignar la membresia.");
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
        : project
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
    if (project) {
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

    if (!taskPlannedStartDate || !taskDueDate) {
      toast.error("Las fechas planificadas son obligatorias.");
      return;
    }

    const selectedAreaId = Number(taskAreaId);
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

    if (!Number.isInteger(selectedAreaId) || selectedAreaId <= 0) {
      toast.error("Selecciona un grupo/area.");
      return;
    }

    if (estimatedHours !== null && (!Number.isFinite(estimatedHours) || estimatedHours <= 0)) {
      toast.error("La estimacion de horas debe ser positiva.");
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

      if (taskRecurrenceUntilDate < taskDueDate) {
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
          plannedStartDate: taskPlannedStartDate,
          dueDate: taskDueDate,
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
          plannedStartDate: taskPlannedStartDate,
          dueDate: taskDueDate,
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

  const handleTaskDrop = async (taskId: number, toStatus: TaskWorkflowStatus) => {
    const taskToMove = tasks.find((task) => task.id === taskId);
    if (!taskToMove) {
      return;
    }

    const currentStatus = getStatusKeyFromTask(taskToMove);
    if (!currentStatus || currentStatus === toStatus) {
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
      const response = await transitionTaskStatus(taskId, { toStatus });
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
      setSuccess(`Tarea movida a ${WORKFLOW_LABELS[toStatus]}.`);
    } catch (incomingError) {
      setTasks(previousTasks);
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible mover la tarea.");
      }
    } finally {
      setMovingTaskId(null);
    }
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
            <h3 className="text-lg font-semibold text-foreground">Miembros del proyecto</h3>
            <select
              value={membershipStatusFilter}
              onChange={(event) => setMembershipStatusFilter(event.target.value as MembershipStatusFilter)}
              className="app-control h-9 min-w-36"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Historicos</option>
            </select>
          </div>

          {isAdmin && (
            <div className="p-4 border-b border-border space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Asignar empleado</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={assignEmployeeId}
                      onChange={(event) => setAssignEmployeeId(event.target.value)}
                      className="app-control min-w-[260px]"
                    >
                      <option value="">Selecciona empleado</option>
                      {assignableEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        void handleAssign();
                      }}
                      className="app-btn-primary"
                    >
                      Asignar
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Reasignar membresia activa</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={reassignMembershipId}
                      onChange={(event) => setReassignMembershipId(event.target.value)}
                      className="app-control min-w-[240px]"
                    >
                      <option value="">Selecciona membresia</option>
                      {activeMemberships.map((membership) => (
                        <option key={membership.id} value={membership.id}>
                          {membership.employeeName} ({membership.employeeEmail})
                        </option>
                      ))}
                    </select>
                    <select
                      value={reassignEmployeeId}
                      onChange={(event) => setReassignEmployeeId(event.target.value)}
                      className="app-control min-w-[240px]"
                    >
                      <option value="">Empleado destino</option>
                      {assignableEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        void handleReassign();
                      }}
                      className="app-btn-secondary disabled:opacity-70"
                    >
                      Reasignar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {visibleMemberships.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay membresias para este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-th">Empleado</th>
                    <th className="app-th">Area actual</th>
                    <th className="app-th">Estado</th>
                    <th className="app-th">Asignado</th>
                    <th className="app-th">Desasignado</th>
                    {isAdmin && <th className="app-th">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleMemberships.map((membership) => (
                    <tr key={membership.id} className="app-row">
                      <td className="app-td">
                        <p className="font-medium">{membership.employeeName}</p>
                        <p className="text-muted-foreground">{membership.employeeEmail}</p>
                      </td>
                      <td className="app-td">{membership.currentAreaName ?? "Sin area activa"}</td>
                      <td className="app-td">
                        <span className={membership.isActive ? "text-success" : "text-warning"}>
                          {membership.isActive ? "Activa" : "Finalizada"}
                        </span>
                      </td>
                      <td className="app-td">{new Date(membership.assignedAt).toLocaleString()}</td>
                      <td className="app-td">
                        {membership.unassignedAt
                          ? new Date(membership.unassignedAt).toLocaleString()
                          : "-"}
                      </td>
                      {isAdmin && (
                        <td className="app-td">
                          {membership.isActive ? (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => setPendingUnassignMembership(membership)}
                              className="app-action-link-danger disabled:opacity-70"
                            >
                              Desasignar
                            </button>
                          ) : (
                            <span className="text-muted-foreground">Sin acciones</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
                  Cuadrícula
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
                <button
                  type="button"
                  onClick={openCreateTaskModal}
                  className="app-btn-primary"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay tareas para este filtro.</div>
          ) : (
            <>
              {taskViewMode === "kanban" && (
                <div className="app-band p-5 border-b border-border">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="font-medium text-foreground">Tablero Kanban</h4>
                    <p className="text-xs text-muted-foreground">
                      Flujo permitido: Asignada → En proceso → Terminada
                    </p>
                  </div>
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
                                  className="app-action-link"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteTask(task)}
                                  className="app-action-link-danger"
                                >
                                  Eliminar
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
                  <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <article className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-muted-foreground">Total de tareas</p>
                      <p className="text-2xl font-semibold text-foreground">{tasks.length}</p>
                    </article>
                    <article className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-muted-foreground">Pendientes</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {kanbanTasks.assigned.length + kanbanTasks.in_progress.length}
                      </p>
                    </article>
                    <article className="rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-xs text-muted-foreground">Retrasadas / vencidas</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {taskComplianceDistribution[1].value + taskComplianceDistribution[2].value}
                      </p>
                    </article>
                  </section>

                  <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <article className="rounded-xl border border-border bg-background p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Distribución por estado</h4>
                      <ChartContainer config={statusChartConfig} className="h-[260px] w-full">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                          <Pie
                            data={taskStatusDistribution}
                            dataKey="value"
                            nameKey="status"
                            innerRadius={55}
                            outerRadius={90}
                            strokeWidth={2}
                          />
                        </PieChart>
                      </ChartContainer>
                    </article>

                    <article className="rounded-xl border border-border bg-background p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Cumplimiento de tiempos</h4>
                      <ChartContainer config={complianceChartConfig} className="h-[260px] w-full">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                          <Pie
                            data={taskComplianceDistribution}
                            dataKey="value"
                            nameKey="status"
                            innerRadius={55}
                            outerRadius={90}
                            strokeWidth={2}
                          />
                        </PieChart>
                      </ChartContainer>
                    </article>

                    <article className="rounded-xl border border-border bg-background p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Prioridad de tareas</h4>
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
                      <h4 className="text-sm font-semibold text-foreground mb-3">Carga por responsable (activas)</h4>
                      <ChartContainer config={barChartConfig} className="h-[260px] w-full">
                        <BarChart data={taskAssigneeWorkload}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} tareas`} />} />
                          <Bar dataKey="tareas" fill="var(--color-tareas)" radius={8} />
                        </BarChart>
                      </ChartContainer>
                    </article>
                  </section>
                </div>
              )}
            </>
          )}
        </section>

      </div>

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
              <select
                value={taskAssigneeEmployeeId}
                onChange={(event) => setTaskAssigneeEmployeeId(event.target.value)}
                className="app-control"
                disabled={taskAssigneeEmployeeOptions.length === 0}
              >
                <option value="">Selecciona empleado</option>
                {taskAssigneeEmployeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.email})
                  </option>
                ))}
              </select>
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
        open={pendingUnassignMembership !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingUnassignMembership(null);
          }
        }}
        title="Desasignar miembro"
        description={
          pendingUnassignMembership
            ? `Se desasignará a ${pendingUnassignMembership.employeeName} del proyecto.`
            : ""
        }
        confirmLabel="Desasignar"
        variant="destructive"
        isProcessing={isSubmitting}
        onConfirm={() => {
          if (!pendingUnassignMembership) {
            return;
          }
          const membershipToUnassign = pendingUnassignMembership;
          setPendingUnassignMembership(null);
          void handleUnassign(membershipToUnassign);
        }}
      />

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
    </div>
  );
}
