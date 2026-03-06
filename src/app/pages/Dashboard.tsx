import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gauge,
  Timer,
  Users,
} from "lucide-react";
import { ApiError } from "../../shared/api/api";
import { useAuth } from "../context/AuthContext";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
import { listEmployees, type EmployeeSummary } from "../../modules/employees/api/employees.api";
import { listProjects, type ProjectSummary } from "../../modules/projects/api/projects.api";
import {
  getAdminDashboard,
  getEmployeeDashboard,
  type AdminDashboardData,
  type AdminDashboardQuery,
  type EmployeeDashboardData,
} from "../../modules/dashboard/api/dashboard.api";

const formatMinutes = (minutes: number) => {
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function StatCard(props: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-primary/25 bg-card p-4 shadow-[0_4px_14px_rgba(2,106,167,0.1)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{props.title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{props.value}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2 text-primary">{props.icon}</div>
      </div>
    </article>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [error, setError] = useState("");

  const [employeeDashboard, setEmployeeDashboard] = useState<EmployeeDashboardData | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboardData | null>(null);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [projectIdFilter, setProjectIdFilter] = useState("");
  const [areaIdFilter, setAreaIdFilter] = useState("");
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");

  const adminQuery: AdminDashboardQuery = useMemo(() => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    projectId: projectIdFilter ? Number(projectIdFilter) : undefined,
    areaId: areaIdFilter ? Number(areaIdFilter) : undefined,
    employeeId: employeeIdFilter ? Number(employeeIdFilter) : undefined,
  }), [areaIdFilter, dateFrom, dateTo, employeeIdFilter, projectIdFilter]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadFilters = async () => {
      setIsLoadingFilters(true);
      try {
        const [projectsResponse, areasResponse, employeesResponse] = await Promise.all([
          listProjects({ status: "all" }),
          listAreas("all"),
          listEmployees("active"),
        ]);
        setProjects(projectsResponse?.data ?? []);
        setAreas(areasResponse?.data ?? []);
        setEmployees((employeesResponse?.data ?? []).filter((employee) => employee.role === "employee"));
      } catch {
        setProjects([]);
        setAreas([]);
        setEmployees([]);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    void loadFilters();
  }, [isAdmin]);

  useEffect(() => {
    if (!user) return;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError("");
      try {
        if (isEmployee) {
          const response = await getEmployeeDashboard();
          setEmployeeDashboard(response?.data ?? null);
          setAdminDashboard(null);
        } else if (isAdmin) {
          const response = await getAdminDashboard(adminQuery);
          setAdminDashboard(response?.data ?? null);
          setEmployeeDashboard(null);
        } else {
          setEmployeeDashboard(null);
          setAdminDashboard(null);
        }
      } catch (incomingError) {
        if (incomingError instanceof ApiError) {
          setError(incomingError.message);
        } else {
          setError("No fue posible cargar el dashboard.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, [adminQuery, isAdmin, isEmployee, user]);

  if (!user) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Sesion no disponible.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center text-muted-foreground">
        Cargando dashboard...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Productividad consolidada por equipo, empleado y area."
            : "Resumen operativo de tus tareas y tiempos de ejecucion."}
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {isEmployee && employeeDashboard && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard
              title="Asignadas"
              value={employeeDashboard.summary.assignedTasks}
              icon={<FolderKanban className="size-5" />}
            />
            <StatCard
              title="En proceso"
              value={employeeDashboard.summary.inProgressTasks}
              icon={<Clock3 className="size-5" />}
            />
            <StatCard
              title="Terminadas"
              value={employeeDashboard.summary.doneTasks}
              icon={<CheckCircle2 className="size-5" />}
            />
            <StatCard
              title="Proximas a vencer"
              value={employeeDashboard.summary.upcomingTasks}
              icon={<CalendarClock className="size-5" />}
            />
            <StatCard
              title="Tiempo activo"
              value={formatMinutes(employeeDashboard.summary.activeTasksAccumulatedMinutes)}
              icon={<Timer className="size-5" />}
            />
          </section>

          <section className="rounded-2xl border border-primary/25 bg-card overflow-hidden">
            <div className="px-5 py-4 bg-primary/10 border-b border-primary/20">
              <h2 className="text-lg font-semibold text-primary">Tareas proximas a vencerse</h2>
            </div>
            {employeeDashboard.upcomingTasks.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                No tienes tareas proximas a vencerse en los siguientes 7 dias.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-left">Tarea</th>
                      <th className="px-4 py-3 text-left">Proyecto</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-left">Prioridad</th>
                      <th className="px-4 py-3 text-left">Vence</th>
                      <th className="px-4 py-3 text-left">Estimado</th>
                      <th className="px-4 py-3 text-left">Real</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeDashboard.upcomingTasks.map((task) => (
                      <tr key={task.id} className="border-t border-border">
                        <td className="px-4 py-3">{task.title}</td>
                        <td className="px-4 py-3">{task.projectName}</td>
                        <td className="px-4 py-3">{task.status}</td>
                        <td className="px-4 py-3">{task.priority}</td>
                        <td className="px-4 py-3">{formatDate(task.dueDate)}</td>
                        <td className="px-4 py-3">
                          {task.estimatedMinutes === null ? "-" : formatMinutes(task.estimatedMinutes)}
                        </td>
                        <td className="px-4 py-3">{formatMinutes(task.actualMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {isAdmin && adminDashboard && (
        <>
          <section className="rounded-2xl border border-primary/25 bg-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">Filtros de productividad</h2>
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setProjectIdFilter("");
                  setAreaIdFilter("");
                  setEmployeeIdFilter("");
                }}
                className="px-3 py-2 text-sm rounded-xl border border-border hover:bg-secondary"
              >
                Limpiar filtros
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <DateRangeFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
                placeholder="Rango por inicio planificado"
              />
              <select
                value={projectIdFilter}
                onChange={(event) => setProjectIdFilter(event.target.value)}
                className="px-3 py-2 border border-border rounded-xl bg-input-background"
              >
                <option value="">Proyecto: todos</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={areaIdFilter}
                onChange={(event) => setAreaIdFilter(event.target.value)}
                className="px-3 py-2 border border-border rounded-xl bg-input-background"
              >
                <option value="">Area: todas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <select
                value={employeeIdFilter}
                onChange={(event) => setEmployeeIdFilter(event.target.value)}
                className="px-3 py-2 border border-border rounded-xl bg-input-background"
              >
                <option value="">Empleado: todos</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <div className="px-3 py-2 rounded-xl border border-border bg-secondary/30 text-xs text-muted-foreground flex items-center">
                {isLoadingFilters ? "Cargando opciones..." : "Filtros aplicados en tiempo real"}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Tareas totales"
              value={adminDashboard.teamSummary.totalTasks}
              icon={<BarChart3 className="size-5" />}
            />
            <StatCard
              title="Cumplimiento"
              value={`${adminDashboard.teamSummary.completionRate}%`}
              icon={<Gauge className="size-5" />}
            />
            <StatCard
              title="Tiempo estimado"
              value={formatMinutes(adminDashboard.teamSummary.totalEstimatedMinutes)}
              icon={<Clock3 className="size-5" />}
            />
            <StatCard
              title="Tiempo real"
              value={formatMinutes(adminDashboard.teamSummary.totalActualMinutes)}
              icon={<Timer className="size-5" />}
            />
          </section>

          <section className="rounded-2xl border border-primary/25 bg-card overflow-hidden">
            <div className="px-5 py-4 bg-primary/10 border-b border-primary/20">
              <h2 className="text-lg font-semibold text-primary">Productividad por empleado</h2>
            </div>
            {adminDashboard.employeeProductivity.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Sin datos para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-left">Empleado</th>
                      <th className="px-4 py-3 text-left">Tareas</th>
                      <th className="px-4 py-3 text-left">Terminadas</th>
                      <th className="px-4 py-3 text-left">Cumplimiento</th>
                      <th className="px-4 py-3 text-left">Estimado</th>
                      <th className="px-4 py-3 text-left">Real</th>
                      <th className="px-4 py-3 text-left">Desvio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminDashboard.employeeProductivity.map((item) => (
                      <tr key={item.employeeId} className="border-t border-border">
                        <td className="px-4 py-3">
                          <p>{item.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{item.employeeEmail}</p>
                        </td>
                        <td className="px-4 py-3">{item.totalTasks}</td>
                        <td className="px-4 py-3">{item.doneTasks}</td>
                        <td className="px-4 py-3">{item.completionRate}%</td>
                        <td className="px-4 py-3">{formatMinutes(item.totalEstimatedMinutes)}</td>
                        <td className="px-4 py-3">{formatMinutes(item.totalActualMinutes)}</td>
                        <td className="px-4 py-3">
                          {item.totalDeviationMinutes > 0 ? "+" : ""}{item.totalDeviationMinutes} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-primary/25 bg-card overflow-hidden">
            <div className="px-5 py-4 bg-primary/10 border-b border-primary/20">
              <h2 className="text-lg font-semibold text-primary">Productividad por area</h2>
            </div>
            {adminDashboard.areaProductivity.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Sin datos para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-left">Area</th>
                      <th className="px-4 py-3 text-left">Tareas</th>
                      <th className="px-4 py-3 text-left">Asignadas</th>
                      <th className="px-4 py-3 text-left">En proceso</th>
                      <th className="px-4 py-3 text-left">Terminadas</th>
                      <th className="px-4 py-3 text-left">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminDashboard.areaProductivity.map((item) => (
                      <tr key={item.areaId} className="border-t border-border">
                        <td className="px-4 py-3 flex items-center gap-2">
                          <Users className="size-4 text-primary" />
                          {item.areaName}
                        </td>
                        <td className="px-4 py-3">{item.totalTasks}</td>
                        <td className="px-4 py-3">{item.assignedTasks}</td>
                        <td className="px-4 py-3">{item.inProgressTasks}</td>
                        <td className="px-4 py-3">{item.doneTasks}</td>
                        <td className="px-4 py-3">{item.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
