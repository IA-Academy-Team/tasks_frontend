import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { FolderKanban, Users, Trash2, Plus } from 'lucide-react';
import { getProjects, deleteProject } from '../store';
import { Project } from '../types';
import { CreateProjectModal } from '../components/CreateProjectModal';

export function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este proyecto?')) {
      deleteProject(projectId);
      setProjects(getProjects());
    }
  };

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setProjects(getProjects());
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header con botón Crear proyecto */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proyectos</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {projects.length === 0
              ? 'Crea tu primer proyecto para comenzar'
              : 'Selecciona un proyecto para ver su tablero'}
          </p>
        </div>
        <div className="relative group">
          <button
            type="button"
            onClick={openCreateModal}
            className="size-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            aria-label="Crear proyecto"
          >
            <Plus className="size-5" />
          </button>
          <span className="absolute right-0 top-full mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Crear proyecto
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto">
        {projects.length === 0 ? (
          <div className="flex items-center justify-center flex-1 min-h-[320px]">
            <div className="text-center">
              <FolderKanban className="size-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay proyectos</h3>
              <p className="text-gray-500 mb-4">Haz clic en el botón + para crear tu primer proyecto</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear Proyecto
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const totalUsers = project.users.length + 
              project.groups.reduce((acc, group) => acc + group.members.length, 0);
            const totalTasks = project.columns.reduce((acc, col) => acc + col.tasks.length, 0);

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="size-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  </div>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="size-4" />
                    <span>{totalUsers} participantes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="size-2 rounded-full bg-green-500"></span>
                    <span>{totalTasks} tareas</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-1">
                  {project.columns.map((col) => (
                    <div
                      key={col.id}
                      className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(col.tasks.length / (totalTasks || 1)) * 100}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal isOpen={isCreateModalOpen} onClose={closeCreateModal} />
    </div>
  );
}
