import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";

export type WorkloadItem = {
  employeeId: number;
  employeeName: string;
  activeTasks: number;
};

type WorkloadDistributionChartProps = {
  workload: WorkloadItem[];
  overloadThreshold: number;
};

const chartConfig = {
  activeTasks: {
    label: "Tareas activas",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function WorkloadDistributionChart({ workload, overloadThreshold }: WorkloadDistributionChartProps) {
  const overloaded = workload.filter((item) => item.activeTasks >= overloadThreshold);

  return (
    <section className="app-panel app-panel-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Distribución de carga</h2>
          <p className="text-sm text-muted-foreground">Tareas activas por empleado para balancear trabajo.</p>
        </div>
        <p className="text-xs text-muted-foreground">Umbral de sobrecarga: {overloadThreshold} tareas</p>
      </div>

      {workload.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros seleccionados.</p>
      ) : (
        <>
          <ChartContainer config={chartConfig} className="mt-4 h-[260px] w-full">
            <BarChart data={workload}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="employeeName"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={(value) => String(value).split(" ")[0] ?? String(value)}
              />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={(value, name) => `${name}: ${value}`} />}
              />
              <Bar dataKey="activeTasks" fill="var(--color-activeTasks)" radius={8} />
            </BarChart>
          </ChartContainer>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {overloaded.length === 0 ? (
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                Sin sobrecarga detectada
              </span>
            ) : (
              overloaded.map((item) => (
                <span
                  key={item.employeeId}
                  className="rounded-full bg-warning/12 px-3 py-1 text-xs font-medium text-warning"
                >
                  {item.employeeName}: {item.activeTasks} activas
                </span>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

