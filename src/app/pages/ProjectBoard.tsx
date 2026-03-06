import { useEffect, useMemo, useState } from "react";
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

export function ProjectBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [memberships, setMemberships] = useState<ProjectMembership[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [membershipStatusFilter, setMembershipStatusFilter] = useState<MembershipStatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [reassignMembershipId, setReassignMembershipId] = useState("");
  const [reassignEmployeeId, setReassignEmployeeId] = useState("");

  const numericProjectId = Number(projectId);

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
      await Promise.all([loadProject(), loadMemberships(), loadEmployees()]);
      setIsLoading(false);
    };
    void initialize();
  }, [projectId, membershipStatusFilter]);

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

          {error && <p className="p-4 text-sm text-destructive">{error}</p>}
          {success && <p className="p-4 text-sm text-success">{success}</p>}

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
      </div>
    </div>
  );
}
