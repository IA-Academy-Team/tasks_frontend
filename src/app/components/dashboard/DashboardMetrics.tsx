import { CheckCircle2, FolderKanban, Gauge, Layers3 } from "lucide-react";
import type { DashboardAggregate } from "../../../modules/dashboard/api/dashboard.api";

type DashboardMetricsProps = {
  summary: DashboardAggregate;
  efficiencyRate: number;
};

export function DashboardMetrics({
  summary,
  efficiencyRate,
}: DashboardMetricsProps) {
  const activeTasks = summary.assignedTasks + summary.inProgressTasks;

  return (
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
  );
}
