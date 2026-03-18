import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ClipboardList, Clock3, ListFilter, Plus } from "lucide-react";
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
import { cn } from "../components/ui/utils";
import {
  createStandaloneTask,
  listStandaloneTasks,
  type TaskStatusFilter,
  type TaskSummary,
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

export function StandaloneTasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";
  const filterOptions: Array<{
    value: TaskStatusFilter;
    label: string;
    activeClassName: string;
  }> = [
    { value: "all", label: "Todas", activeClassName: "border-accent/40 bg-accent/15 text-accent" },
    { value: "assigned", label: "Asignadas", activeClassName: "border-warning/40 bg-warning/15 text-warning" },
    { value: "in_progress", label: "En proceso", activeClassName: "border-primary/40 bg-primary/15 text-primary" },
    { value: "done", label: "Terminadas", activeClassName: "border-success/40 bg-success/15 text-success" },
  ];

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [priorityId, setPriorityId] = useState("2");
  const [assigneeEmployeeId, setAssigneeEmployeeId] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      const response = await listStandaloneTasks({ status: statusFilter });
      setTasks(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        toast.error(incomingError.message);
      } else {
        toast.error("No fue posible cargar las tareas sueltas.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

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

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("El título es obligatorio.");
      return;
    }
    if (!plannedStartDate || !dueDate) {
      toast.error("Debes completar fecha de inicio y fin.");
      return;
    }
    if (new Date(dueDate).getTime() < new Date(plannedStartDate).getTime()) {
      toast.error("La fecha fin no puede ser menor a la fecha inicio.");
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

    setIsSubmitting(true);
    try {
      const response = await createStandaloneTask({
        title: trimmedTitle,
        description: description.trim() || null,
        plannedStartDate,
        dueDate,
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

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [tasks],
  );

  return (
    <div className="app-shell">
      <PageHero
        title="Tareas"
        subtitle="Crea y consulta tareas independientes sin necesidad de proyecto."
        icon={<ClipboardList className="size-5" />}
      />

      <div className="app-content">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Listado de tareas</h3>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {filterOptions.map((option) => {
              const isSelected = statusFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all",
                    isSelected
                      ? option.activeClassName
                      : "border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  <ListFilter className="size-4" />
                  {option.label}
                </button>
              );
            })}

            <button
              type="button"
              className="app-btn-primary h-10 w-10 p-0"
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
          <div className="text-sm text-muted-foreground">Cargando tareas sueltas...</div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">No hay tareas sueltas para este filtro.</div>
        ) : (
          <div className="app-panel overflow-x-auto">
            <table className="app-table">
              <thead className="app-table-head">
                <tr>
                  <th className="app-th">Tarea</th>
                  <th className="app-th">Estado</th>
                  <th className="app-th">Prioridad</th>
                  <th className="app-th">Inicio</th>
                  <th className="app-th">Fin</th>
                  <th className="app-th">Estimado</th>
                  <th className="app-th">Real</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map((task) => (
                  <tr key={task.id} className="app-row">
                    <td className="app-td">
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      ) : null}
                    </td>
                    <td className="app-td">{task.status}</td>
                    <td className="app-td">{task.priority}</td>
                    <td className="app-td">{formatDate(task.plannedStartDate)}</td>
                    <td className="app-td">{formatDate(task.dueDate)}</td>
                    <td className="app-td">{formatMinutes(task.estimatedMinutes)}</td>
                    <td className="app-td">{formatMinutes(task.actualMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
