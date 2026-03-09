import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Timer,
  Users,
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
          <p className="mt-2 text-2xl font-semibold text-foreground">{props.value}</p>
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
  const [isComplianceExpanded, setIsComplianceExpanded] = useState(true);
  const [isEmployeeProductivityExpanded, setIsEmployeeProductivityExpanded] = useState(true);
  const [isAreaProductivityExpanded, setIsAreaProductivityExpanded] = useState(true);

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

        {isAdmin && adminDashboard && taskComplianceReport && overdueAlerts && (
        <>
          <section className="app-panel app-panel-pad space-y-4">
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
                className="app-btn-secondary"
              >
                {isLoadingFilters ? "Cargando..." : "Limpiar filtros"}
              </button>
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

          <section className="app-panel overflow-hidden">
            <div className="app-panel-header">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Alertas activas de atraso</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAlertsExpanded((current) => !current)}
                  className="app-btn-secondary px-3 py-1.5 text-xs"
                  aria-expanded={isAlertsExpanded}
                >
                  {isAlertsExpanded ? "" : ""}
                  {isAlertsExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>
            </div>
            {isAlertsExpanded && (
              <>
                <div className="px-5 py-3 bg-secondary/20 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
                  <span>Fecha: {overdueAlerts.counters.dateOverdueAlerts}</span>
                  <span>Estimacion: {overdueAlerts.counters.estimateOverdueAlerts}</span>
                </div>
                {overdueAlerts.alerts.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-muted-foreground">
                    No hay tareas con alertas activas para los filtros seleccionados.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {overdueAlerts.alerts.map((alert) => (
                      <div key={alert.taskId} className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`size-4 ${getAlertReasonClass(alert.reason)}`} />
                            <p className="font-medium text-foreground">{alert.title}</p>
                            <span className={`text-xs font-medium ${getAlertReasonClass(alert.reason)}`}>
                              {alert.reasonLabel}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {alert.projectName} · {alert.areaName} · Estado: {alert.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence: {formatDate(alert.dueDate)} · Estimado: {alert.estimatedMinutes === null ? "-" : formatMinutes(alert.estimatedMinutes)}
                            {" · "}
                            Real: {formatMinutes(alert.actualMinutes)}
                            {alert.daysOverdue ? ` · ${alert.daysOverdue} dia(s) de atraso` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Responsable: {alert.assigneeName ?? "Sin asignar"}{alert.assigneeEmail ? ` (${alert.assigneeEmail})` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${alert.projectId}?taskId=${alert.taskId}`)}
                          className="app-btn-secondary"
                        >
                          Ver tarea
                          <ExternalLink className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="app-panel overflow-hidden">
            <div className="app-panel-header">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Reporte de cumplimiento</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsComplianceExpanded((current) => !current)}
                  className="app-btn-secondary px-3 py-1.5 text-xs"
                  aria-expanded={isComplianceExpanded}
                >
                  {isComplianceExpanded ? "" : ""}
                  {isComplianceExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>
            </div>
            {isComplianceExpanded && (
              <>
                <div className="px-5 py-3 bg-secondary/20 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
                  <span>Total: {taskComplianceReport.summary.totalTasks}</span>
                  <span>En tiempo: {taskComplianceReport.summary.onTimeTasks}</span>
                  <span>Atraso estimado: {taskComplianceReport.summary.estimateDelayedTasks}</span>
                  <span>Atraso por fecha: {taskComplianceReport.summary.dateOverdueTasks}</span>
                </div>
                {taskComplianceReport.rows.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-muted-foreground">
                    No hay tareas en el reporte para los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="app-table">
                      <thead className="app-table-head">
                        <tr>
                          <th className="app-th">Tarea</th>
                          <th className="app-th">Proyecto</th>
                          <th className="app-th">Responsable</th>
                          <th className="app-th">Estado</th>
                          <th className="app-th">Vence</th>
                          <th className="app-th">Estimado</th>
                          <th className="app-th">Real</th>
                          <th className="app-th">Desvio</th>
                          <th className="app-th">Cumplimiento</th>
                          <th className="app-th">Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskComplianceReport.rows.map((row) => (
                          <tr
                            key={row.taskId}
                            className={`app-row ${
                              row.complianceStatus === "date_overdue"
                                ? "bg-destructive/5"
                                : row.complianceStatus === "estimate_delayed"
                                  ? "bg-warning/10"
                                  : ""
                            }`}
                          >
                            <td className="app-td">
                              <p>{row.title}</p>
                              <p className="text-xs text-muted-foreground">{row.priority}</p>
                            </td>
                            <td className="app-td">
                              <p>{row.projectName}</p>
                              <p className="text-xs text-muted-foreground">{row.areaName}</p>
                            </td>
                            <td className="app-td">
                              {row.assigneeName ? (
                                <>
                                  <p>{row.assigneeName}</p>
                                  <p className="text-xs text-muted-foreground">{row.assigneeEmail}</p>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Sin asignar</span>
                              )}
                            </td>
                            <td className="app-td">{row.status}</td>
                            <td className="app-td">
                              <p>{formatDate(row.dueDate)}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.completedAt ? `Cierre: ${formatDateTime(row.completedAt)}` : "Sin cierre"}
                              </p>
                            </td>
                            <td className="app-td">
                              {row.estimatedMinutes === null ? "-" : formatMinutes(row.estimatedMinutes)}
                            </td>
                            <td className="app-td">{formatMinutes(row.actualMinutes)}</td>
                            <td className="app-td">
                              {row.deviationMinutes === null ? "-" : `${row.deviationMinutes > 0 ? "+" : ""}${row.deviationMinutes} min`}
                            </td>
                            <td className={`app-td font-medium ${getComplianceBadgeClass(row.complianceStatus)}`}>
                              {row.complianceLabel}
                            </td>
                            <td className="app-td">
                              <button
                                type="button"
                                onClick={() => navigate(`/projects/${row.projectId}?taskId=${row.taskId}`)}
                                className="app-action-link inline-flex items-center gap-1"
                              >
                                Ver
                                <ExternalLink className="size-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="app-panel overflow-hidden">
            <div className="app-panel-header">
              <h2 className="text-lg font-semibold text-foreground">Productividad por empleado</h2>
              <button
                type="button"
                onClick={() => setIsEmployeeProductivityExpanded((current) => !current)}
                className="app-btn-secondary px-3 py-1.5 text-xs"
                aria-expanded={isEmployeeProductivityExpanded}
              >
                {isEmployeeProductivityExpanded ? "" : ""}
                {isEmployeeProductivityExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>
            {isEmployeeProductivityExpanded && (
              <>
                {adminDashboard.employeeProductivity.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-muted-foreground">
                    Sin datos para los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="app-table">
                      <thead className="app-table-head">
                        <tr>
                          <th className="app-th">Empleado</th>
                          <th className="app-th">Tareas</th>
                          <th className="app-th">Terminadas</th>
                          <th className="app-th">Cumplimiento</th>
                          <th className="app-th">Estimado</th>
                          <th className="app-th">Real</th>
                          <th className="app-th">Desvio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminDashboard.employeeProductivity.map((item) => (
                          <tr key={item.employeeId} className="app-row">
                            <td className="app-td">
                              <p>{item.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{item.employeeEmail}</p>
                            </td>
                            <td className="app-td">{item.totalTasks}</td>
                            <td className="app-td">{item.doneTasks}</td>
                            <td className="app-td">{item.completionRate}%</td>
                            <td className="app-td">{formatMinutes(item.totalEstimatedMinutes)}</td>
                            <td className="app-td">{formatMinutes(item.totalActualMinutes)}</td>
                            <td className="app-td">
                              {item.totalDeviationMinutes > 0 ? "+" : ""}{item.totalDeviationMinutes} min
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="app-panel overflow-hidden">
            <div className="app-panel-header">
              <h2 className="text-lg font-semibold text-foreground">Productividad por area</h2>
              <button
                type="button"
                onClick={() => setIsAreaProductivityExpanded((current) => !current)}
                className="app-btn-secondary px-3 py-1.5 text-xs"
                aria-expanded={isAreaProductivityExpanded}
              >
                {isAreaProductivityExpanded ? "" : ""}
                {isAreaProductivityExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>
            {isAreaProductivityExpanded && (
              <>
                {adminDashboard.areaProductivity.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-muted-foreground">
                    Sin datos para los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="app-table">
                      <thead className="app-table-head">
                        <tr>
                          <th className="app-th">Area</th>
                          <th className="app-th">Tareas</th>
                          <th className="app-th">Asignadas</th>
                          <th className="app-th">En proceso</th>
                          <th className="app-th">Terminadas</th>
                          <th className="app-th">Cumplimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminDashboard.areaProductivity.map((item) => (
                          <tr key={item.areaId} className="app-row">
                            <td className="app-td flex items-center gap-2">
                              <Users className="size-4 text-primary" />
                              {item.areaName}
                            </td>
                            <td className="app-td">{item.totalTasks}</td>
                            <td className="app-td">{item.assignedTasks}</td>
                            <td className="app-td">{item.inProgressTasks}</td>
                            <td className="app-td">{item.doneTasks}</td>
                            <td className="app-td">{item.completionRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </>
        )}
      </div>
    </div>
  );
}
