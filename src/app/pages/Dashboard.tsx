import { FolderKanban, CheckCircle2, Clock, Users } from 'lucide-react';
import { getProjects } from '../store';

export function Dashboard() {
  const projects = getProjects();

  const totalProjects = projects.length;
  const totalTasks = projects.reduce(
    (acc, p) => acc + (p.tasks?.length || 0),
    0
  );

  const pendingTasks = projects.reduce(
    (acc, p) =>
      acc + (p.tasks?.filter((t) => t.status !== 'produccion').length || 0),
    0
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resumen general de tus proyectos y tareas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Proyectos"
          value={totalProjects}
          icon={<FolderKanban className="size-6 text-blue-600" />}
        />
        <StatCard
          title="Tareas totales"
          value={totalTasks}
          icon={<CheckCircle2 className="size-6 text-green-600" />}
        />
        <StatCard
          title="Pendientes"
          value={pendingTasks}
          icon={<Clock className="size-6 text-yellow-600" />}
        />
        <StatCard
          title="Miembros"
          value="—"
          icon={<Users className="size-6 text-purple-600" />}
        />
      </div>

      {/* Recent Projects */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Proyectos recientes
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {projects.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 italic">
              No hay proyectos creados aún
            </p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{project.name}</p>
                  <p className="text-xs text-gray-500">
                    {project.tasks?.length || 0} tareas
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Components ---------- */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
      <div className="p-3 rounded-lg bg-gray-100">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}