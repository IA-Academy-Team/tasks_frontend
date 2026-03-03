import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plus, ArrowLeft } from 'lucide-react';
import { getProjectById, updateProject } from '../store';
import { Project, Task } from '../types';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskModal } from '../components/TaskModal';

export function ProjectBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (projectId) {
      const foundProject = getProjectById(projectId);
      if (foundProject) {
        setProject(foundProject);
      } else {
        navigate('/projects');
      }
    }
  }, [projectId, navigate]);

  if (!project) {
    return <div className="size-full flex items-center justify-center">Cargando...</div>;
  }

  const handleOpenModal = (columnId: string, task?: Task) => {
    setSelectedColumnId(columnId);
    setEditingTask(task || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedColumnId('');
    setEditingTask(null);
  };

  const handleSaveTask = (task: Omit<Task, 'id' | 'columnId'>) => {
    if (!project) return;

    const updatedProject = { ...project };

    if (editingTask) {
      // Edit existing task
      updatedProject.columns = updatedProject.columns.map(col => ({
        ...col,
        tasks: col.tasks.map(t => 
          t.id === editingTask.id 
            ? { ...t, ...task }
            : t
        ),
      }));
    } else {
      // Create new task
      const newTask: Task = {
        id: Date.now().toString(),
        ...task,
        columnId: selectedColumnId,
      };

      updatedProject.columns = updatedProject.columns.map(col =>
        col.id === selectedColumnId
          ? { ...col, tasks: [...col.tasks, newTask] }
          : col
      );
    }

    updateProject(project.id, updatedProject);
    setProject(updatedProject);
    handleCloseModal();
  };

  const handleDeleteTask = (taskId: string) => {
    if (!project) return;

    const updatedProject = { ...project };
    updatedProject.columns = updatedProject.columns.map(col => ({
      ...col,
      tasks: col.tasks.filter(t => t.id !== taskId),
    }));

    updateProject(project.id, updatedProject);
    setProject(updatedProject);
  };

  const handleMoveTask = (taskId: string, targetColumnId: string, position: number) => {
    if (!project) return;

    // Find the task
    let movedTask: Task | null = null;
    let sourceColumnId: string | null = null;

    for (const col of project.columns) {
      const task = col.tasks.find(t => t.id === taskId);
      if (task) {
        movedTask = { ...task, columnId: targetColumnId };
        sourceColumnId = col.id;
        break;
      }
    }

    if (!movedTask || !sourceColumnId) return;

    const updatedProject = { ...project };
    updatedProject.columns = updatedProject.columns.map(col => {
      if (col.id === sourceColumnId) {
        return {
          ...col,
          tasks: col.tasks.filter(t => t.id !== taskId),
        };
      } else if (col.id === targetColumnId) {
        const newTasks = [...col.tasks.filter(t => t.id !== taskId)];
        newTasks.splice(position, 0, movedTask);
        return {
          ...col,
          tasks: newTasks,
        };
      }
      return col;
    });

    updateProject(project.id, updatedProject);
    setProject(updatedProject);
  };

  const handleUpdateColumnTitle = (columnId: string, newTitle: string) => {
    if (!project) return;

    const updatedProject = { ...project };
    updatedProject.columns = updatedProject.columns.map(col =>
      col.id === columnId ? { ...col, title: newTitle } : col
    );

    updateProject(project.id, updatedProject);
    setProject(updatedProject);
  };

  // Get all participants (users from project and groups)
  const allParticipants = [
    ...project.users,
    ...project.groups.flatMap(g => g.members),
  ];

  // Remove duplicates
  const uniqueParticipants = Array.from(
    new Map(allParticipants.map(u => [u.id, u])).values()
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="size-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="size-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-500">
                {uniqueParticipants.length} participantes · {project.columns.reduce((acc, col) => acc + col.tasks.length, 0)} tareas
              </p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-4 h-full">
            {project.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onAddTask={() => handleOpenModal(column.id)}
                onEditTask={(task) => handleOpenModal(column.id, task)}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
                onUpdateTitle={handleUpdateColumnTitle}
                participants={uniqueParticipants}
              />
            ))}
          </div>
        </div>

        {/* Task Modal */}
        {isModalOpen && (
          <TaskModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveTask}
            participants={uniqueParticipants}
            task={editingTask}
          />
        )}
      </div>
    </DndProvider>
  );
}
