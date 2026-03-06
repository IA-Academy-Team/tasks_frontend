import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../shared/api/api";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [reassignMembershipId, setReassignMembershipId] = useState("");
  const [reassignEmployeeId, setReassignEmployeeId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPlannedStartDate, setTaskPlannedStartDate] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstimatedMinutes, setTaskEstimatedMinutes] = useState("");
  const [taskAssigneeMembershipId, setTaskAssigneeMembershipId] = useState("");
  const [taskPriorityId, setTaskPriorityId] = useState("2");
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryEntry[]>([]);
  const [isLoadingTaskHistory, setIsLoadingTaskHistory] = useState(false);
  const [pendingUnassignMembership, setPendingUnassignMembership] = useState<ProjectMembership | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskSummary | null>(null);

  const numericProjectId = Number(projectId);

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskPlannedStartDate("");
    setTaskDueDate("");
    setTaskEstimatedMinutes("");
    setTaskAssigneeMembershipId("");
    setTaskPriorityId("2");
  };

  const loadProject = async () => {
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
  };

  const loadMemberships = async () => {
    if (!Number.isInteger(numericProjectId) || numericProjectId <= 0) return;
    try {
      const response = await listProjectMemberships(numericProjectId, membershipStatusFilter);
      setMemberships(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar las membresias.");
      }
    }
  };

  const loadTasks = async () => {
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
  };

  const loadEmployees = async () => {
    try {
      const response = await listEmployees("active");
      setEmployees(response?.data ?? []);
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await Promise.all([loadProject(), loadMemberships(), loadEmployees(), loadTasks()]);
      setIsLoading(false);
    };
    void initialize();
  }, [projectId]);

  useEffect(() => {
    void loadMemberships();
  }, [membershipStatusFilter, projectId]);

  useEffect(() => {
    void loadTasks();
  }, [taskStatusFilter, projectId]);

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
    if (!project) return [];
    return employees.filter((employee) => employee.currentAreaId === project.areaId);
  }, [employees, project]);

  const activeMemberships = useMemo(
    () => memberships.filter((membership) => membership.isActive),
    [memberships],
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

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const loadTaskHistory = async (taskId: number) => {
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
  };

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
  }, [searchParams, selectedTaskId, tasks]);

  const handleAssign = async () => {
    const employeeId = Number(assignEmployeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0 || !project) {
      setError("Selecciona un empleado valido para asignar.");
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
      setError("Selecciona una membresia activa para reasignar.");
      return;
    }

    if (!Number.isInteger(toEmployeeId) || toEmployeeId <= 0) {
      setError("Selecciona un empleado destino valido.");
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
    setSelectedTaskId(task.id);
    void loadTaskHistory(task.id);
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description ?? "");
    setTaskPlannedStartDate(task.plannedStartDate);
    setTaskDueDate(task.dueDate);
    setTaskEstimatedMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : "");
    setTaskAssigneeMembershipId(task.assigneeMembershipId ? String(task.assigneeMembershipId) : "");
    setTaskPriorityId(String(task.taskPriorityId));
    setError("");
    setSuccess("");
  };

  const handleTaskSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!project) return;

    const title = taskTitle.trim();
    if (!title) {
      setError("El titulo de la tarea es obligatorio.");
      return;
    }

    if (!taskPlannedStartDate || !taskDueDate) {
      setError("Las fechas planificadas son obligatorias.");
      return;
    }

    const estimatedMinutes = taskEstimatedMinutes.trim()
      ? Number(taskEstimatedMinutes)
      : null;
    const assigneeMembershipId = taskAssigneeMembershipId
      ? Number(taskAssigneeMembershipId)
      : null;
    const priorityId = Number(taskPriorityId);

    if (estimatedMinutes !== null && (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0)) {
      setError("El tiempo estimado debe ser un entero positivo.");
      return;
    }

    if (!Number.isInteger(priorityId) || priorityId <= 0) {
      setError("Selecciona una prioridad valida.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      if (editingTaskId) {
        await updateTask(editingTaskId, {
          title,
          description: taskDescription.trim() || null,
          plannedStartDate: taskPlannedStartDate,
          dueDate: taskDueDate,
          taskPriorityId: priorityId,
          assigneeMembershipId,
          estimatedMinutes,
        });
        setSuccess("Tarea actualizada correctamente.");
      } else {
        await createTask({
          projectId: project.id,
          title,
          description: taskDescription.trim() || null,
          plannedStartDate: taskPlannedStartDate,
          dueDate: taskDueDate,
          taskPriorityId: priorityId,
          assigneeMembershipId,
          estimatedMinutes,
        });
        setSuccess("Tarea creada correctamente.");
      }

      resetTaskForm();
      await loadTasks();
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
        <p className="text-foreground">No fue posible cargar el proyecto.</p>
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

      <div className="app-content">
        <section className="app-panel app-panel-pad">
          <h3 className="text-lg font-semibold text-foreground mb-3">Detalle basico</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <p><span className="font-medium">Descripcion:</span> {project.description ?? "Sin descripcion"}</p>
            <p><span className="font-medium">Inicio:</span> {project.startDate ?? "-"}</p>
            <p><span className="font-medium">Fin:</span> {project.endDate ?? "-"}</p>
            <p><span className="font-medium">Cierre:</span> {project.closedAt ?? "-"}</p>
            <p><span className="font-medium">Miembros activos:</span> {project.activeMemberCount}</p>
            <p><span className="font-medium">Tareas activas:</span> {project.totalTaskCount}</p>
          </div>
        </section>

        {isAdmin && (
          <section className="app-panel app-panel-pad space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Asignaciones del proyecto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Asignar empleado</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={assignEmployeeId}
                    onChange={(event) => setAssignEmployeeId(event.target.value)}
                    className="app-control min-w-[220px]"
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
                <p className="text-xs text-muted-foreground mt-2">
                  Solo se listan empleados activos cuya area actual coincide con la del proyecto.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Reasignar membresia activa</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={reassignMembershipId}
                    onChange={(event) => setReassignMembershipId(event.target.value)}
                    className="app-control min-w-[220px]"
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
                    className="app-control min-w-[220px]"
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
          </section>
        )}

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

          {memberships.length === 0 ? (
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
                  {memberships.map((membership) => (
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
          </div>

          {isAdmin && (
            <div className="p-5 border-b border-border">
              <h4 className="font-medium mb-3">
                {editingTaskId ? "Editar tarea" : "Crear tarea"}
              </h4>
              <form onSubmit={handleTaskSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Titulo</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    className="app-control"
                    placeholder="Titulo de la tarea"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Descripcion</label>
                  <textarea
                    value={taskDescription}
                    onChange={(event) => setTaskDescription(event.target.value)}
                    className="app-control min-h-24"
                    rows={3}
                    placeholder="Descripcion breve"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Inicio planificado</label>
                  <input
                    type="date"
                    value={taskPlannedStartDate}
                    onChange={(event) => setTaskPlannedStartDate(event.target.value)}
                    className="app-control"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha limite</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(event) => setTaskDueDate(event.target.value)}
                    className="app-control"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prioridad</label>
                  <select
                    value={taskPriorityId}
                    onChange={(event) => setTaskPriorityId(event.target.value)}
                    className="app-control"
                  >
                    <option value="1">Baja</option>
                    <option value="2">Media</option>
                    <option value="3">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Asignado a</label>
                  <select
                    value={taskAssigneeMembershipId}
                    onChange={(event) => setTaskAssigneeMembershipId(event.target.value)}
                    className="app-control"
                  >
                    <option value="">Sin asignar</option>
                    {activeMemberships.map((membership) => (
                      <option key={membership.id} value={membership.id}>
                        {membership.employeeName} ({membership.employeeEmail})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Tiempo estimado (minutos)</label>
                  <input
                    type="number"
                    min={1}
                    value={taskEstimatedMinutes}
                    onChange={(event) => setTaskEstimatedMinutes(event.target.value)}
                    className="app-control"
                    placeholder="Ejemplo: 90"
                  />
                </div>
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="app-btn-primary"
                  >
                    {editingTaskId ? "Actualizar tarea" : "Crear tarea"}
                  </button>
                  {editingTaskId && (
                    <button
                      type="button"
                      onClick={resetTaskForm}
                      className="app-btn-secondary"
                    >
                      Cancelar edicion
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

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

          {tasks.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay tareas para este filtro.</div>
          ) : (
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

          <div className="app-band p-5 border-t border-border">
            <h4 className="font-medium text-foreground mb-2">Historial de estados</h4>
            {!selectedTask ? (
              <p className="text-sm text-muted-foreground">
                Selecciona una tarea en la tabla o en el Kanban para consultar su historial.
              </p>
            ) : isLoadingTaskHistory ? (
              <p className="text-sm text-muted-foreground">Cargando historial de "{selectedTask.title}"...</p>
            ) : taskHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                La tarea "{selectedTask.title}" no tiene eventos de estado.
              </p>
            ) : (
              <div className="space-y-2">
                {taskHistory.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {entry.fromStatus ?? "Inicio"} → {entry.toStatus}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(entry.changedAt).toLocaleString()} · {entry.changedByName} ({entry.changedByEmail})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nota: {entry.notes ?? "Sin nota"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}
      </div>

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
