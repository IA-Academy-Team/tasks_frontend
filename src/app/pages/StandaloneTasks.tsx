import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ClipboardList, Clock3, ListFilter, Plus, Search, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { ApiError } from "../../shared/api/api";
import { useAuth } from "../context/AuthContext";
import { PageHero } from "../components/PageHero";
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
  listStandaloneTasks,
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
  if (normalized === "terminada") return "border-success/25 bg-success/12 text-success";
  if (normalized === "en proceso") return "border-primary/25 bg-primary/12 text-primary";
  return "border-warning/25 bg-warning/12 text-warning";
};

const getPriorityBadgeClassName = (priority: string) => {
  const normalized = priority.trim().toLowerCase();
  if (normalized === "alta") return "border-destructive/25 bg-destructive/10 text-destructive";
  if (normalized === "baja") return "border-muted-foreground/20 bg-muted/40 text-muted-foreground";
  return "border-warning/25 bg-warning/10 text-warning";
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

  const loadTasks = useCallback(async () => {
    try {
      const response = isAdmin
        ? await listTasks({ status: statusFilter, includeStandalone: true })
        : await listStandaloneTasks({ status: statusFilter });
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
  }, [isAdmin, statusFilter]);

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

  const openTaskDetail = (task: TaskSummary) => {
    setSelectedTask(task);
    setDetailTitle(task.title);
    setDetailDescription(task.description ?? "");
    setDetailStartDate(task.plannedStartDate.slice(0, 10));
    setDetailDueDate(task.dueDate.slice(0, 10));
    setDetailPriorityId(String(task.taskPriorityId));
    setDetailEstimatedHours(task.estimatedMinutes ? String(task.estimatedMinutes / 60) : "");
    setDetailStatus(toWorkflowStatus(task.status));
    setIsDetailModalOpen(true);
  };

  const resetTaskDetail = () => {
    setSelectedTask(null);
    setDetailTitle("");
    setDetailDescription("");
    setDetailStartDate("");
    setDetailDueDate("");
    setDetailPriorityId("2");
    setDetailEstimatedHours("");
    setDetailStatus("assigned");
  };

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("El título es obligatorio.");
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
        description: description.trim() || null,
        plannedStartDate: resolvedPlannedStartDate,
        dueDate: resolvedDueDate,
        assigneeEmployeeId: isAdmin ? Number(assigneeEmployeeId) : null,
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
      if (!(incomingError instanceof ApiError)) {
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

    if (!statusChanged && !fieldsChanged) {
      toast.info("No hay cambios para guardar.");
      return;
    }

    setIsDetailSaving(true);
    try {
      if (fieldsChanged) {
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

  const pageSize = 10;
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

  return (
    <div className="app-shell">
      <PageHero
        title="Tareas"
        subtitle={isAdmin
          ? "Audita y consulta todas las tareas operativas del sistema."
          : "Crea y consulta tareas independientes sin necesidad de proyecto."}
        icon={<ClipboardList className="size-5" />}
      />

      <div className="app-content">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Listado de tareas</h3>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-secondary/25 px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/65"
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
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-secondary/25 px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/65"
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
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-9 w-[220px] rounded-xl border border-border/70 bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/15"
                  placeholder="Buscar tarea..."
                />
              </label>
            )}

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              title="Crear tarea suelta"
              aria-label="Crear tarea suelta"
            >
              <Plus className="size-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando tareas...</div>
        ) : sortedTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/70 px-4 py-8 text-sm text-muted-foreground">
            {isAdmin ? "No hay tareas para este filtro." : "No hay tareas sueltas para este filtro."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-border/80 bg-secondary/45">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Tarea</th>
                  {isAdmin && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Proyecto</th>}
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
                    className="cursor-pointer transition-colors hover:bg-secondary/30"
                    onClick={() => openTaskDetail(task)}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      ) : null}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm text-foreground/90">
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
                    )}
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
                            {getInitials(task.assigneeName)}
                          </span>
                          <span className="text-sm text-foreground/90">{task.assigneeName ?? "Sin asignar"}</span>
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
                    <td className="px-4 py-3 text-sm text-foreground/90">{formatDate(task.plannedStartDate)}</td>
                    <td className="px-4 py-3 text-sm text-foreground/90">{formatDate(task.dueDate)}</td>
                    <td className="px-4 py-3 text-sm text-foreground/90">{formatMinutes(task.estimatedMinutes)}</td>
                    <td className="px-4 py-3 text-sm text-foreground/90">{formatMinutes(task.actualMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-secondary/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">Vista optimizada para auditoría operativa</p>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="size-3.5" />
                  {sortedTasks.length} tareas listadas
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Anterior
                  </button>
                  <span className="px-1 text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Siguiente
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
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Descripción</label>
                <textarea
                  value={detailDescription}
                  onChange={(event) => setDetailDescription(event.target.value)}
                  className="app-control min-h-[90px]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Inicio</label>
                <input
                  type="date"
                  value={detailStartDate}
                  onChange={(event) => setDetailStartDate(event.target.value)}
                  className="app-control"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Fin</label>
                <input
                  type="date"
                  value={detailDueDate}
                  onChange={(event) => setDetailDueDate(event.target.value)}
                  className="app-control"
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
                />
              </div>

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
    </div>
  );
}
