import { AlertTriangle, Clock3, Gauge, Users, ExternalLink } from "lucide-react";
import type { OverdueAlert } from "../../../modules/dashboard/api/dashboard.api";

type QuickFilterKey = "overdue" | "dueSoon" | "highDeviation" | "overloaded";

type CriticalAlertsProps = {
  overdueTasks: number;
  dueSoonTasks: number;
  highDeviationTasks: number;
  overloadedEmployees: number;
  alerts: OverdueAlert[];
  generatedAt: string;
  onApplyQuickFilter: (key: QuickFilterKey) => void;
  onOpenTask: (projectId: number, taskId: number) => void;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function DashboardAlerts({
  overdueTasks,
  dueSoonTasks,
  highDeviationTasks,
  overloadedEmployees,
  alerts,
  generatedAt,
  onApplyQuickFilter,
  onOpenTask,
}: CriticalAlertsProps) {
  const cards = [
    {
      key: "overdue" as const,
      title: "Tareas vencidas",
      value: overdueTasks,
      helper: "Requieren intervención inmediata",
      icon: AlertTriangle,
      className: "text-destructive bg-destructive/10",
    },
    {
      key: "dueSoon" as const,
      title: "Tareas en riesgo",
      value: dueSoonTasks,
      helper: "Vencen en los próximos 3 días",
      icon: Clock3,
      className: "text-warning bg-warning/10",
    },
    {
      key: "highDeviation" as const,
      title: "Desviación alta",
      value: highDeviationTasks,
      helper: "Desvío mayor o igual a 120 min",
      icon: Gauge,
      className: "text-warning bg-warning/10",
    },
    {
      key: "overloaded" as const,
      title: "Empleados sobrecargados",
      value: overloadedEmployees,
      helper: "Carga activa por encima del umbral",
      icon: Users,
      className: "text-primary bg-primary/10",
    },
  ];

  return (
    <section className="app-panel app-panel-pad space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Alertas críticas</h2>
          <p className="text-xs text-muted-foreground">
            Visibles siempre para priorizar riesgos operativos.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Actualizado: {new Date(generatedAt).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((card) => (
          <article key={card.key} className="rounded-2xl border border-border bg-background px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                <p className="text-sm font-medium text-foreground">{card.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
              </div>
              <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${card.className}`}>
                <card.icon className="size-4" />
              </span>
            </div>
            <button
              type="button"
              onClick={() => onApplyQuickFilter(card.key)}
              className="mt-3 app-action-link text-xs"
            >
              Ver tareas relacionadas
            </button>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-background">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Alertas activas</p>
        </div>
        {alerts.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No hay alertas activas con los filtros actuales.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {alerts.slice(0, 5).map((alert) => (
              <article key={alert.taskId} className="px-4 py-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {alert.projectName} · {alert.assigneeName ?? "Sin asignar"} · Vence {formatDate(alert.dueDate)}
                  </p>
                  <p className={`mt-1 text-xs font-medium ${alert.reason === "DATE_OVERDUE" ? "text-destructive" : "text-warning"}`}>
                    {alert.reasonLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTask(alert.projectId, alert.taskId)}
                  className="app-action-link inline-flex items-center gap-1 text-xs"
                >
                  Ver tarea
                  <ExternalLink className="size-3.5" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

