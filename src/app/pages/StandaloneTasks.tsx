import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock3, ListFilter, Plus, Search, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { ApiError } from "../../shared/api/api";
import { useAuth } from "../context/AuthContext";
import { PageHero } from "../components/PageHero";
import { TaskCompletionDialog } from "../components/tasks/TaskCompletionDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { cn } from "../components/ui/utils";
import {
  createStandaloneTask,
  listTasks,
  transitionTaskStatus,
  type TaskStatusFilter,
  type TaskSummary,
  type TaskWorkflowStatus,
  updateTask,
} from "../../modules/tasks/api/tasks.api";
import {
  listEmployees,
  type EmployeeSummary,
} from "../../modules/employees/api/employees.api";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatMinutes = (minutes: number | null) => {
  if (minutes === null || minutes <= 0) return "-";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
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

const getStatusBadgeClassName = (status: string) => {
  const normalized = status.trim().toLowerCase();
  if (normalized === "terminada") return "border-success/45 bg-success/14 text-success";
  if (normalized === "en proceso") return "border-primary/45 bg-primary/14 text-primary";
  return "border-warning/45 bg-warning/14 text-warning";
};

const getPriorityBadgeClassName = (priority: string) => {
  const normalized = priority.trim().toLowerCase();
  if (normalized === "alta") return "border-destructive/45 bg-destructive/12 text-destructive";
  if (normalized === "baja") return "border-border/80 bg-secondary/60 text-muted-foreground";
  return "border-warning/45 bg-warning/14 text-warning";
};

const getInitials = (value: string | null) => {
  if (!value) return "SA";
  const initials = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "SA";
};

type PriorityFilter = "all" | "high" | "medium" | "low";
type TaskStatusLabel = "Asignada" | "En proceso" | "Terminada";

const toWorkflowStatus = (status: string): TaskWorkflowStatus => {
  const normalized = status.trim().toLowerCase();
  if (normalized === "en proceso") return "in_progress";
  if (normalized === "terminada") return "done";
  return "assigned";
};

const toStatusLabel = (status: TaskWorkflowStatus): TaskStatusLabel => {
  if (status === "in_progress") return "En proceso";
  if (status === "done") return "Terminada";
  return "Asignada";
};

export function StandaloneTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";
  const filterOptions: Array<{
    value: TaskStatusFilter;
    label: string;
  }> = [
    { value: "all", label: "Todas" },
    { value: "assigned", label: "Asignadas" },
    { value: "in_progress", label: "En proceso" },
    { value: "done", label: "Terminadas" },
  ];

  const priorityFilterOptions: Array<{
    value: PriorityFilter;
    label: string;
  }> = [
    { value: "all", label: "Todas" },
    { value: "high", label: "Alta" },
    { value: "medium", label: "Media" },
    { value: "low", label: "Baja" },
  ];

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [pendingCompletionTask, setPendingCompletionTask] = useState<TaskSummary | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [priorityId, setPriorityId] = useState("2");
  const [assigneeEmployeeId, setAssigneeEmployeeId] = useState("");
  const [detailTitle, setDetailTitle] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [detailStartDate, setDetailStartDate] = useState("");
  const [detailDueDate, setDetailDueDate] = useState("");
  const [detailPriorityId, setDetailPriorityId] = useState("2");
  const [detailEstimatedHours, setDetailEstimatedHours] = useState("");
  const [detailStatus, setDetailStatus] = useState<TaskWorkflowStatus>("assigned");

  const canEditTaskAttributes = useMemo(() => {
    if (!selectedTask) return false;
    if (isAdmin) return true;
    return selectedTask.createdByUserId === user?.id;
  }, [isAdmin, selectedTask, user?.id]);

  const loadTasks = useCallback(async () => {
    try {
      const response = (isAdmin || isEmployee)
        ? await listTasks({ status: statusFilter, includeStandalone: true })
        : await listTasks({ status: statusFilter, includeStandalone: false });
      setTasks(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        toast.error(incomingError.message);
      } else {
        toast.error("No fue posible cargar las tareas.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isEmployee, statusFilter]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!isAdmin) {
      setEmployees([]);
      return;
    }

    const loadAssignableEmployees = async () => {
      try {
        const response = await listEmployees("active");
        setEmployees((response?.data ?? []).filter((employee) => employee.role === "employee"));
      } catch {
        setEmployees([]);
      }
    };

    void loadAssignableEmployees();
  }, [isAdmin]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPlannedStartDate("");
    setDueDate("");
    setEstimatedHours("");
    setPriorityId("2");
    setAssigneeEmployeeId("");
  };

  const openTaskDetail = useCallback((task: TaskSummary) => {
    setSelectedTask(task);
    setDetailTitle(task.title);
    setDetailDescription(task.description ?? "");
    setDetailStartDate(task.plannedStartDate.slice(0, 10));
    setDetailDueDate(task.dueDate.slice(0, 10));
    setDetailPriorityId(String(task.taskPriorityId));
    setDetailEstimatedHours(task.estimatedMinutes ? String(task.estimatedMinutes / 60) : "");
    setDetailStatus(toWorkflowStatus(task.status));
    setIsDetailModalOpen(true);
  }, []);

  const resetTaskDetail = () => {
    setSelectedTask(null);
    setPendingCompletionTask(null);
    setIsCompletionModalOpen(false);
    setDetailTitle("");
    setDetailDescription("");
    setDetailStartDate("");
    setDetailDueDate("");
    setDetailPriorityId("2");
    setDetailEstimatedHours("");
    setDetailStatus("assigned");
  };

  const handleConfirmTaskCompletion = async (payload: {
    actualMinutes: number;
    completionEvidence: string | null;
  }) => {
    if (!pendingCompletionTask) return;

    setIsCompletingTask(true);
    try {
      await transitionTaskStatus(pendingCompletionTask.id, {
        toStatus: "done",
        actualMinutes: payload.actualMinutes,
        completionEvidence: payload.completionEvidence,
        notes: "Finalización confirmada desde modal de cierre.",
      });

      await loadTasks();
      setIsCompletionModalOpen(false);
      setIsDetailModalOpen(false);
      resetTaskDetail();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible finalizar la tarea.");
      }
    } finally {
      setIsCompletingTask(false);
    }
  };

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("El título es obligatorio.");
      return;
    }
    if (trimmedTitle.length < 3) {
      toast.error("El título debe tener al menos 3 caracteres.");
      return;
    }
    if (trimmedTitle.length > 160) {
      toast.error("El título no puede superar 160 caracteres.");
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 5000) {
      toast.error("La descripción no puede superar 5000 caracteres.");
      return;
    }

    if (isAdmin) {
      const numericAssigneeEmployeeId = Number(assigneeEmployeeId);
      if (!Number.isInteger(numericAssigneeEmployeeId) || numericAssigneeEmployeeId <= 0) {
        toast.error("Debes asignar la tarea a un empleado.");
        return;
      }
    }

    let estimatedMinutes: number | null | undefined = undefined;
    if (estimatedHours.trim()) {
      const numericHours = Number(estimatedHours);
      if (!Number.isFinite(numericHours) || numericHours <= 0) {
        toast.error("La estimación de horas debe ser mayor a 0.");
        return;
      }
      estimatedMinutes = Math.round(numericHours * 60);
    }

    let resolvedPlannedStartDate = plannedStartDate;
    let resolvedDueDate = dueDate;

    if (!resolvedPlannedStartDate || !resolvedDueDate) {
      if (!estimatedHours.trim()) {
        toast.error("Si no defines fechas, la estimación de horas es obligatoria.");
        return;
      }

      const numericHours = Number(estimatedHours);
      if (!Number.isFinite(numericHours) || numericHours <= 0) {
        toast.error("La estimación de horas debe ser mayor a 0.");
        return;
      }

      const inferred = inferDateRangeFromHours(numericHours);
      resolvedPlannedStartDate = resolvedPlannedStartDate || inferred.plannedStartDate;
      resolvedDueDate = resolvedDueDate || inferred.dueDate;
    }

    if (new Date(resolvedDueDate).getTime() < new Date(resolvedPlannedStartDate).getTime()) {
      toast.error("La fecha fin no puede ser menor a la fecha inicio.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createStandaloneTask({
        title: trimmedTitle,
        description: trimmedDescription || null,
        plannedStartDate: resolvedPlannedStartDate,
        dueDate: resolvedDueDate,
        assigneeEmployeeId: isAdmin ? Number(assigneeEmployeeId) : undefined,
        taskPriorityId: Number(priorityId),
        estimatedMinutes,
      });

      const createdCount = response?.data?.createdCount ?? 1;
      if (createdCount > 1) {
        toast.info(`Se crearon ${createdCount} tareas sueltas.`);
      }
      resetForm();
      setIsCreateModalOpen(false);
      await loadTasks();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        const validationDetails = (
          incomingError.code === "VALIDATION_ERROR"
          && incomingError.details
          && typeof incomingError.details === "object"
          && "fieldErrors" in incomingError.details
          && incomingError.details.fieldErrors
          && typeof incomingError.details.fieldErrors === "object"
        ) ? incomingError.details.fieldErrors as Record<string, unknown> : null;

        if (validationDetails) {
          const firstFieldErrors = Object.values(validationDetails).find((value) => (
            Array.isArray(value) && value.length > 0 && typeof value[0] === "string"
          )) as string[] | undefined;
          if (firstFieldErrors?.[0]) {
            toast.error(firstFieldErrors[0]);
            return;
          }
        }
      } else {
        toast.error("No fue posible crear la tarea suelta.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTaskDetail = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTask) return;

    const trimmedTitle = detailTitle.trim();
    if (!trimmedTitle) {
      toast.error("El título es obligatorio.");
      return;
    }
    if (!detailStartDate || !detailDueDate) {
      toast.error("Debes completar fecha de inicio y fin.");
      return;
    }
    if (new Date(detailDueDate).getTime() < new Date(detailStartDate).getTime()) {
      toast.error("La fecha fin no puede ser menor a la fecha inicio.");
      return;
    }

    let estimatedMinutes: number | null | undefined = undefined;
    if (detailEstimatedHours.trim()) {
      const numericHours = Number(detailEstimatedHours);
      if (!Number.isFinite(numericHours) || numericHours <= 0) {
        toast.error("La estimación de horas debe ser mayor a 0.");
        return;
      }
      estimatedMinutes = Math.round(numericHours * 60);
    }

    const statusChanged = detailStatus !== toWorkflowStatus(selectedTask.status);
    const fieldsChanged = (
      trimmedTitle !== selectedTask.title
      || detailDescription.trim() !== (selectedTask.description ?? "")
      || detailStartDate !== selectedTask.plannedStartDate.slice(0, 10)
      || detailDueDate !== selectedTask.dueDate.slice(0, 10)
      || Number(detailPriorityId) !== selectedTask.taskPriorityId
      || ((estimatedMinutes ?? null) !== (selectedTask.estimatedMinutes ?? null))
    );

    if (!canEditTaskAttributes && fieldsChanged) {
      toast.error("Solo puedes cambiar el estado de tareas que no creaste.");
      return;
    }

    if (!statusChanged && !fieldsChanged) {
      toast.info("No hay cambios para guardar.");
      return;
    }

    setIsDetailSaving(true);
    try {
      if (fieldsChanged && canEditTaskAttributes) {
        await updateTask(selectedTask.id, {
          title: trimmedTitle,
          description: detailDescription.trim() || null,
          plannedStartDate: detailStartDate,
          dueDate: detailDueDate,
          taskPriorityId: Number(detailPriorityId),
          estimatedMinutes: estimatedMinutes ?? null,
        });
      }

      if (statusChanged) {
        if (detailStatus === "done") {
          setPendingCompletionTask(selectedTask);
          setIsCompletionModalOpen(true);
          return;
        }

        await transitionTaskStatus(selectedTask.id, {
          toStatus: detailStatus,
          notes: "Actualización de estado desde el modal de detalle.",
        });
      }

      await loadTasks();
      setIsDetailModalOpen(false);
      resetTaskDetail();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible guardar los cambios de la tarea.");
      }
    } finally {
      setIsDetailSaving(false);
    }
  };

  const sortedTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      const priorityName = task.priority.trim().toLowerCase();
      const passesPriority = priorityFilter === "all"
        || (priorityFilter === "high" && priorityName === "alta")
        || (priorityFilter === "medium" && priorityName === "media")
        || (priorityFilter === "low" && priorityName === "baja");
      if (!passesPriority) return false;

      if (!isAdmin || !normalizedSearch) return true;
      const inTitle = task.title.toLowerCase().includes(normalizedSearch);
      const inDescription = (task.description ?? "").toLowerCase().includes(normalizedSearch);
      const inProject = task.projectName.toLowerCase().includes(normalizedSearch);
      const inAssignee = (task.assigneeName ?? "").toLowerCase().includes(normalizedSearch);
      return inTitle || inDescription || inProject || inAssignee;
    });

    return [...filtered].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [isAdmin, priorityFilter, searchTerm, tasks]);

  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize));
  const paginatedTasks = useMemo(() => {
    const offset = (currentPage - 1) * pageSize;
    return sortedTasks.slice(offset, offset + pageSize);
  }, [currentPage, sortedTasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [priorityFilter, searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const rawTaskId = searchParams.get("taskId");
    if (!rawTaskId || isLoading) return;

    const taskIdFromQuery = Number(rawTaskId);
    if (!Number.isInteger(taskIdFromQuery) || taskIdFromQuery <= 0) {
      return;
    }

    const taskToOpen = tasks.find((task) => task.id === taskIdFromQuery);
    if (!taskToOpen) {
      return;
    }

    openTaskDetail(taskToOpen);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("taskId");
    setSearchParams(nextParams, { replace: true });
  }, [isLoading, openTaskDetail, searchParams, setSearchParams, tasks]);

  useEffect(() => {
    const shouldOpenCreate = searchParams.get("create");
    if (shouldOpenCreate !== "1") {
      return;
    }

    setIsCreateModalOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("create");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="app-shell h-full min-h-0 overflow-hidden">
      <PageHero
        title="Tareas"
        subtitle={isAdmin
          ? "Audita y consulta todas las tareas operativas del sistema."
          : "Crea y consulta tus tareas asignadas (proyecto y sueltas)."}
        icon={<ClipboardList className="size-5" />}
      />

      <div className="app-content min-h-0 overflow-hidden">
        <div className="shrink-0 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">Listado de tareas</h3>
          </div>
          <div className="flex w-full items-center justify-end gap-2 overflow-x-auto overflow-y-visible px-1 py-1 xl:w-auto xl:overflow-visible">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="app-btn-secondary h-9 px-3.5"
                >
                  <ListFilter className="size-4 text-muted-foreground" />
                  Estado: {filterOptions.find((option) => option.value === statusFilter)?.label ?? "Todas"}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatusFilter)}>
                  {filterOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="app-btn-secondary h-9 px-3.5"
                >
                  <ListFilter className="size-4 text-muted-foreground" />
                  Prioridad: {priorityFilterOptions.find((option) => option.value === priorityFilter)?.label ?? "Todas"}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuRadioGroup value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}>
                  {priorityFilterOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAdmin && (
              <label className="relative w-[280px] shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="app-control h-9 w-full pl-9 pr-3"
                  placeholder="Buscar tarea..."
                />
              </label>
            )}

            <button
              type="button"
              className="app-btn-primary size-10 shrink-0 p-0"
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              title="Crear tarea suelta"
              aria-label="Crear tarea suelta"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando tareas...</div>
        ) : sortedTasks.length === 0 ? (
          <div className="app-panel app-panel-pad shrink-0 border-dashed py-8 text-sm text-muted-foreground">
            {isAdmin ? "No hay tareas para este filtro." : "No hay tareas asignadas para este filtro."}
          </div>
        ) : (
          <div className="app-panel overflow-hidden flex flex-col">
            <div className="overflow-auto">
              <table className="w-full min-w-[980px] text-left">
              <thead className="sticky top-0 z-10 border-b border-border/85 bg-secondary/80">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Tarea</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Proyecto</th>
                  {isAdmin && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Responsable</th>}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Prioridad</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Inicio</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Fin</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Estimado</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {paginatedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer transition-colors hover:bg-secondary/55"
                    onClick={() => openTaskDetail(task)}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      ) : null}
                      {task.completionEvidence ? (
                        <p className="mt-1 text-xs text-primary line-clamp-1">
                          Evidencia: {task.completionEvidence}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      <span className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                        task.projectId > 0
                          ? "border border-primary/20 bg-primary/10 text-primary"
                          : "border border-border bg-secondary/50 text-muted-foreground",
                      )}
                      >
                        {task.projectId > 0 ? task.projectName : "Tarea suelta"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
                            {getInitials(task.assigneeName)}
                          </span>
                          <span className="text-sm text-foreground">{task.assigneeName ?? "Sin asignar"}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                        getStatusBadgeClassName(task.status),
                      )}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                        getPriorityBadgeClassName(task.priority),
                      )}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatDate(task.plannedStartDate)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatDate(task.dueDate)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatMinutes(task.estimatedMinutes)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatMinutes(task.actualMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/85 bg-secondary/62 px-4 py-3 justify-end">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="size-3.5" />
                  {sortedTasks.length} tareas listadas
                </span>
                <div className="flex items-center gap-1.5 mr-8">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                    disabled={currentPage === 1}
                    className="app-btn-secondary size-8 p-0 text-xs disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Pagina anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="px-1 text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
                    disabled={currentPage >= totalPages}
                    className="app-btn-secondary size-8 p-0 text-xs disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Pagina siguiente"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open && !isSubmitting) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear tarea suelta</DialogTitle>
            <DialogDescription>
              Esta tarea no estará asociada a ningún proyecto operativo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-1.5">Título</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="app-control"
                placeholder="Ej: Actualizar inventario diario"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-1.5">Descripción</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="app-control min-h-[90px]"
                placeholder="Detalles de la tarea"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Inicio</label>
              <input
                type="date"
                value={plannedStartDate}
                onChange={(event) => setPlannedStartDate(event.target.value)}
                className="app-control"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Fin</label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="app-control"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Asignar a</label>
              {isEmployee ? (
                <input
                  type="text"
                  value={user?.name ?? "Mi usuario"}
                  className="app-control bg-muted"
                  disabled
                />
              ) : (
                <select
                  value={assigneeEmployeeId}
                  onChange={(event) => setAssigneeEmployeeId(event.target.value)}
                  className="app-control"
                >
                  <option value="">Selecciona un empleado</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Prioridad</label>
              <select
                value={priorityId}
                onChange={(event) => setPriorityId(event.target.value)}
                className="app-control"
              >
                <option value="1">Alta</option>
                <option value="2">Media</option>
                <option value="3">Baja</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Estimación (horas)</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                className="app-control"
                placeholder="Ej: 2.5"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="app-btn-primary"
                disabled={isSubmitting}
              >
                <Clock3 className="size-4" />
                {isSubmitting ? "Creando..." : "Crear tarea"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open && !isDetailSaving) {
            resetTaskDetail();
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de tarea</DialogTitle>
            <DialogDescription>
              Visualiza y edita la información principal de la tarea seleccionada.
            </DialogDescription>
          </DialogHeader>

          {selectedTask ? (
            <form onSubmit={handleSaveTaskDetail} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Título</label>
                <input
                  type="text"
                  value={detailTitle}
                  onChange={(event) => setDetailTitle(event.target.value)}
                  className="app-control"
                  disabled={!canEditTaskAttributes}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Descripción</label>
                <textarea
                  value={detailDescription}
                  onChange={(event) => setDetailDescription(event.target.value)}
                  className="app-control min-h-[90px]"
                  disabled={!canEditTaskAttributes}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Inicio</label>
                <input
                  type="date"
                  value={detailStartDate}
                  onChange={(event) => setDetailStartDate(event.target.value)}
                  className="app-control"
                  disabled={!canEditTaskAttributes}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Fin</label>
                <input
                  type="date"
                  value={detailDueDate}
                  onChange={(event) => setDetailDueDate(event.target.value)}
                  className="app-control"
                  disabled={!canEditTaskAttributes}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Estado</label>
                <select
                  value={detailStatus}
                  onChange={(event) => setDetailStatus(event.target.value as TaskWorkflowStatus)}
                  className="app-control"
                >
                  <option value="assigned">{toStatusLabel("assigned")}</option>
                  <option value="in_progress">{toStatusLabel("in_progress")}</option>
                  <option value="done">{toStatusLabel("done")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Prioridad</label>
                <select
                  value={detailPriorityId}
                  onChange={(event) => setDetailPriorityId(event.target.value)}
                  className="app-control"
                  disabled={!canEditTaskAttributes}
                >
                  <option value="1">Alta</option>
                  <option value="2">Media</option>
                  <option value="3">Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Estimación (horas)</label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={detailEstimatedHours}
                  onChange={(event) => setDetailEstimatedHours(event.target.value)}
                  className="app-control"
                  disabled={!canEditTaskAttributes}
                />
              </div>

              {!canEditTaskAttributes ? (
                <div className="md:col-span-2 rounded-xl border border-border/70 bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
                  Esta tarea fue creada por otro usuario. Solo puedes actualizar su estado.
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Proyecto</label>
                <input
                  type="text"
                  value={selectedTask.projectId > 0 ? selectedTask.projectName : "Tarea suelta"}
                  className="app-control bg-muted"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Responsable</label>
                <input
                  type="text"
                  value={selectedTask.assigneeName ?? "Sin asignar"}
                  className="app-control bg-muted"
                  disabled
                />
              </div>

              {selectedTask.completionEvidence ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Evidencia registrada</label>
                  <div className="rounded-xl border border-border/80 bg-secondary/55 px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
                    {selectedTask.completionEvidence}
                  </div>
                </div>
              ) : null}

              <div className="md:col-span-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="app-btn-secondary"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    resetTaskDetail();
                  }}
                  disabled={isDetailSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="app-btn-primary"
                  disabled={isDetailSaving}
                >
                  {isDetailSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

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
