import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, FolderKanban, Gauge, Layers3 } from "lucide-react";
import type { DashboardAggregate } from "../../../modules/dashboard/api/dashboard.api";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";

type DashboardMetricsProps = {
  summary: DashboardAggregate;
  efficiencyRate: number;
  statusDistribution: {
    status: string;
    value: number;
    fill: string;
  }[];
};

const formatMinutes = (minutes: number) => {
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

const pieChartConfig = {
  Asignada: { label: "Asignadas", color: "var(--chart-1)" },
  "En proceso": { label: "En proceso", color: "var(--chart-4)" },
  Terminada: { label: "Terminadas", color: "var(--chart-2)" },
} satisfies ChartConfig;

const comparisonChartConfig = {
  estimated: { label: "Estimado", color: "var(--chart-4)" },
  actual: { label: "Real", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function DashboardMetrics({
  summary,
  efficiencyRate,
  statusDistribution,
}: DashboardMetricsProps) {
  const activeTasks = summary.assignedTasks + summary.inProgressTasks;

  const comparisonData = [
    {
      key: "Tiempo",
      estimated: Math.max(0, Math.round(summary.totalEstimatedMinutes / 60)),
      actual: Math.max(0, Math.round(summary.totalActualMinutes / 60)),
    },
  ];

  return (
    <section className="space-y-4">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <article className="app-panel px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{activeTasks}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tareas activas</p>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderKanban className="size-5" />
            </span>
          </div>
        </article>

        <article className="app-panel px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{summary.doneTasks}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tareas completadas</p>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </span>
          </div>
        </article>

        <article className="app-panel px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{summary.completionRate}%</p>
              <p className="mt-1 text-sm text-muted-foreground">Cumplimiento global</p>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers3 className="size-5" />
            </span>
          </div>
        </article>

        <article className="app-panel px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{efficiencyRate}%</p>
              <p className="mt-1 text-sm text-muted-foreground">Eficiencia del equipo</p>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Gauge className="size-5" />
            </span>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="app-panel app-panel-pad">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Distribución por estado</h2>
              <p className="text-sm text-muted-foreground">Asignadas, en proceso y terminadas.</p>
            </div>
            <p className="text-xs text-muted-foreground">{summary.totalTasks} tareas</p>
          </div>
          <ChartContainer config={pieChartConfig} className="mt-4 h-[220px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
              <Pie
                data={statusDistribution}
                dataKey="value"
                nameKey="status"
                innerRadius={52}
                outerRadius={82}
                strokeWidth={2}
              />
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        </article>

        <article className="app-panel app-panel-pad">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Estimado vs real</h2>
              <p className="text-sm text-muted-foreground">Comparación agregada de horas del equipo.</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatMinutes(summary.totalEstimatedMinutes)} / {formatMinutes(summary.totalActualMinutes)}
            </p>
          </div>
          <ChartContainer config={comparisonChartConfig} className="mt-4 h-[220px] w-full">
            <BarChart data={comparisonData} barCategoryGap={28}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="key" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value}h`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => `${name}: ${value}h`} />} />
              <Bar dataKey="estimated" name="Estimado" fill="var(--color-estimated)" radius={8} />
              <Bar dataKey="actual" name="Real" fill="var(--color-actual)" radius={8} />
            </BarChart>
          </ChartContainer>
        </article>
      </section>
    </section>
  );
}
