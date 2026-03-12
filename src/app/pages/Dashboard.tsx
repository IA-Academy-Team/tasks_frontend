import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderKanban,
  LayoutDashboard,
  Timer,
} from "lucide-react";
import { ApiError } from "../../shared/api/api";
import { useAuth } from "../context/AuthContext";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { PageHero } from "../components/PageHero";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
import { listEmployees, type EmployeeSummary } from "../../modules/employees/api/employees.api";
import { listProjects, type ProjectSummary } from "../../modules/projects/api/projects.api";
import {
  getAdminDashboard,
  getEmployeeDashboard,
  getOverdueAlerts,
  getTaskComplianceReport,
  type AdminDashboardData,
  type AdminDashboardQuery,
  type ComplianceFilter,
  type EmployeeDashboardData,
  type OverdueAlertsData,
  type TaskComplianceReportData,
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

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getComplianceBadgeClass = (complianceStatus: "on_time" | "estimate_delayed" | "date_overdue") => {
  if (complianceStatus === "date_overdue") {
    return "text-destructive";
  }

  if (complianceStatus === "estimate_delayed") {
    return "text-warning";
  }

  return "text-success";
};

const getAlertReasonClass = (reason: "DATE_OVERDUE" | "ESTIMATE_OVERDUE") =>
  reason === "DATE_OVERDUE" ? "text-destructive" : "text-warning";

const toPercentage = (count: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
};

type ComplianceSegment = {
  key: "on_time" | "estimate_delayed" | "date_overdue";
  label: string;
  count: number;
  percentage: number;
  barClassName: string;
  textClassName: string;
};

function StatCard(props: {
  title: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <article className="app-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{props.title}</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{props.value}</p>
        </div>
        <div className="rounded-xl bg-primary/12 p-2 text-primary">{props.icon}</div>
      </div>
    </article>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [error, setError] = useState("");

  const [employeeDashboard, setEmployeeDashboard] = useState<EmployeeDashboardData | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboardData | null>(null);
  const [taskComplianceReport, setTaskComplianceReport] = useState<TaskComplianceReportData | null>(null);
  const [overdueAlerts, setOverdueAlerts] = useState<OverdueAlertsData | null>(null);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [projectIdFilter, setProjectIdFilter] = useState("");
  const [areaIdFilter, setAreaIdFilter] = useState("");
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(true);

  const adminQuery: AdminDashboardQuery = useMemo(() => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    projectId: projectIdFilter ? Number(projectIdFilter) : undefined,
    areaId: areaIdFilter ? Number(areaIdFilter) : undefined,
    employeeId: employeeIdFilter ? Number(employeeIdFilter) : undefined,
  }), [areaIdFilter, dateFrom, dateTo, employeeIdFilter, projectIdFilter]);

  const reportQuery = useMemo(() => ({
    ...adminQuery,
    compliance: complianceFilter,
    limit: 300,
  }), [adminQuery, complianceFilter]);

  const adminInsights = useMemo(() => {
    if (!adminDashboard || !taskComplianceReport) {
      return null;
    }

    const complianceSummary = taskComplianceReport.summary;
    const complianceTotal = complianceSummary.totalTasks;
    const complianceSegments: ComplianceSegment[] = [
      {
        key: "on_time",
        label: "En tiempo",
        count: complianceSummary.onTimeTasks,
        percentage: toPercentage(complianceSummary.onTimeTasks, complianceTotal),
        barClassName: "bg-success",
        textClassName: "text-success",
      },
      {
        key: "estimate_delayed",
        label: "Atraso estimado",
        count: complianceSummary.estimateDelayedTasks,
        percentage: toPercentage(complianceSummary.estimateDelayedTasks, complianceTotal),
        barClassName: "bg-warning",
        textClassName: "text-warning",
      },
      {
        key: "date_overdue",
        label: "Atraso por fecha",
        count: complianceSummary.dateOverdueTasks,
        percentage: toPercentage(complianceSummary.dateOverdueTasks, complianceTotal),
        barClassName: "bg-destructive",
        textClassName: "text-destructive",
      },
    ];

    const topEmployees = [...adminDashboard.employeeProductivity]
      .sort((a, b) => (
        b.completionRate - a.completionRate
        || b.doneTasks - a.doneTasks
        || b.totalTasks - a.totalTasks
      ))
      .slice(0, 5);

    const topAreas = [...adminDashboard.areaProductivity]
      .sort((a, b) => (
        b.completionRate - a.completionRate
        || b.doneTasks - a.doneTasks
        || b.totalTasks - a.totalTasks
      ))
      .slice(0, 5);

    const recentActivity = [...taskComplianceReport.rows]
      .sort((a, b) => {
        const aDate = new Date(a.completedAt ?? a.dueDate).getTime();
        const bDate = new Date(b.completedAt ?? b.dueDate).getTime();
        return bDate - aDate;
      })
      .slice(0, 6);

    return {
      complianceSegments,
      topEmployees,
      topAreas,
      recentActivity,
    };
  }, [adminDashboard, taskComplianceReport]);

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
          setTaskComplianceReport(null);
          setOverdueAlerts(null);
        } else if (isAdmin) {
          const [adminResponse, reportResponse, alertsResponse] = await Promise.all([
            getAdminDashboard(adminQuery),
            getTaskComplianceReport(reportQuery),
            getOverdueAlerts({ ...adminQuery, limit: 25 }),
          ]);
          setAdminDashboard(adminResponse?.data ?? null);
          setTaskComplianceReport(reportResponse?.data ?? null);
          setOverdueAlerts(alertsResponse?.data ?? null);
          setEmployeeDashboard(null);
        } else {
          setEmployeeDashboard(null);
          setAdminDashboard(null);
          setTaskComplianceReport(null);
          setOverdueAlerts(null);
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
  }, [adminQuery, isAdmin, isEmployee, reportQuery, user]);

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
    <div className="app-shell">
      <PageHero
        title="Dashboard"
        subtitle={
          isAdmin
            ? "Productividad consolidada, reporte de cumplimiento y alertas activas."
            : "Resumen operativo de tus tareas y tiempos de ejecucion."
        }
        icon={<LayoutDashboard className="size-5" />}
      />

      <div className="app-content">
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

          <section className="app-panel overflow-hidden">
            <div className="app-panel-header">
              <h2 className="text-lg font-semibold text-foreground">Tareas proximas a vencerse</h2>
            </div>
            {employeeDashboard.upcomingTasks.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                No tienes tareas proximas a vencerse en los siguientes 7 dias.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="app-table">
                  <thead className="app-table-head">
                    <tr>
                      <th className="app-th">Tarea</th>
                      <th className="app-th">Proyecto</th>
                      <th className="app-th">Estado</th>
                      <th className="app-th">Prioridad</th>
                      <th className="app-th">Vence</th>
                      <th className="app-th">Estimado</th>
                      <th className="app-th">Real</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeDashboard.upcomingTasks.map((task) => (
                      <tr key={task.id} className="app-row">
                        <td className="app-td">{task.title}</td>
                        <td className="app-td">{task.projectName}</td>
                        <td className="app-td">{task.status}</td>
                        <td className="app-td">{task.priority}</td>
                        <td className="app-td">{formatDate(task.dueDate)}</td>
                        <td className="app-td">
                          {task.estimatedMinutes === null ? "-" : formatMinutes(task.estimatedMinutes)}
                        </td>
                        <td className="app-td">{formatMinutes(task.actualMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
        )}

        {isAdmin && adminDashboard && taskComplianceReport && overdueAlerts && adminInsights && (
        <>
          <section className="app-panel app-panel-pad">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              <DateRangeFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
                placeholder="Rango por fecha limite"
              />
              <select
                value={projectIdFilter}
                onChange={(event) => setProjectIdFilter(event.target.value)}
                className="app-control"
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
                className="app-control"
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
                className="app-control"
              >
                <option value="">Empleado: todos</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <select
                value={complianceFilter}
                onChange={(event) => setComplianceFilter(event.target.value as ComplianceFilter)}
                className="app-control"
              >
                <option value="all">Cumplimiento: todos</option>
                <option value="on_time">En tiempo</option>
                <option value="estimate_delayed">Atraso estimado</option>
                <option value="date_overdue">Atraso por fecha</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setProjectIdFilter("");
                  setAreaIdFilter("");
                  setEmployeeIdFilter("");
                  setComplianceFilter("all");
                }}
                className="app-btn-secondary w-full"
              >
                {isLoadingFilters ? "Cargando..." : "Limpiar filtros"}
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <article className="app-panel px-5 py-4">
              <p className="text-3xl font-semibold tracking-tight text-primary">{adminDashboard.teamSummary.totalTasks}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tareas totales</p>
            </article>
            <article className="app-panel px-5 py-4">
              <p className="text-3xl font-semibold tracking-tight text-primary">{adminDashboard.teamSummary.completionRate}%</p>
              <p className="mt-1 text-sm text-muted-foreground">Cumplimiento</p>
            </article>
            <article className="app-panel px-5 py-4">
              <p className="text-3xl font-semibold tracking-tight text-primary">{formatMinutes(adminDashboard.teamSummary.totalEstimatedMinutes)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tiempo estimado</p>
            </article>
            <article className="app-panel px-5 py-4">
              <p className="text-3xl font-semibold tracking-tight text-primary">{formatMinutes(adminDashboard.teamSummary.totalActualMinutes)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tiempo real</p>
            </article>
          </section>

          <section className="app-panel overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAlertsExpanded((current) => !current)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
              aria-expanded={isAlertsExpanded}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">
                    {overdueAlerts.counters.totalAlerts} tarea(s) con alerta activa
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Fecha: {overdueAlerts.counters.dateOverdueAlerts} · Estimación: {overdueAlerts.counters.estimateOverdueAlerts}
                  </p>
                </div>
              </div>
              {isAlertsExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>

            {isAlertsExpanded && (
              <>
                {overdueAlerts.alerts.length === 0 ? (
                  <div className="px-5 py-5 border-t border-border text-sm text-muted-foreground">
                    No hay tareas con alertas activas para los filtros seleccionados.
                  </div>
                ) : (
                  <div className="border-t border-border divide-y divide-border">
                    {overdueAlerts.alerts.slice(0, 6).map((alert) => (
                      <article key={alert.taskId} className="px-5 py-3.5 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{alert.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {alert.projectName} · {alert.assigneeName ?? "Sin asignar"} · Vence {formatDate(alert.dueDate)}
                          </p>
                          <p className={`mt-1 text-xs font-medium ${getAlertReasonClass(alert.reason)}`}>{alert.reasonLabel}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${alert.projectId}?taskId=${alert.taskId}`)}
                          className="app-action-link inline-flex items-center gap-1"
                        >
                          Ver tarea
                          <ExternalLink className="size-3.5" />
                        </button>
                      </article>
                    ))}
                    {overdueAlerts.alerts.length > 6 && (
                      <p className="px-5 py-3 text-xs text-muted-foreground">
                        Mostrando 6 de {overdueAlerts.alerts.length} alertas.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="app-panel app-panel-pad space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Cumplimiento del equipo</h2>
                <p className="text-sm text-muted-foreground">Vista agregada de entregas en tiempo y atrasos.</p>
              </div>
              <p className="text-sm font-medium text-foreground">{adminDashboard.teamSummary.completionRate}% global</p>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/70 flex">
              {adminInsights.complianceSegments.map((segment) => (
                segment.count > 0 ? (
                  <div
                    key={segment.key}
                    className={segment.barClassName}
                    style={{ width: `${segment.percentage}%` }}
                  />
                ) : null
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {adminInsights.complianceSegments.map((segment) => (
                <article key={segment.key} className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className={`text-2xl font-semibold ${segment.textClassName}`}>{segment.count}</p>
                  <p className={`mt-1 text-sm font-medium ${segment.textClassName}`}>{segment.label}</p>
                  <p className="text-xs text-muted-foreground">{segment.percentage}% del total</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="app-panel app-panel-pad">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Top empleados</h2>
                <button
                  type="button"
                  onClick={() => navigate("/employees")}
                  className="app-action-link text-sm"
                >
                  Ver equipo
                </button>
              </div>
              {adminInsights.topEmployees.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros seleccionados.</p>
              ) : (
                <ol className="mt-4 space-y-2.5">
                  {adminInsights.topEmployees.map((item, index) => (
                    <li
                      key={item.employeeId}
                      className="rounded-xl border border-border bg-background px-3.5 py-3 flex items-center gap-3"
                    >
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.employeeName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.doneTasks} terminadas · {item.totalTasks} totales
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.completionRate}%</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="app-panel app-panel-pad">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Top áreas</h2>
                <button
                  type="button"
                  onClick={() => navigate("/areas")}
                  className="app-action-link text-sm"
                >
                  Ver áreas
                </button>
              </div>
              {adminInsights.topAreas.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros seleccionados.</p>
              ) : (
                <div className="mt-4 space-y-3.5">
                  {adminInsights.topAreas.map((item) => (
                    <article key={item.areaId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <p className="font-medium text-foreground">{item.areaName}</p>
                        <p className="text-foreground">{item.completionRate}%</p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(0, Math.min(100, item.completionRate))}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{item.doneTasks} de {item.totalTasks} tareas terminadas</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="app-panel app-panel-pad">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Actividad reciente</h2>
                <p className="text-sm text-muted-foreground">Últimos movimientos de tareas según los filtros activos.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/projects")}
                className="app-action-link inline-flex items-center gap-1"
              >
                Ver reporte completo
                <ExternalLink className="size-3.5" />
              </button>
            </div>

            {adminInsights.recentActivity.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No hay actividad para los filtros seleccionados.</p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {adminInsights.recentActivity.map((row) => (
                  <article key={row.taskId} className="rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.projectName} · {row.assigneeName ?? "Sin asignar"}
                        </p>
                      </div>
                      <span className={`text-xs font-medium ${getComplianceBadgeClass(row.complianceStatus)}`}>
                        {row.complianceLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Vence: {formatDate(row.dueDate)}</span>
                      <span>Estimado: {row.estimatedMinutes === null ? "-" : formatMinutes(row.estimatedMinutes)}</span>
                      <span>Real: {formatMinutes(row.actualMinutes)}</span>
                      <span>Desvío: {row.deviationMinutes === null ? "-" : `${row.deviationMinutes > 0 ? "+" : ""}${row.deviationMinutes} min`}</span>
                      {row.completedAt && <span>Cierre: {formatDateTime(row.completedAt)}</span>}
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${row.projectId}?taskId=${row.taskId}`)}
                        className="app-action-link inline-flex items-center gap-1 text-xs"
                      >
                        Ver tarea
                        <ExternalLink className="size-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
        )}
      </div>
    </div>
  );
}
