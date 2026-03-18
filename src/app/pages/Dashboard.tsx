import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Pie, PieChart } from "recharts";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  Timer,
} from "lucide-react";
import { ApiError } from "../../shared/api/api";
import { useAuth } from "../context/AuthContext";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { PageHero } from "../components/PageHero";
import { DashboardMetrics } from "../components/dashboard/DashboardMetrics";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../components/ui/chart";
import { listEmployees, type EmployeeSummary } from "../../modules/employees/api/employees.api";
import { listProjects, type ProjectSummary } from "../../modules/projects/api/projects.api";
import {
  getAdminDashboard,
  getEmployeeDashboard,
  getTaskComplianceReport,
  type AdminDashboardData,
  type AdminDashboardQuery,
  type ComplianceFilter,
  type EmployeeDashboardData,
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

const toEfficiencyRate = (estimatedMinutes: number, actualMinutes: number) => {
  if (estimatedMinutes <= 0 || actualMinutes <= 0) return 0;
  return Math.max(0, Math.round((estimatedMinutes / actualMinutes) * 100));
};

const isDoneStatus = (status: string) => status.trim().toLowerCase() === "terminada";

type AdminInsights = {
  efficiencyRate: number;
  statusDistribution: {
    status: string;
    value: number;
    fill: string;
  }[];
  teamPerformance: {
    employeeId: number;
    employeeName: string;
    doneTasks: number;
    totalTasks: number;
    completionRate: number;
  }[];
  upcomingTasksCount: number;
  pendingTasksCount: number;
  overdueTasks: Array<{
    taskId: number;
    title: string;
    projectName: string;
    dueDate: string;
    reason: string;
  }>;
  recentActivity: TaskComplianceReportData["rows"];
};

const pieChartConfig = {
  Asignada: { label: "Asignadas", color: "var(--chart-1)" },
  "En proceso": { label: "En proceso", color: "var(--chart-4)" },
  Terminada: { label: "Terminadas", color: "var(--chart-2)" },
  "Retrasada/Vencida": { label: "Retrasadas/Vencidas", color: "var(--chart-5)" },
} satisfies ChartConfig;

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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [error, setError] = useState("");

  const [employeeDashboard, setEmployeeDashboard] = useState<EmployeeDashboardData | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboardData | null>(null);
  const [taskComplianceReport, setTaskComplianceReport] = useState<TaskComplianceReportData | null>(null);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [projectIdFilter, setProjectIdFilter] = useState("");
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");

  const adminQuery: AdminDashboardQuery = useMemo(() => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    projectId: projectIdFilter ? Number(projectIdFilter) : undefined,
    employeeId: employeeIdFilter ? Number(employeeIdFilter) : undefined,
  }), [dateFrom, dateTo, employeeIdFilter, projectIdFilter]);

  const reportQuery = useMemo(() => ({
    ...adminQuery,
    compliance: complianceFilter,
    limit: 300,
  }), [adminQuery, complianceFilter]);

  const adminInsights: AdminInsights | null = useMemo(() => {
    if (!adminDashboard || !taskComplianceReport) {
      return null;
    }

    const teamSummary = adminDashboard.teamSummary;
    const statusDistribution = [
      { status: "Asignada", value: teamSummary.assignedTasks, fill: "var(--chart-1)" },
      { status: "En proceso", value: teamSummary.inProgressTasks, fill: "var(--chart-4)" },
      { status: "Terminada", value: teamSummary.doneTasks, fill: "var(--chart-2)" },
      {
        status: "Retrasada/Vencida",
        value: taskComplianceReport.summary.estimateDelayedTasks + taskComplianceReport.summary.dateOverdueTasks,
        fill: "var(--chart-5)",
      },
    ];

    const efficiencyRate = toEfficiencyRate(teamSummary.totalEstimatedMinutes, teamSummary.totalActualMinutes);

    const teamPerformance = adminDashboard.employeeProductivity
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        doneTasks: employee.doneTasks,
        totalTasks: employee.totalTasks,
        completionRate: employee.completionRate,
      }))
      .sort((a, b) => b.completionRate - a.completionRate || b.doneTasks - a.doneTasks);

    const now = new Date();
    const nextSevenDays = new Date();
    nextSevenDays.setDate(now.getDate() + 7);
    const upcomingTasksCount = taskComplianceReport.rows.filter((row) => {
      if (isDoneStatus(row.status)) return false;
      const dueDate = new Date(row.dueDate);
      return dueDate >= now && dueDate <= nextSevenDays;
    }).length;

    const pendingTasksCount = teamSummary.assignedTasks + teamSummary.inProgressTasks;

    const overdueTasks = taskComplianceReport.rows
      .filter((row) => row.isDateOverdue || row.isEstimateDelayed === true)
      .map((row) => ({
        taskId: row.taskId,
        title: row.title,
        projectName: row.projectName,
        dueDate: row.dueDate,
        reason: row.isDateOverdue ? "Vencida por fecha" : "Retrasada por estimado",
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const recentActivity = [...taskComplianceReport.rows]
      .sort((a, b) => {
        const aDate = new Date(a.completedAt ?? a.dueDate).getTime();
        const bDate = new Date(b.completedAt ?? b.dueDate).getTime();
        return bDate - aDate;
      })
      .slice(0, 5);

    return {
      efficiencyRate,
      statusDistribution,
      teamPerformance,
      upcomingTasksCount,
      pendingTasksCount,
      overdueTasks,
      recentActivity,
    };
  }, [adminDashboard, taskComplianceReport]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadFilters = async () => {
      setIsLoadingFilters(true);
      try {
        const [projectsResponse, employeesResponse] = await Promise.all([
          listProjects({ status: "all" }),
          listEmployees("active"),
        ]);
        setProjects(projectsResponse?.data ?? []);
        setEmployees((employeesResponse?.data ?? []).filter((employee) => employee.role === "employee"));
      } catch {
        setProjects([]);
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
        } else if (isAdmin) {
          const [adminResponse, reportResponse] = await Promise.all([
            getAdminDashboard(adminQuery),
            getTaskComplianceReport(reportQuery),
          ]);
          setAdminDashboard(adminResponse?.data ?? null);
          setTaskComplianceReport(reportResponse?.data ?? null);
          setEmployeeDashboard(null);
        } else {
          setEmployeeDashboard(null);
          setAdminDashboard(null);
          setTaskComplianceReport(null);
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

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setProjectIdFilter("");
    setEmployeeIdFilter("");
    setComplianceFilter("all");
  };

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
            ? "Panel operativo para decisiones del equipo en tiempo real."
            : "Resumen operativo de tus tareas y tiempos de ejecucion."
        }
        icon={<LayoutDashboard className="size-5" />}
      />

      <div className="app-content">
        {error && (
          <section className="app-panel app-panel-pad">
            <p className="text-sm text-destructive">{error}</p>
          </section>
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

        {isAdmin && adminDashboard && taskComplianceReport && adminInsights && (
          <>
            <section className="app-panel app-panel-pad">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
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
                  onClick={resetFilters}
                  className="app-btn-secondary w-full"
                >
                  {isLoadingFilters ? "Cargando..." : "Limpiar filtros"}
                </button>
              </div>
            </section>

            <DashboardMetrics
              summary={adminDashboard.teamSummary}
              efficiencyRate={adminInsights.efficiencyRate}
            />
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <article className="app-panel app-panel-pad">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Distribución por estado</h2>
                    <p className="text-sm text-muted-foreground">Vista general de estados de tarea.</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{adminDashboard.teamSummary.totalTasks} tareas</p>
                </div>
                <div className="mt-4">
                  <ChartContainer config={pieChartConfig} className="mx-auto h-[220px] w-full max-w-[260px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                      <Pie
                        data={adminInsights.statusDistribution}
                        dataKey="value"
                        nameKey="status"
                        innerRadius={52}
                        outerRadius={82}
                        strokeWidth={2}
                      />
                    </PieChart>
                  </ChartContainer>
                  <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {adminInsights.statusDistribution.map((item) => (
                      <li key={item.status} className="flex items-center justify-between gap-2 text-sm">
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <span className="size-2.5 rounded-sm" style={{ backgroundColor: item.fill }} />
                          {item.status}
                        </span>
                        <span className="font-medium text-foreground">{item.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>

              <article className="app-panel app-panel-pad">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Rendimiento por cumplimiento</h2>
                </div>
                {adminInsights.teamPerformance.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros activos.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="app-table">
                      <thead className="app-table-head">
                        <tr>
                          <th className="app-th">Empleado</th>
                          <th className="app-th">Cumplimiento</th>
                          <th className="app-th">Completadas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminInsights.teamPerformance.slice(0, 8).map((row) => (
                          <tr key={row.employeeId} className="app-row">
                            <td className="app-td">{row.employeeName}</td>
                            <td className="app-td">{row.completionRate}%</td>
                            <td className="app-td">{row.doneTasks}/{row.totalTasks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className="app-panel app-panel-pad space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Alertas operativas</h2>
                  <p className="text-sm text-muted-foreground">Pendientes y tareas críticas.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="app-table">
                    <thead className="app-table-head">
                      <tr>
                        <th className="app-th">Indicador</th>
                        <th className="app-th">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="app-row">
                        <td className="app-td">Próximas a vencerse (7 días)</td>
                        <td className="app-td">{adminInsights.upcomingTasksCount}</td>
                      </tr>
                      <tr className="app-row">
                        <td className="app-td">Pendientes (asignadas + en proceso)</td>
                        <td className="app-td">{adminInsights.pendingTasksCount}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto">
                  <table className="app-table">
                    <thead className="app-table-head">
                      <tr>
                        <th className="app-th">Tarea retrasada/vencida</th>
                        <th className="app-th">Proyecto</th>
                        <th className="app-th">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminInsights.overdueTasks.length === 0 ? (
                        <tr className="app-row">
                          <td className="app-td" colSpan={3}>Sin tareas retrasadas o vencidas.</td>
                        </tr>
                      ) : (
                        adminInsights.overdueTasks.map((row) => (
                          <tr key={row.taskId} className="app-row">
                            <td className="app-td">{row.title}</td>
                            <td className="app-td">{row.projectName}</td>
                            <td className="app-td">{row.reason}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
