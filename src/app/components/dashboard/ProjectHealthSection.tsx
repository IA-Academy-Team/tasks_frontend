import { ExternalLink } from "lucide-react";

export type ProjectHealthItem = {
  projectId: number;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  estimatedMinutes: number;
  actualMinutes: number;
};

type ProjectHealthSectionProps = {
  projects: ProjectHealthItem[];
  onOpenProject: (projectId: number) => void;
};

const formatMinutes = (minutes: number) => {
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

export function ProjectHealthSection({ projects, onOpenProject }: ProjectHealthSectionProps) {
  return (
    <section className="app-panel app-panel-pad">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Salud de proyectos</h2>
          <p className="text-sm text-muted-foreground">Progreso y riesgos por proyecto.</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sin datos para los filtros seleccionados.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {projects.slice(0, 6).map((project) => (
            <article key={project.projectId} className="rounded-2xl border border-border bg-background px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{project.projectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.completedTasks}/{project.totalTasks} completadas · {project.overdueTasks} atrasadas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenProject(project.projectId)}
                  className="app-action-link inline-flex items-center gap-1 text-xs"
                >
                  Ver proyecto
                  <ExternalLink className="size-3.5" />
                </button>
              </div>

              <div className="mt-2 h-2 rounded-full bg-secondary/80 overflow-hidden">
                <div
                  className={`h-full rounded-full ${project.completionRate >= 70 ? "bg-success" : project.completionRate >= 40 ? "bg-warning" : "bg-destructive"}`}
                  style={{ width: `${Math.max(0, Math.min(100, project.completionRate))}%` }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Progreso: {project.completionRate}%</span>
                <span>Estimado: {formatMinutes(project.estimatedMinutes)}</span>
                <span>Real: {formatMinutes(project.actualMinutes)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

