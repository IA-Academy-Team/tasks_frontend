import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Pie, PieChart } from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  PlayCircle,
  Plus,
  Search,
  Timer,
} from "lucide-react";
import { ApiError } from "../../shared/api/api";
import { useAuth } from "../context/AuthContext";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { PageHero } from "../components/PageHero";
import { DashboardMetrics } from "../components/dashboard/DashboardMetrics";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
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

const ALERTS_PAGE_SIZE = 4;

type SearchableOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function SearchableSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  className,
  disabled = false,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={cn(
            "app-control inline-flex h-10 w-full items-center justify-between gap-2 bg-card/70",
            disabled && "cursor-not-allowed opacity-60",
            className,
          )}
          disabled={disabled}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Search className={cn("size-4 shrink-0", open ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("truncate", selectedOption ? "text-foreground" : "text-muted-foreground")}>
              {selectedOption?.label ?? placeholder}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[120] w-[var(--radix-popover-trigger-width)] border-border/80 bg-card p-0"
      >
        <Command className="bg-card">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value || "__all__"}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4 text-primary transition-opacity",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
  const [pendingAlertsPage, setPendingAlertsPage] = useState(1);
  const [overdueAlertsPage, setOverdueAlertsPage] = useState(1);

  const projectFilterOptions = useMemo<SearchableOption[]>(
    () => [
      { value: "", label: "Todos los proyectos" },
      ...projects.map((project) => ({ value: String(project.id), label: project.name })),
    ],
    [projects],
  );

  const employeeFilterOptions = useMemo<SearchableOption[]>(
    () => [
      { value: "", label: "Todos los empleados" },
      ...employees.map((employee) => ({ value: String(employee.id), label: employee.name })),
    ],
    [employees],
  );

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

    const projectPerformance = projectProductivity
      .map((project) => ({
        projectId: project.projectId,
        projectName: project.projectName,
        completionRate: project.completionRate,
        doneTasks: project.doneTasks,
        totalTasks: project.totalTasks,
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

    return {
      statusDistribution,
      projectPerformance,
      pendingTasks,
      overdueTasks,
    };
  }, [adminDashboard, taskComplianceReport]);

  const pendingTotalPages = useMemo(
    () => Math.max(1, Math.ceil((adminInsights?.pendingTasks.length ?? 0) / ALERTS_PAGE_SIZE)),
    [adminInsights?.pendingTasks.length],
  );

  const overdueTotalPages = useMemo(
    () => Math.max(1, Math.ceil((adminInsights?.overdueTasks.length ?? 0) / ALERTS_PAGE_SIZE)),
    [adminInsights?.overdueTasks.length],
  );

  const paginatedPendingTasks = useMemo(() => {
    const rows = adminInsights?.pendingTasks ?? [];
    const start = (pendingAlertsPage - 1) * ALERTS_PAGE_SIZE;
    return rows.slice(start, start + ALERTS_PAGE_SIZE);
  }, [adminInsights?.pendingTasks, pendingAlertsPage]);

  const paginatedOverdueTasks = useMemo(() => {
    const rows = adminInsights?.overdueTasks ?? [];
    const start = (overdueAlertsPage - 1) * ALERTS_PAGE_SIZE;
    return rows.slice(start, start + ALERTS_PAGE_SIZE);
  }, [adminInsights?.overdueTasks, overdueAlertsPage]);

  useEffect(() => {
    setPendingAlertsPage((current) => Math.min(current, pendingTotalPages));
  }, [pendingTotalPages]);

  useEffect(() => {
    setOverdueAlertsPage((current) => Math.min(current, overdueTotalPages));
  }, [overdueTotalPages]);

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
    setPendingAlertsPage(1);
    setOverdueAlertsPage(1);
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

      <div
        className={cn(
          "app-content",
          isAdmin && "h-[calc(100vh-5.4rem)] min-h-0 overflow-hidden gap-3 p-3 md:p-4",
        )}
      >
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
            <section className="relative z-30 rounded-xl border border-border/70 bg-card/95 p-4 shadow-[0_10px_28px_rgba(16,36,58,0.08)]">
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
                <SearchableSelect
                  value={projectIdFilter}
                  onChange={setProjectIdFilter}
                  options={projectFilterOptions}
                  placeholder="Buscar proyecto..."
                  searchPlaceholder="Buscar proyecto..."
                  emptyLabel="No hay proyectos para mostrar."
                  disabled={isLoadingFilters}
                />
                <SearchableSelect
                  value={employeeIdFilter}
                  onChange={setEmployeeIdFilter}
                  options={employeeFilterOptions}
                  placeholder="Buscar empleado..."
                  searchPlaceholder="Buscar empleado..."
                  emptyLabel="No hay empleados para mostrar."
                  disabled={isLoadingFilters}
                />
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
              riskTasks={adminInsights.overdueTasks.length}
            />

            <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[1.05fr_0.95fr_1.4fr]">
              <article className="app-panel app-panel-pad border-border/70 bg-card/95 min-h-0 overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Rendimiento por proyecto</h2>
                    <p className="text-sm text-muted-foreground">Top de iniciativas con mayor avance real.</p>
                  </div>
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Activity className="size-4.5" />
                  </span>
                </div>
                {adminInsights.projectPerformance.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros activos.</p>
                ) : (
                  <div className="mt-3 max-h-[calc(100%-3.5rem)] space-y-3 overflow-y-auto pr-1">
                    {adminInsights.projectPerformance.slice(0, 6).map((row) => (
                      <div key={row.projectId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate pr-3 font-semibold uppercase tracking-wide text-muted-foreground">{row.projectName}</span>
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

              <article className="app-panel app-panel-pad border-border/70 bg-card/95 min-h-0 overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Distribución por estado</h2>
                    <p className="text-sm text-muted-foreground">Vista de salud operativa actual.</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{adminDashboard.teamSummary.totalTasks} tareas</p>
                </div>
                <div className="mt-2">
                  <ChartContainer config={pieChartConfig} className="mx-auto h-[205px] w-full max-w-[250px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                      <Pie
                        data={adminInsights.statusDistribution}
                        dataKey="value"
                        nameKey="status"
                        innerRadius={48}
                        outerRadius={74}
                        stroke="var(--card)"
                        strokeWidth={4}
                      />
                    </PieChart>
                  </ChartContainer>
                  <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {adminInsights.statusDistribution.map((item) => (
                      <li key={item.status} className="flex items-center justify-between gap-2 text-xs">
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

              <article className="app-panel app-panel-pad border-border/70 bg-card/95 space-y-3 min-h-0 overflow-hidden">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Alertas operativas</h2>
                  <p className="text-sm text-muted-foreground">Pendientes y tareas vencidas/retrasadas.</p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/8 px-2 py-1 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Prioriza tareas retrasadas o vencidas
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Pendientes</span>
                    <span>{adminInsights.pendingTasks.length}</span>
                  </div>
                  <div className="max-h-[145px] overflow-auto rounded-lg border border-border/70">
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
                        paginatedPendingTasks.map((row) => (
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
                </div>
                {adminInsights.pendingTasks.length > 0 && (
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPendingAlertsPage((current) => Math.max(1, current - 1))}
                      disabled={pendingAlertsPage === 1}
                      className="app-btn-secondary h-8 px-2.5 disabled:opacity-60"
                    >
                      Anterior
                    </button>
                    <span className="text-muted-foreground">
                      Pendientes {pendingAlertsPage}/{pendingTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingAlertsPage((current) => Math.min(pendingTotalPages, current + 1))}
                      disabled={pendingAlertsPage >= pendingTotalPages}
                      className="app-btn-secondary h-8 px-2.5 disabled:opacity-60"
                    >
                      Siguiente
                    </button>
                  </div>
                )}

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Retrasadas / vencidas</span>
                    <span>{adminInsights.overdueTasks.length}</span>
                  </div>
                  <div className="max-h-[145px] overflow-auto rounded-lg border border-border/70">
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
                        paginatedOverdueTasks.map((row) => (
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
                </div>
                {adminInsights.overdueTasks.length > 0 && (
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setOverdueAlertsPage((current) => Math.max(1, current - 1))}
                      disabled={overdueAlertsPage === 1}
                      className="app-btn-secondary h-8 px-2.5 disabled:opacity-60"
                    >
                      Anterior
                    </button>
                    <span className="text-muted-foreground">
                      Vencidas {overdueAlertsPage}/{overdueTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOverdueAlertsPage((current) => Math.min(overdueTotalPages, current + 1))}
                      disabled={overdueAlertsPage >= overdueTotalPages}
                      className="app-btn-secondary h-8 px-2.5 disabled:opacity-60"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
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
