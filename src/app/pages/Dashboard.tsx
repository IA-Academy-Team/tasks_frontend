import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Area, AreaChart, CartesianGrid, Line, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

const parseDateForUi = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }

  return new Date(value);
};

const formatDate = (value: string) =>
  parseDateForUi(value).toLocaleDateString("es-ES", {
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
  const due = parseDateForUi(dueDate);
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
    ringClassName: "border-destructive/45 bg-destructive/12",
    dotClassName: "bg-destructive",
    labelClassName: "text-destructive",
    label: "Alta",
  },
  warning: {
    ringClassName: "border-warning/45 bg-warning/14",
    dotClassName: "bg-warning",
    labelClassName: "text-warning",
    label: "Media",
  },
  normal: {
    ringClassName: "border-primary/45 bg-primary/14",
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

const complianceTrendChartConfig = {
  compliance: {
    label: "Cumplimiento",
    theme: {
      light: "var(--primary)",
      dark: "var(--primary)",
    },
  },
  target: {
    label: "Meta",
    theme: {
      light: "var(--warning)",
      dark: "var(--warning)",
    },
  },
} satisfies ChartConfig;

const ALERTS_PAGE_SIZE = 3;
const COMPLIANCE_AXIS_TICKS = [0, 20, 40, 60, 80, 100];

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
            "app-control inline-flex h-10 w-full items-center justify-between gap-2 bg-card/95",
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
        className="z-[120] w-[var(--radix-popover-trigger-width)] border-border/90 bg-card/98 p-0"
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
      (a, b) => parseDateForUi(a.dueDate).getTime() - parseDateForUi(b.dueDate).getTime(),
    );
    const nextToExpire = orderedUpcoming.slice(0, 4).map((task) => ({
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
    const weeklyEndDay = new Date(currentDay);
    weeklyEndDay.setDate(currentDay.getDate() + 6);
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
    const weeklyTotal = weeklyDistribution.reduce((sum, item) => sum + item.value, 0);
    const overdueOrOutOfRangeCount = orderedUpcoming.filter((task) => {
      const due = parseDateForUi(task.dueDate);
      return due < currentDay || due > weeklyEndDay;
    }).length;
    const maxWeeklyValue = Math.max(...weeklyDistribution.map((item) => item.value), 1);

    const criticalTasks = nextToExpire.filter((task) => task.urgency === "critical").length;
    const warningTasks = nextToExpire.filter((task) => task.urgency === "warning").length;

    return {
      nextToExpire,
      inProgressTask,
      pausedTasks,
      criticalTasks,
      warningTasks,
      hasWeeklyActivity: weeklyTotal > 0,
      overdueOrOutOfRangeCount,
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
    limit: 500,
  }), [adminQuery, complianceFilter]);

  const adminInsights: AdminInsights | null = useMemo(() => {
    if (!adminDashboard || !taskComplianceReport) {
      return null;
    }

    const complianceRows = Array.isArray(taskComplianceReport.rows) ? taskComplianceReport.rows : [];
    const projectProductivity = Array.isArray(adminDashboard.projectProductivity) ? adminDashboard.projectProductivity : [];

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
      .sort((a, b) => parseDateForUi(a.dueDate).getTime() - parseDateForUi(b.dueDate).getTime());

    const overdueTasks = complianceRows
      .filter((row) => !isDoneStatus(row.status) && (row.isDateOverdue || row.isEstimateDelayed === true))
      .map((row) => ({
        taskId: row.taskId,
        title: row.title,
        projectName: row.projectName,
        assigneeName: row.assigneeName,
        dueDate: row.dueDate,
        reason: row.isDateOverdue ? "Vencida por fecha" : "Retrasada por estimado",
      }))
      .sort((a, b) => parseDateForUi(a.dueDate).getTime() - parseDateForUi(b.dueDate).getTime());

    const statusDistribution = [
      {
        status: "Asignada",
        value: complianceRows.filter((row) => (
          row.status.trim().toLowerCase() === "asignada"
          && !row.isDateOverdue
          && row.isEstimateDelayed !== true
        )).length,
        fill: "var(--pie-status-assigned)",
      },
      {
        status: "En proceso",
        value: complianceRows.filter((row) => (
          row.status.trim().toLowerCase() === "en proceso"
          && !row.isDateOverdue
          && row.isEstimateDelayed !== true
        )).length,
        fill: "var(--pie-status-in-progress)",
      },
      {
        status: "Terminada",
        value: complianceRows.filter((row) => isDoneStatus(row.status)).length,
        fill: "var(--pie-status-done)",
      },
      {
        status: "Retrasada/Vencida",
        value: overdueTasks.length,
        fill: "var(--pie-status-overdue)",
      },
    ];

    return {
      statusDistribution,
      projectPerformance,
      pendingTasks,
      overdueTasks,
    };
  }, [adminDashboard, taskComplianceReport]);

  const complianceTrendData = useMemo(() => {
    const rows = taskComplianceReport?.rows ?? [];
    const parsedRows: Array<{ dateKey: string; isOnTime: boolean }> = [];
    let anchorDate: Date | null = null;

    for (const row of rows) {
      const dueDate = new Date(`${row.dueDate}T00:00:00`);
      if (Number.isNaN(dueDate.getTime())) continue;

      parsedRows.push({
        dateKey: row.dueDate.slice(0, 10),
        isOnTime: row.complianceStatus === "on_time",
      });
      if (!anchorDate || dueDate.getTime() > anchorDate.getTime()) {
        anchorDate = dueDate;
      }
    }

    const effectiveAnchor = anchorDate ?? new Date();
    const dailyBuckets = new Map<string, { total: number; onTime: number }>();

    for (const entry of parsedRows) {
      const bucket = dailyBuckets.get(entry.dateKey) ?? { total: 0, onTime: 0 };
      bucket.total += 1;
      if (entry.isOnTime) {
        bucket.onTime += 1;
      }
      dailyBuckets.set(entry.dateKey, bucket);
    }

    const lastSevenWorkdays: Date[] = [];
    const cursor = new Date(effectiveAnchor.getFullYear(), effectiveAnchor.getMonth(), effectiveAnchor.getDate());

    while (lastSevenWorkdays.length < 7) {
      if (cursor.getDay() !== 0) {
        lastSevenWorkdays.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() - 1);
    }

    return lastSevenWorkdays.reverse().map((day) => {
      const dateKey = toDateKey(day);
      const bucket = dailyBuckets.get(dateKey) ?? { total: 0, onTime: 0 };
      const compliance = bucket.total > 0 ? Math.round((bucket.onTime / bucket.total) * 100) : 0;
      const weekdayLabel = day
        .toLocaleDateString("es-ES", { weekday: "short" })
        .replace(".", "")
        .slice(0, 3)
        .toUpperCase();

      return {
        key: dateKey,
        label: `${weekdayLabel} ${String(day.getDate()).padStart(2, "0")}`,
        compliance,
        total: bucket.total,
      };
    });
  }, [taskComplianceReport]);

  const latestComplianceValue = useMemo(() => {
    for (let index = complianceTrendData.length - 1; index >= 0; index -= 1) {
      const point = complianceTrendData[index];
      if (point && point.total > 0) {
        return point.compliance;
      }
    }
    return 0;
  }, [complianceTrendData]);

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

  const openEmployeeTaskDetail = (task: {
    id: number;
    projectId: number;
  }) => {
    if (task.projectId > 0) {
      navigate(`/projects/${task.projectId}?taskId=${task.id}`);
      return;
    }

    navigate(`/tasks/standalone?taskId=${task.id}`);
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
          <section className="app-panel px-4 py-3 text-sm text-destructive">
            {error}
          </section>
        )}

        {isEmployee && employeeDashboard && employeeInsights && (
          <>
            <section className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Bienvenido, {user.name.split(" ")[0]}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Resumen de productividad para hoy.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/tasks/standalone?create=1")}
                className="app-btn-primary h-11 px-5 font-bold"
              >
                <Plus className="size-4" />
                Tarea
              </button>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="app-panel p-5">
                <div className="mb-4 flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/14 text-primary">
                    <FolderKanban className="size-5" />
                  </span>
                  <span className="rounded-md bg-success/14 px-2 py-1 text-[10px] font-bold text-success">+ hoy</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Tareas activas</p>
                <p className="mt-1 text-3xl font-black text-foreground">
                  {employeeDashboard.summary.assignedTasks + employeeDashboard.summary.inProgressTasks}
                </p>
              </article>

              <article className="app-panel p-5">
                <div className="mb-4 flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/14 text-primary">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <span className="rounded-md bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary">Semana actual</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Completadas</p>
                <p className="mt-1 text-3xl font-black text-foreground">{employeeDashboard.summary.doneTasks}</p>
              </article>

              <article className="app-panel p-5">
                <div className="mb-4 flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-destructive/14 text-destructive">
                    <CalendarClock className="size-5" />
                  </span>
                  <span className="rounded-md bg-destructive/14 px-2 py-1 text-[10px] font-bold text-destructive">Atención</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Próximas a vencer</p>
                <p className="mt-1 text-3xl font-black text-foreground">{employeeDashboard.summary.upcomingTasks}</p>
              </article>

              <article className="app-panel p-5">
                <div className="mb-4 flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/14 text-primary">
                    <Timer className="size-5" />
                  </span>
                  <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">Mes</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Horas registradas</p>
                <p className="mt-1 text-3xl font-black text-foreground">{formatMinutes(employeeDashboard.summary.activeTasksAccumulatedMinutes)}</p>
              </article>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="inline-flex items-center gap-2 text-xl font-bold text-foreground">
                    <AlertTriangle className="size-5 text-destructive" />
                    Próximas a vencer
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate("/tasks/standalone")}
                    className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
                  >
                    Ver tareas
                  </button>
                </div>
                <div className="app-panel overflow-hidden divide-y divide-border/85">
                  {employeeInsights.nextToExpire.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-muted-foreground">No hay tareas próximas a vencer.</p>
                  ) : (
                    employeeInsights.nextToExpire.map((task) => {
                      const urgencyStyle = employeeUrgencyStyles[task.urgency];
                      return (
                        <article
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openEmployeeTaskDetail(task)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openEmployeeTaskDetail(task);
                            }
                          }}
                          className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/35"
                        >
                          <span className={cn("inline-flex size-10 items-center justify-center rounded-full border-2", urgencyStyle.ringClassName)}>
                            <span className={cn("size-2.5 rounded-full", urgencyStyle.dotClassName)} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground">{task.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{task.projectName}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-black", urgencyStyle.labelClassName)}>{urgencyStyle.label}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{formatDate(task.dueDate)}</p>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="inline-flex items-center gap-2 text-xl font-bold text-foreground">
                  <PlayCircle className="size-5 text-primary" />
                  Sesión activa
                </h3>
                {employeeInsights.inProgressTask ? (
                  <article
                    role="button"
                    tabIndex={0}
                    onClick={() => openEmployeeTaskDetail(employeeInsights.inProgressTask)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openEmployeeTaskDetail(employeeInsights.inProgressTask);
                      }
                    }}
                    className="relative overflow-hidden rounded-2xl border-2 border-primary/45 bg-primary/14 p-5 cursor-pointer transition-colors hover:bg-primary/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                      <span className="size-2 rounded-full bg-primary animate-pulse" />
                      En progreso
                    </span>
                    <h4 className="text-lg font-extrabold text-foreground">{employeeInsights.inProgressTask.title}</h4>
                    <p className="text-sm text-muted-foreground">{employeeInsights.inProgressTask.projectName}</p>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tiempo activo</p>
                        <p className="text-3xl font-black text-primary">
                          {formatMinutes(employeeInsights.inProgressTask.actualMinutes)}
                        </p>
                      </div>
                    </div>
                  </article>
                ) : (
                  <article className="rounded-2xl border border-dashed border-border/80 bg-card/75 px-5 py-8 text-center">
                    <p className="text-sm font-semibold text-muted-foreground">Sin sesión activa</p>
                    <p className="mt-1 text-xs text-muted-foreground">Inicia una tarea para empezar seguimiento.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="app-panel p-6">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Resumen de actividad</h3>
                  <p className="text-sm text-muted-foreground">Picos de actividad proyectada en los próximos 7 días.</p>
                </div>
                <div className="inline-flex gap-2">
                  <span className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">Días</span>
                  <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Semana</span>
                </div>
              </div>

              <div className="flex h-56 items-end justify-between gap-3 px-2">
                {employeeInsights.hasWeeklyActivity ? (
                  employeeInsights.weeklyDistribution.map((item) => (
                    <div key={item.key} className="group relative flex flex-1 items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-lg transition-all",
                          item.value > 0 ? "bg-primary hover:bg-primary-hover" : "bg-primary/20",
                        )}
                        style={{ height: `${Math.max(14, item.height)}%` }}
                        title={`${item.value} tareas`}
                      />
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-[10px] font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100">
                        {item.value} tareas
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-secondary/25 px-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {employeeInsights.overdueOrOutOfRangeCount > 0
                        ? `Sin tareas con fecha límite en los próximos 7 días. Hay ${employeeInsights.overdueOrOutOfRangeCount} tarea(s) activa(s) vencidas o fuera de rango semanal.`
                        : "Sin actividad semanal registrada para este usuario en los próximos 7 días."}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-between px-2">
                {employeeInsights.weeklyDistribution.map((item) => (
                  <span key={`${item.key}-label`} className="flex-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}

        {isAdmin && adminDashboard && taskComplianceReport && adminInsights && (
          <>
            <section className="relative z-30">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <DateRangeFilter
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateChange={(from, to) => {
                    setDateFrom(from);
                    setDateTo(to);
                  }}
                  triggerClassName="bg-card/95"
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
                  className="app-control h-10 bg-card/95"
                >
                  <option value="all">Cumplimiento: todos</option>
                  <option value="on_time">En tiempo</option>
                  <option value="estimate_delayed">Atraso estimado</option>
                  <option value="date_overdue">Atraso por fecha</option>
                </select>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="app-btn-secondary h-10 w-full"
                >
                  {isLoadingFilters ? "Cargando..." : "Limpiar filtros"}
                </button>
              </div>
            </section>

            <DashboardMetrics
              summary={adminDashboard.teamSummary}
              riskTasks={adminInsights.overdueTasks.length}
            />

            <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[0.8fr_0.9fr_1.65fr]">
              <div className="flex min-h-0 flex-col gap-3">
                <article className="app-panel app-panel-pad min-h-0 flex-1 overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Rendimiento por proyecto</h2>
                    </div>
                    <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/14 text-primary">
                      <Activity className="size-4.5" />
                    </span>
                  </div>
                  {adminInsights.projectPerformance.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros activos.</p>
                  ) : (
                    <div className="mt-3 max-h-[calc(100%-3.5rem)] space-y-3 overflow-y-auto pr-1">
                      {adminInsights.projectPerformance.slice().map((row) => (
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
              </div>

              <div className="flex min-h-0 flex-col gap-3">
                <article className="app-panel app-panel-pad shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Distribución por estado</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">{adminDashboard.teamSummary.totalTasks} tareas</p>
                  </div>
                  <div className="mt-2">
                    <ChartContainer config={pieChartConfig} className="mx-auto h-[190px] w-full max-w-[235px]">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                        <Pie
                          data={adminInsights.statusDistribution}
                          dataKey="value"
                          nameKey="status"
                          innerRadius={45}
                          outerRadius={70}
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

                <article className="app-panel app-panel-pad min-h-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Tendencia de cumplimiento</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-success">{latestComplianceValue}%</p>
                    </div>
                  </div>
                  <div className="mt-2 h-[calc(100%-3.25rem)] min-h-[150px]">
                    <ChartContainer config={complianceTrendChartConfig} className="h-full w-full">
                      <AreaChart data={complianceTrendData} margin={{ top: 8, right: 8, left: 8, bottom: 2 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={8}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={COMPLIANCE_AXIS_TICKS}
                          interval={0}
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          width={48}
                          tickFormatter={(value) => `${Math.round(Number(value))}%`}
                        />
                        <ChartTooltip
                          content={(
                            <ChartTooltipContent
                              formatter={(value, name) => [
                                `${Number(value).toFixed(0)}%`,
                                name === "target" ? "Meta" : "Cumplimiento",
                              ]}
                            />
                          )}
                        />
                        <Line
                          type="monotone"
                          dataKey="target"
                          stroke="var(--color-target)"
                          strokeWidth={1.8}
                          strokeDasharray="6 4"
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="compliance"
                          stroke="var(--color-compliance)"
                          fill="var(--color-compliance)"
                          fillOpacity={0.14}
                          strokeWidth={2.5}
                          dot={{ r: 2.2, strokeWidth: 0 }}
                          activeDot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </article>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <section className="app-panel min-h-0 flex flex-1 flex-col overflow-hidden">
                  <header className="flex items-center justify-between border-b border-border/85 bg-secondary/62 px-3 py-2.5">
                    <h2 className="text-base font-semibold text-warning">Tareas pendientes</h2>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {adminInsights.pendingTasks.length}
                    </span>
                  </header>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <table className="app-table">
                      <thead className="app-table-head">
                        <tr>
                          <th className="app-th">Tarea</th>
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
                            <tr
                              key={row.taskId}
                              className="app-row cursor-pointer hover:bg-secondary/55"
                              onClick={() => navigate(`/tasks/standalone?taskId=${row.taskId}`)}
                            >
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
                  {adminInsights.pendingTasks.length > 0 && (
                    <footer className="flex items-center justify-start gap-2 border-t border-border/85 px-3 py-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setPendingAlertsPage((current) => Math.max(1, current - 1))}
                        disabled={pendingAlertsPage === 1}
                        className="app-btn-secondary size-8 p-0 disabled:opacity-60"
                        aria-label="Página anterior pendientes"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="text-muted-foreground">
                        {pendingAlertsPage}/{pendingTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingAlertsPage((current) => Math.min(pendingTotalPages, current + 1))}
                        disabled={pendingAlertsPage >= pendingTotalPages}
                        className="app-btn-secondary size-8 p-0 disabled:opacity-60"
                        aria-label="Página siguiente pendientes"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </footer>
                  )}
                </section>

                <section className="app-panel min-h-0 flex flex-1 flex-col overflow-hidden">
                  <header className="flex items-center justify-between border-b border-border/85 bg-secondary/62 px-3 py-2.5">
                    <h2 className="text-base font-semibold text-destructive">Tareas retrasadas/vencidas</h2>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {adminInsights.overdueTasks.length}
                    </span>
                  </header>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <table className="app-table">
                      <thead className="app-table-head">
                        <tr>
                          <th className="app-th">Tarea</th>
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
                            <tr
                              key={row.taskId}
                              className="app-row cursor-pointer hover:bg-secondary/55"
                              onClick={() => navigate(`/tasks/standalone?taskId=${row.taskId}`)}
                            >
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
                  {adminInsights.overdueTasks.length > 0 && (
                    <footer className="flex items-center justify-start gap-2 border-t border-border/85 px-3 py-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setOverdueAlertsPage((current) => Math.max(1, current - 1))}
                        disabled={overdueAlertsPage === 1}
                        className="app-btn-secondary size-8 p-0 disabled:opacity-60"
                        aria-label="Página anterior vencidas"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="text-muted-foreground">
                        {overdueAlertsPage}/{overdueTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOverdueAlertsPage((current) => Math.min(overdueTotalPages, current + 1))}
                        disabled={overdueAlertsPage >= overdueTotalPages}
                        className="app-btn-secondary size-8 p-0 disabled:opacity-60"
                        aria-label="Página siguiente vencidas"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </footer>
                  )}
                </section>
              </div>
            </section>
          </>
        )}

        {isAdmin && !error && (!adminDashboard || !taskComplianceReport || !adminInsights) && (
          <section className="app-panel px-4 py-5 text-sm text-muted-foreground">
            No fue posible procesar la informacion del dashboard con los datos actuales.
          </section>
        )}
      </div>
    </div>
  );
}
