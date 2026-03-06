import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../shared/api/api";
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
  listTasks,
  updateTask,
  type TaskStatusFilter,
  type TaskSummary,
} from "../../modules/tasks/api/tasks.api";

export function ProjectBoard() {
  const { projectId } = useParams<{ projectId: string }>();
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

  const assignableEmployees = useMemo(() => {
    if (!project) return [];
    return employees.filter((employee) => employee.currentAreaId === project.areaId);
  }, [employees, project]);

  const activeMemberships = useMemo(
    () => memberships.filter((membership) => membership.isActive),
    [memberships],
  );

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
    const confirmed = window.confirm(`Deseas desasignar a ${membership.employeeName}?`);
    if (!confirmed) return;

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
    const confirmed = window.confirm(`Deseas eliminar logicamente la tarea "${task.title}"?`);
    if (!confirmed) return;

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
          className="px-4 py-2 rounded-xl border border-border hover:bg-secondary"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-background">
      <div className="bg-primary border-b border-primary/30 px-6 py-4 shadow-md flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="p-2 hover:bg-white/15 rounded-xl transition-colors"
          >
            <ArrowLeft className="size-5 text-primary-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">{project.name}</h1>
            <p className="text-sm text-white/90">
              Area: {project.areaName} · Estado: {project.status}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-auto space-y-6">
        <section className="bg-card rounded-2xl border border-primary/25 p-5">
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
          <section className="bg-card rounded-2xl border border-primary/25 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Asignaciones del proyecto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Asignar empleado</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={assignEmployeeId}
                    onChange={(event) => setAssignEmployeeId(event.target.value)}
                    className="px-3 py-2 border border-border rounded-xl bg-input-background min-w-[220px]"
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
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
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
                    className="px-3 py-2 border border-border rounded-xl bg-input-background min-w-[220px]"
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
                    className="px-3 py-2 border border-border rounded-xl bg-input-background min-w-[220px]"
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
                    className="px-4 py-2 rounded-xl border border-border hover:bg-secondary disabled:opacity-70"
                  >
                    Reasignar
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="bg-card rounded-2xl border border-primary/25 overflow-hidden">
          <div className="px-5 py-4 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-primary">Miembros del proyecto</h3>
            <select
              value={membershipStatusFilter}
              onChange={(event) => setMembershipStatusFilter(event.target.value as MembershipStatusFilter)}
              className="px-3 py-2 border border-border rounded-xl bg-input-background"
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
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="px-4 py-3 text-left">Empleado</th>
                    <th className="px-4 py-3 text-left">Area actual</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Asignado</th>
                    <th className="px-4 py-3 text-left">Desasignado</th>
                    {isAdmin && <th className="px-4 py-3 text-left">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((membership) => (
                    <tr key={membership.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium">{membership.employeeName}</p>
                        <p className="text-muted-foreground">{membership.employeeEmail}</p>
                      </td>
                      <td className="px-4 py-3">{membership.currentAreaName ?? "Sin area activa"}</td>
                      <td className="px-4 py-3">
                        <span className={membership.isActive ? "text-success" : "text-warning"}>
                          {membership.isActive ? "Activa" : "Finalizada"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(membership.assignedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {membership.unassignedAt
                          ? new Date(membership.unassignedAt).toLocaleString()
                          : "-"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          {membership.isActive ? (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => {
                                void handleUnassign(membership);
                              }}
                              className="text-destructive hover:underline disabled:opacity-70"
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

        <section className="bg-card rounded-2xl border border-primary/25 overflow-hidden">
          <div className="px-5 py-4 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-primary">Tareas del proyecto</h3>
            <select
              value={taskStatusFilter}
              onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)}
              className="px-3 py-2 border border-border rounded-xl bg-input-background"
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
                    className="w-full px-3 py-2 border border-border rounded-xl bg-input-background"
                    placeholder="Titulo de la tarea"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Descripcion</label>
                  <textarea
                    value={taskDescription}
                    onChange={(event) => setTaskDescription(event.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-input-background"
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
                    className="w-full px-3 py-2 border border-border rounded-xl bg-input-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha limite</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(event) => setTaskDueDate(event.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-input-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prioridad</label>
                  <select
                    value={taskPriorityId}
                    onChange={(event) => setTaskPriorityId(event.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-input-background"
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
                    className="w-full px-3 py-2 border border-border rounded-xl bg-input-background"
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
                    className="w-full px-3 py-2 border border-border rounded-xl bg-input-background"
                    placeholder="Ejemplo: 90"
                  />
                </div>
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
                  >
                    {editingTaskId ? "Actualizar tarea" : "Crear tarea"}
                  </button>
                  {editingTaskId && (
                    <button
                      type="button"
                      onClick={resetTaskForm}
                      className="px-4 py-2 rounded-xl border border-border hover:bg-secondary"
                    >
                      Cancelar edicion
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay tareas para este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="px-4 py-3 text-left">Tarea</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Prioridad</th>
                    <th className="px-4 py-3 text-left">Asignado</th>
                    <th className="px-4 py-3 text-left">Fechas</th>
                    <th className="px-4 py-3 text-left">Estimado</th>
                    {isAdmin && <th className="px-4 py-3 text-left">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-muted-foreground">{task.description ?? "Sin descripcion"}</p>
                      </td>
                      <td className="px-4 py-3">{task.status}</td>
                      <td className="px-4 py-3">{task.priority}</td>
                      <td className="px-4 py-3">
                        {task.assigneeName ? `${task.assigneeName} (${task.assigneeEmail})` : "Sin asignar"}
                      </td>
                      <td className="px-4 py-3">
                        <p>Inicio: {task.plannedStartDate}</p>
                        <p>Limite: {task.dueDate}</p>
                      </td>
                      <td className="px-4 py-3">
                        {task.estimatedMinutes ? `${task.estimatedMinutes} min` : "-"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => startTaskEdit(task)}
                              className="text-primary hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleDeleteTask(task);
                              }}
                              className="text-destructive hover:underline"
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
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}
      </div>
    </div>
  );
}
