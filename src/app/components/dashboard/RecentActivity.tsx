import { ExternalLink } from "lucide-react";
import type { TaskComplianceReportRow } from "../../../modules/dashboard/api/dashboard.api";

type RecentActivityProps = {
  rows: TaskComplianceReportRow[];
  onOpenTask: (projectId: number, taskId: number) => void;
  onOpenProjects: () => void;
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

const formatMinutes = (minutes: number) => {
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

const complianceClass = (status: "on_time" | "estimate_delayed" | "date_overdue") => {
  if (status === "on_time") return "text-success";
  if (status === "estimate_delayed") return "text-warning";
  return "text-destructive";
};

export function RecentActivity({ rows, onOpenTask, onOpenProjects }: RecentActivityProps) {
  return (
    <section className="app-panel app-panel-pad">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Actividad reciente</h2>
          <p className="text-sm text-muted-foreground">Últimos 5 movimientos de tareas según filtros activos.</p>
        </div>
        <button
          type="button"
          onClick={onOpenProjects}
          className="app-action-link inline-flex items-center gap-1 text-sm"
        >
          Ver reporte completo
          <ExternalLink className="size-3.5" />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No hay actividad para los filtros seleccionados.</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {rows.slice(0, 5).map((row) => (
            <article key={row.taskId} className="rounded-xl border border-border bg-background px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.projectName} · {row.assigneeName ?? "Sin asignar"} · {row.status}
                  </p>
                </div>
                <span className={`text-xs font-medium ${complianceClass(row.complianceStatus)}`}>
                  {row.complianceLabel}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Vence: {formatDate(row.dueDate)}</span>
                <span>Estimado: {row.estimatedMinutes === null ? "-" : formatMinutes(row.estimatedMinutes)}</span>
                <span>Real: {formatMinutes(row.actualMinutes)}</span>
                <span>Desvío: {row.deviationMinutes === null ? "-" : `${row.deviationMinutes > 0 ? "+" : ""}${row.deviationMinutes} min`}</span>
                {row.completedAt && <span>Cierre: {formatDateTime(row.completedAt)}</span>}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => onOpenTask(row.projectId, row.taskId)}
                  className="app-action-link inline-flex items-center gap-1 text-xs"
                >
                  Ver tarea
                  <ExternalLink className="size-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

