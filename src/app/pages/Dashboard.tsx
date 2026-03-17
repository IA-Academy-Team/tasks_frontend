import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
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
import { ProjectHealthSection, type ProjectHealthItem } from "../components/dashboard/ProjectHealthSection";
import { TeamPerformanceSection, type TeamPerformanceItem } from "../components/dashboard/TeamPerformanceSection";
import { WorkloadDistributionChart, type WorkloadItem } from "../components/dashboard/WorkloadDistributionChart";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
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
  overloadThreshold: number;
  statusDistribution: {
    status: string;
    value: number;
    fill: string;
  }[];
  projectHealth: ProjectHealthItem[];
  teamPerformance: TeamPerformanceItem[];
  workload: WorkloadItem[];
  recentActivity: TaskComplianceReportData["rows"];
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

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [projectIdFilter, setProjectIdFilter] = useState("");
  const [areaIdFilter, setAreaIdFilter] = useState("");
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");

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

  const adminInsights: AdminInsights | null = useMemo(() => {
    if (!adminDashboard || !taskComplianceReport) {
      return null;
    }

    const teamSummary = adminDashboard.teamSummary;
    const statusDistribution = [
      { status: "Asignada", value: teamSummary.assignedTasks, fill: "var(--chart-1)" },
      { status: "En proceso", value: teamSummary.inProgressTasks, fill: "var(--chart-4)" },
      { status: "Terminada", value: teamSummary.doneTasks, fill: "var(--chart-2)" },
    ];

    const efficiencyRate = toEfficiencyRate(teamSummary.totalEstimatedMinutes, teamSummary.totalActualMinutes);

    const workloadMap = new Map<number, WorkloadItem>();
    taskComplianceReport.rows.forEach((row) => {
      if (row.assigneeEmployeeId === null || row.assigneeName === null) return;
      if (isDoneStatus(row.status)) return;
      const current = workloadMap.get(row.assigneeEmployeeId);
      if (current) {
        current.activeTasks += 1;
        return;
      }
      workloadMap.set(row.assigneeEmployeeId, {
        employeeId: row.assigneeEmployeeId,
        employeeName: row.assigneeName,
        activeTasks: 1,
      });
    });

    const workload = [...workloadMap.values()].sort((a, b) => b.activeTasks - a.activeTasks);
    const avgWorkload = workload.length === 0
      ? 0
      : workload.reduce((acc, item) => acc + item.activeTasks, 0) / workload.length;
    const overloadThreshold = Math.max(3, Math.ceil(avgWorkload * 1.4));

    const teamPerformance = adminDashboard.employeeProductivity
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        assignedTasks: employee.assignedTasks,
        inProgressTasks: employee.inProgressTasks,
        doneTasks: employee.doneTasks,
        totalTasks: employee.totalTasks,
        completionRate: employee.completionRate,
        efficiencyRate: toEfficiencyRate(employee.totalEstimatedMinutes, employee.totalActualMinutes),
      }))
      .sort((a, b) => b.completionRate - a.completionRate || b.doneTasks - a.doneTasks);

    const projectHealthMap = new Map<number, ProjectHealthItem>();
    taskComplianceReport.rows.forEach((row) => {
      const current = projectHealthMap.get(row.projectId);
      if (!current) {
        projectHealthMap.set(row.projectId, {
          projectId: row.projectId,
          projectName: row.projectName,
          totalTasks: 1,
          completedTasks: isDoneStatus(row.status) ? 1 : 0,
          overdueTasks: row.isDateOverdue ? 1 : 0,
          completionRate: 0,
          estimatedMinutes: row.estimatedMinutes ?? 0,
          actualMinutes: row.actualMinutes,
        });
        return;
      }
      current.totalTasks += 1;
      current.completedTasks += isDoneStatus(row.status) ? 1 : 0;
      current.overdueTasks += row.isDateOverdue ? 1 : 0;
      current.estimatedMinutes += row.estimatedMinutes ?? 0;
      current.actualMinutes += row.actualMinutes;
    });

    const projectHealth = [...projectHealthMap.values()]
      .map((project) => ({
        ...project,
        completionRate: project.totalTasks > 0
          ? Math.round((project.completedTasks / project.totalTasks) * 100)
          : 0,
      }))
      .sort((a, b) => b.overdueTasks - a.overdueTasks || a.completionRate - b.completionRate);

    const recentActivity = [...taskComplianceReport.rows]
      .sort((a, b) => {
        const aDate = new Date(a.completedAt ?? a.dueDate).getTime();
        const bDate = new Date(b.completedAt ?? b.dueDate).getTime();
        return bDate - aDate;
      })
      .slice(0, 5);

    return {
      efficiencyRate,
      overloadThreshold,
      statusDistribution,
      projectHealth,
      teamPerformance,
      workload,
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
    setAreaIdFilter("");
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
              statusDistribution={adminInsights.statusDistribution}
            />

            <ProjectHealthSection
              projects={adminInsights.projectHealth}
              onOpenProject={(projectId) => navigate(`/projects/${projectId}`)}
            />

            <TeamPerformanceSection
              team={adminInsights.teamPerformance}
              onOpenEmployees={() => navigate("/employees")}
            />

            <WorkloadDistributionChart
              workload={adminInsights.workload}
              overloadThreshold={adminInsights.overloadThreshold}
            />

            <RecentActivity
              rows={adminInsights.recentActivity}
              onOpenTask={(projectId, taskId) => navigate(`/projects/${projectId}?taskId=${taskId}`)}
              onOpenProjects={() => navigate("/projects")}
            />
          </>
        )}
      </div>
    </div>
  );
}
