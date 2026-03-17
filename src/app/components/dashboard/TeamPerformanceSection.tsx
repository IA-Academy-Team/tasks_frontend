import { ArrowUpRight } from "lucide-react";

export type TeamPerformanceItem = {
  employeeId: number;
  employeeName: string;
  assignedTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  totalTasks: number;
  completionRate: number;
  efficiencyRate: number;
};

type TeamPerformanceSectionProps = {
  team: TeamPerformanceItem[];
  onOpenEmployees: () => void;
};

export function TeamPerformanceSection({ team, onOpenEmployees }: TeamPerformanceSectionProps) {
  const topProductivity = [...team]
    .sort((a, b) => b.completionRate - a.completionRate || b.doneTasks - a.doneTasks)
    .slice(0, 5);

  const topEfficiency = [...team]
    .sort((a, b) => b.efficiencyRate - a.efficiencyRate || b.doneTasks - a.doneTasks)
    .slice(0, 5);

  return (
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <article className="app-panel app-panel-pad">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Rendimiento por cumplimiento</h2>
            <p className="text-sm text-muted-foreground">Ranking por tareas completadas a tiempo.</p>
          </div>
          <button type="button" onClick={onOpenEmployees} className="app-action-link text-sm inline-flex items-center gap-1">
            Ver equipo
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>

        {topProductivity.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros activos.</p>
        ) : (
          <ol className="mt-4 space-y-2.5">
            {topProductivity.map((item, index) => (
              <li key={item.employeeId} className="rounded-xl border border-border bg-background px-3.5 py-3 flex items-center gap-3">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.employeeName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.doneTasks} completadas · {item.totalTasks} totales
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">{item.completionRate}%</span>
              </li>
            ))}
          </ol>
        )}
      </article>

      <article className="app-panel app-panel-pad">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Rendimiento por eficiencia</h2>
            <p className="text-sm text-muted-foreground">Relación entre tiempo estimado y tiempo real.</p>
          </div>
        </div>

        {topEfficiency.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros activos.</p>
        ) : (
          <ol className="mt-4 space-y-2.5">
            {topEfficiency.map((item, index) => (
              <li key={`eff-${item.employeeId}`} className="rounded-xl border border-border bg-background px-3.5 py-3 flex items-center gap-3">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.employeeName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.assignedTasks + item.inProgressTasks} activas · {item.doneTasks} completadas
                  </p>
                </div>
                <span className={`text-sm font-semibold ${item.efficiencyRate >= 100 ? "text-success" : item.efficiencyRate >= 75 ? "text-warning" : "text-destructive"}`}>
                  {item.efficiencyRate}%
                </span>
              </li>
            ))}
          </ol>
        )}
      </article>
    </section>
  );
}

