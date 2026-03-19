import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Pie, PieChart } from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  PlayCircle,
  Plus,
  TrendingUp,
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
import { cn } from "../components/ui/utils";
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

const EMPTY_AGGREGATE = {
  totalTasks: 0,
  assignedTasks: 0,
  inProgressTasks: 0,
  doneTasks: 0,
  completionRate: 0,
  totalEstimatedMinutes: 0,
  totalActualMinutes: 0,
  totalDeviationMinutes: 0,
};

type EmployeeUrgencyTone = "critical" | "warning" | "normal";

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const getUrgencyTone = (dueDate: string): EmployeeUrgencyTone => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const daysRemaining = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 1) return "critical";
  if (daysRemaining <= 3) return "warning";
  return "normal";
};

const employeeUrgencyStyles: Record<EmployeeUrgencyTone, {
  ringClassName: string;
  dotClassName: string;
  labelClassName: string;
  label: string;
}> = {
  critical: {
    ringClassName: "border-destructive/45 bg-destructive/8",
    dotClassName: "bg-destructive",
    labelClassName: "text-destructive",
    label: "Alta",
  },
  warning: {
    ringClassName: "border-warning/45 bg-warning/8",
    dotClassName: "bg-warning",
    labelClassName: "text-warning",
    label: "Media",
  },
  normal: {
    ringClassName: "border-primary/30 bg-primary/8",
    dotClassName: "bg-primary",
    labelClassName: "text-primary",
    label: "Normal",
  },
};

type AdminInsights = {
  efficiencyRate: number;
  statusDistribution: {
    status: string;
    value: number;
    fill: string;
  }[];
  projectPerformance: {
    projectId: number;
    projectName: string;
    completionRate: number;
    doneTasks: number;
    totalTasks: number;
  }[];
  complianceBreakdown: {
    label: string;
    value: number;
    ratio: number;
    toneClassName: string;
    barClassName: string;
  }[];
  teamPerformance: {
    employeeId: number;
    employeeName: string;
    doneTasks: number;
    totalTasks: number;
    completionRate: number;
  }[];
  pendingTasks: Array<{
    taskId: number;
    title: string;
    projectName: string;
    assigneeName: string | null;
    dueDate: string;
    status: string;
  }>;
  overdueTasks: Array<{
    taskId: number;
    title: string;
    projectName: string;
    assigneeName: string | null;
    dueDate: string;
    reason: string;
  }>;
  recentActivity: TaskComplianceReportData["rows"];
};

const pieChartConfig = {
  Asignada: {
    label: "Asignadas",
    theme: {
      light: "var(--pie-status-assigned)",
      dark: "var(--pie-status-assigned)",
    },
  },
  "En proceso": {
    label: "En proceso",
    theme: {
      light: "var(--pie-status-in-progress)",
      dark: "var(--pie-status-in-progress)",
    },
  },
  Terminada: {
    label: "Terminadas",
    theme: {
      light: "var(--pie-status-done)",
      dark: "var(--pie-status-done)",
    },
  },
  "Retrasada/Vencida": {
    label: "Retrasadas/Vencidas",
    theme: {
      light: "var(--pie-status-overdue)",
      dark: "var(--pie-status-overdue)",
    },
  },
} satisfies ChartConfig;

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const employeeInsights = useMemo(() => {
    if (!employeeDashboard) return null;

    const orderedUpcoming = [...employeeDashboard.upcomingTasks].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
    const nextToExpire = orderedUpcoming.slice(0, 6).map((task) => ({
      ...task,
      urgency: getUrgencyTone(task.dueDate),
    }));

    const inProgressTask =
      orderedUpcoming.find((task) => task.status.trim().toLowerCase() === "en proceso") ?? null;
    const pausedTasks = orderedUpcoming
      .filter((task) => task.status.trim().toLowerCase() === "asignada")
      .slice(0, 3);

    const now = new Date();
    const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weeklyDistribution = Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(currentDay);
      day.setDate(currentDay.getDate() + offset);
      const dayKey = toDateKey(day);
      const value = orderedUpcoming.filter((task) => task.dueDate.slice(0, 10) === dayKey).length;
      return {
        key: dayKey,
        label: day.toLocaleDateString("es-ES", { weekday: "short" }).slice(0, 3),
        value,
      };
    });
    const maxWeeklyValue = Math.max(...weeklyDistribution.map((item) => item.value), 1);

    const criticalTasks = nextToExpire.filter((task) => task.urgency === "critical").length;
    const warningTasks = nextToExpire.filter((task) => task.urgency === "warning").length;

    return {
      nextToExpire,
      inProgressTask,
      pausedTasks,
      criticalTasks,
      warningTasks,
      weeklyDistribution: weeklyDistribution.map((item) => ({
        ...item,
        height: Math.max(8, Math.round((item.value / maxWeeklyValue) * 100)),
      })),
    };
  }, [employeeDashboard]);

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

    const teamSummary = adminDashboard.teamSummary ?? EMPTY_AGGREGATE;
    const complianceSummary = taskComplianceReport.summary ?? {
      totalTasks: 0,
      onTimeTasks: 0,
      estimateDelayedTasks: 0,
      dateOverdueTasks: 0,
    };
    const complianceRows = Array.isArray(taskComplianceReport.rows) ? taskComplianceReport.rows : [];
    const projectProductivity = Array.isArray(adminDashboard.projectProductivity) ? adminDashboard.projectProductivity : [];
    const employeeProductivity = Array.isArray(adminDashboard.employeeProductivity) ? adminDashboard.employeeProductivity : [];

    const statusDistribution = [
      { status: "Asignada", value: teamSummary.assignedTasks, fill: "var(--pie-status-assigned)" },
      { status: "En proceso", value: teamSummary.inProgressTasks, fill: "var(--pie-status-in-progress)" },
      { status: "Terminada", value: teamSummary.doneTasks, fill: "var(--pie-status-done)" },
      {
        status: "Retrasada/Vencida",
        value: complianceSummary.estimateDelayedTasks + complianceSummary.dateOverdueTasks,
        fill: "var(--pie-status-overdue)",
      },
    ];

    const efficiencyRate = toEfficiencyRate(teamSummary.totalEstimatedMinutes, teamSummary.totalActualMinutes);

    const projectPerformance = projectProductivity
      .map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        completionRate: project.completionRate,
        doneTasks: project.doneTasks,
        totalTasks: project.totalTasks,
      }))
      .sort((a, b) => b.completionRate - a.completionRate || b.doneTasks - a.doneTasks);

    const complianceTotal = Math.max(
      complianceSummary.totalTasks,
      complianceSummary.onTimeTasks + complianceSummary.estimateDelayedTasks + complianceSummary.dateOverdueTasks,
      1,
    );
    const complianceBreakdown = [
      {
        label: "En tiempo",
        value: complianceSummary.onTimeTasks,
        ratio: Math.round((complianceSummary.onTimeTasks / complianceTotal) * 100),
        toneClassName: "text-success",
        barClassName: "bg-success",
      },
      {
        label: "Atraso estimado",
        value: complianceSummary.estimateDelayedTasks,
        ratio: Math.round((complianceSummary.estimateDelayedTasks / complianceTotal) * 100),
        toneClassName: "text-warning",
        barClassName: "bg-warning",
      },
      {
        label: "Retrasada/Vencida",
        value: complianceSummary.dateOverdueTasks,
        ratio: Math.round((complianceSummary.dateOverdueTasks / complianceTotal) * 100),
        toneClassName: "text-destructive",
        barClassName: "bg-destructive",
      },
    ];

    const teamPerformance = employeeProductivity
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        doneTasks: employee.doneTasks,
        totalTasks: employee.totalTasks,
        completionRate: employee.completionRate,
      }))
      .sort((a, b) => b.completionRate - a.completionRate || b.doneTasks - a.doneTasks);

    const pendingTasks = complianceRows
      .filter((row) => !isDoneStatus(row.status) && !row.isDateOverdue && row.isEstimateDelayed !== true)
      .map((row) => ({
        taskId: row.taskId,
        title: row.title,
        projectName: row.projectName,
        assigneeName: row.assigneeName,
        dueDate: row.dueDate,
        status: row.status,
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const overdueTasks = complianceRows
      .filter((row) => row.isDateOverdue || row.isEstimateDelayed === true)
      .map((row) => ({
        taskId: row.taskId,
        title: row.title,
        projectName: row.projectName,
        assigneeName: row.assigneeName,
        dueDate: row.dueDate,
        reason: row.isDateOverdue ? "Vencida por fecha" : "Retrasada por estimado",
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const recentActivity = [...complianceRows]
      .sort((a, b) => {
        const aDate = new Date(a.completedAt ?? a.dueDate).getTime();
        const bDate = new Date(b.completedAt ?? b.dueDate).getTime();
        return bDate - aDate;
      })
      .slice(0, 5);

    return {
      efficiencyRate,
      statusDistribution,
      projectPerformance,
      complianceBreakdown,
      teamPerformance,
      pendingTasks,
      overdueTasks,
      recentActivity,
    };
  }, [adminDashboard, taskComplianceReport]);

  const onTimeComplianceRate = useMemo(() => {
    if (!adminInsights) return 0;
    return adminInsights.complianceBreakdown.find((item) => item.label === "En tiempo")?.ratio ?? 0;
  }, [adminInsights]);

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
          <section className="rounded-xl border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {error}
          </section>
        )}

        {isEmployee && employeeDashboard && employeeInsights && (
          <>
            <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_10px_28px_rgba(16,36,58,0.08)]">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Bienvenido de nuevo, {user.name.split(" ")[0]}</h2>
                <p className="text-sm text-muted-foreground">Resumen rapido para priorizar tu trabajo de hoy.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/tasks/standalone")}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Plus className="size-4" />
                Tarea
              </button>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <article className="app-panel p-4 border-border/70 bg-card/95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tareas activas</p>
                    <p className="mt-1 text-3xl font-semibold text-foreground">
                      {employeeDashboard.summary.assignedTasks + employeeDashboard.summary.inProgressTasks}
                    </p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <FolderKanban className="size-5" />
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Asignadas + en proceso</p>
              </article>

              <article className="app-panel p-4 border-border/70 bg-card/95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completadas</p>
                    <p className="mt-1 text-3xl font-semibold text-foreground">{employeeDashboard.summary.doneTasks}</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-success/12 text-success">
                    <CheckCircle2 className="size-5" />
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Total entregadas</p>
              </article>

              <article className="app-panel p-4 border-border/70 bg-card/95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proximas a vencer</p>
                    <p className="mt-1 text-3xl font-semibold text-foreground">{employeeDashboard.summary.upcomingTasks}</p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-warning/12 text-warning">
                    <CalendarClock className="size-5" />
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {employeeInsights.criticalTasks} criticas · {employeeInsights.warningTasks} en riesgo medio
                </p>
              </article>

              <article className="app-panel p-4 border-border/70 bg-card/95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tiempo acumulado</p>
                    <p className="mt-1 text-3xl font-semibold text-foreground">
                      {formatMinutes(employeeDashboard.summary.activeTasksAccumulatedMinutes)}
                    </p>
                  </div>
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Timer className="size-5" />
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Registrado en tareas activas</p>
              </article>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <article className="app-panel app-panel-pad border-border/70 bg-card/95 xl:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Tareas proximas a vencer</h2>
                  <button
                    type="button"
                    onClick={() => navigate("/projects")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
                  >
                    Ver proyectos
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
                {employeeInsights.nextToExpire.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-secondary/45 px-4 py-6 text-sm text-muted-foreground">
                    No hay tareas proximas a vencerse para los siguientes dias.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {employeeInsights.nextToExpire.map((task) => {
                      const urgencyStyle = employeeUrgencyStyles[task.urgency];
                      return (
                        <article
                          key={task.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                            urgencyStyle.ringClassName,
                          )}
                        >
                          <span className={cn("size-2.5 rounded-full", urgencyStyle.dotClassName)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{task.projectName}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-xs font-semibold", urgencyStyle.labelClassName)}>{urgencyStyle.label}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="app-panel app-panel-pad border-border/70 bg-card/95 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Foco activo</h2>
                  <PlayCircle className="size-5 text-primary" />
                </div>
                {employeeInsights.inProgressTask ? (
                  <div className="rounded-xl border border-primary/35 bg-primary/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">En progreso</p>
                    <h3 className="mt-2 text-base font-semibold text-foreground">{employeeInsights.inProgressTask.title}</h3>
                    <p className="text-xs text-muted-foreground">{employeeInsights.inProgressTask.projectName}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-card/85 px-2.5 py-2">
                        <p className="text-muted-foreground">Vence</p>
                        <p className="font-semibold text-foreground">{formatDate(employeeInsights.inProgressTask.dueDate)}</p>
                      </div>
                      <div className="rounded-lg bg-card/85 px-2.5 py-2">
                        <p className="text-muted-foreground">Estimado</p>
                        <p className="font-semibold text-foreground">
                          {employeeInsights.inProgressTask.estimatedMinutes
                            ? formatMinutes(employeeInsights.inProgressTask.estimatedMinutes)
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-secondary/45 px-4 py-6 text-sm text-muted-foreground">
                    No tienes tareas en progreso en este momento.
                  </p>
                )}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pendientes asignadas</p>
                  {employeeInsights.pausedTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin tareas pendientes.</p>
                  ) : (
                    employeeInsights.pausedTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/40 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{task.projectName}</p>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{formatDate(task.dueDate)}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className="app-panel app-panel-pad border-border/70 bg-card/95">
              <div className="mb-5 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Actividad esperada</h2>
                  <p className="text-sm text-muted-foreground">Distribucion de vencimientos para los proximos 7 dias.</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">7 dias</span>
              </div>
              <div className="flex h-44 items-end gap-2">
                {employeeInsights.weeklyDistribution.map((item) => (
                  <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-md bg-primary/25 transition-colors",
                          item.value > 0 && "bg-primary",
                        )}
                        style={{ height: `${item.height}%` }}
                        title={`${item.value} tareas`}
                      />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {isAdmin && adminDashboard && taskComplianceReport && adminInsights && (
          <>
            <section className="rounded-xl border border-border/70 bg-card/95 p-4 shadow-[0_10px_28px_rgba(16,36,58,0.08)]">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                <DateRangeFilter
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateChange={(from, to) => {
                    setDateFrom(from);
                    setDateTo(to);
                  }}
                  triggerClassName="bg-card/70"
                  placeholder="Rango por fecha limite"
                />
                <select
                  value={projectIdFilter}
                  onChange={(event) => setProjectIdFilter(event.target.value)}
                  className="app-control h-10 bg-card/70"
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
                  className="app-control h-10 bg-card/70"
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
                  className="app-control h-10 bg-card/70"
                >
                  <option value="all">Cumplimiento: todos</option>
                  <option value="on_time">En tiempo</option>
                  <option value="estimate_delayed">Atraso estimado</option>
                  <option value="date_overdue">Atraso por fecha</option>
                </select>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="app-btn-secondary h-10 w-full border-border/80 bg-card/75"
                >
                  {isLoadingFilters ? "Cargando..." : "Limpiar filtros"}
                </button>
              </div>
            </section>

            <DashboardMetrics
              summary={adminDashboard.teamSummary}
              efficiencyRate={adminInsights.efficiencyRate}
            />

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <article className="app-panel app-panel-pad border-border/70 bg-card/95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Rendimiento por proyecto</h2>
                    <p className="text-sm text-muted-foreground">Comparativo de cumplimiento por iniciativa.</p>
                  </div>
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Activity className="size-4.5" />
                  </span>
                </div>
                {adminInsights.projectPerformance.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros activos.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {adminInsights.projectPerformance.slice(0, 4).map((row) => (
                      <div key={row.projectId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold uppercase tracking-wide text-muted-foreground">{row.projectName}</span>
                          <span className="font-semibold text-foreground">{row.completionRate}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/75">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(5, Math.min(100, row.completionRate))}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{row.doneTasks}/{row.totalTasks} tareas completadas</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="app-panel app-panel-pad border-border/70 bg-card/95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Tendencia de cumplimiento</h2>
                    <p className="text-sm text-muted-foreground">Balance entre tareas en tiempo y con atraso.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success">{onTimeComplianceRate}%</p>
                    <p className="text-xs text-muted-foreground">En tiempo</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {adminInsights.complianceBreakdown.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</span>
                        <span className={cn("font-semibold", item.toneClassName)}>{item.value} ({item.ratio}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/75">
                        <div
                          className={cn("h-full rounded-full", item.barClassName)}
                          style={{ width: `${Math.max(3, Math.min(100, item.ratio))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <article className="app-panel app-panel-pad border-border/70 bg-card/95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Distribución por estado</h2>
                    <p className="text-sm text-muted-foreground">Vista general de estados de tarea.</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{adminDashboard.teamSummary.totalTasks} tareas</p>
                </div>
                <div className="mt-4">
                  <ChartContainer config={pieChartConfig} className="mx-auto h-[240px] w-full max-w-[280px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                      <Pie
                        data={adminInsights.statusDistribution}
                        dataKey="value"
                        nameKey="status"
                        innerRadius={56}
                        outerRadius={86}
                        stroke="var(--card)"
                        strokeWidth={4}
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

              <article className="app-panel app-panel-pad border-border/70 bg-card/95">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Rendimiento por cumplimiento</h2>
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <TrendingUp className="size-4.5" />
                  </span>
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

              <article className="app-panel app-panel-pad border-border/70 bg-card/95 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Alertas operativas</h2>
                  <p className="text-sm text-muted-foreground">Pendientes y tareas vencidas/retrasadas.</p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/8 px-2 py-1 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Prioriza tareas retrasadas o vencidas
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="app-table">
                    <thead className="app-table-head">
                      <tr>
                        <th className="app-th">Tarea pendiente</th>
                        <th className="app-th">Proyecto</th>
                        <th className="app-th">Empleado</th>
                        <th className="app-th">Estado</th>
                        <th className="app-th">Vence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminInsights.pendingTasks.length === 0 ? (
                        <tr className="app-row">
                          <td className="app-td" colSpan={5}>Sin tareas pendientes para los filtros activos.</td>
                        </tr>
                      ) : (
                        adminInsights.pendingTasks.slice(0, 8).map((row) => (
                          <tr key={row.taskId} className="app-row">
                            <td className="app-td">{row.title}</td>
                            <td className="app-td">{row.projectName}</td>
                            <td className="app-td">{row.assigneeName ?? "Sin asignar"}</td>
                            <td className="app-td">{row.status}</td>
                            <td className="app-td">{formatDate(row.dueDate)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto">
                  <table className="app-table">
                    <thead className="app-table-head">
                      <tr>
                        <th className="app-th">Tarea retrasada/vencida</th>
                        <th className="app-th">Proyecto</th>
                        <th className="app-th">Empleado</th>
                        <th className="app-th">Motivo</th>
                        <th className="app-th">Vence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminInsights.overdueTasks.length === 0 ? (
                        <tr className="app-row">
                          <td className="app-td" colSpan={5}>Sin tareas retrasadas o vencidas.</td>
                        </tr>
                      ) : (
                        adminInsights.overdueTasks.slice(0, 8).map((row) => (
                          <tr key={row.taskId} className="app-row">
                            <td className="app-td">{row.title}</td>
                            <td className="app-td">{row.projectName}</td>
                            <td className="app-td">{row.assigneeName ?? "Sin asignar"}</td>
                            <td className="app-td">{row.reason}</td>
                            <td className="app-td">{formatDate(row.dueDate)}</td>
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

        {isAdmin && !error && (!adminDashboard || !taskComplianceReport || !adminInsights) && (
          <section className="rounded-xl border border-border/70 bg-card/90 px-4 py-5 text-sm text-muted-foreground">
            No fue posible procesar la informacion del dashboard con los datos actuales.
          </section>
        )}
      </div>
    </div>
  );
}
