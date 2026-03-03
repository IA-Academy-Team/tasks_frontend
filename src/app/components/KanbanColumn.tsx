import { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Plus, Pencil } from 'lucide-react';
import { Column, Task, User } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  column: Column;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, targetColumnId: string, position: number) => void;
  onUpdateTitle: (columnId: string, newTitle: string) => void;
  participants: User[];
}

const ItemTypes = {
  TASK: 'task',
};

export function KanbanColumn({
  column,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onUpdateTitle,
  participants,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(column.title);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item: { id: string; columnId: string }) => {
      if (item.columnId !== column.id) {
        onMoveTask(item.id, column.id, column.tasks.length);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const handleSaveTitle = () => {
    if (title.trim()) {
      onUpdateTitle(column.id, title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div
      ref={drop}
      className={`bg-white rounded-lg w-80 flex-shrink-0 flex flex-col max-h-full border border-gray-200 transition-colors ${
        isOver ? 'ring-2 ring-blue-400 border-blue-400' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') {
                  setTitle(column.title);
                  setIsEditingTitle(false);
                }
              }}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 flex-1 group">
              <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
              >
                <Pencil className="size-3 text-gray-500" />
              </button>
            </div>
          )}
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {column.tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {column.tasks.map((task, index) => {
          const assignedUser = participants.find(p => p.id === task.assignedTo);
          return (
            <KanbanCard
              key={task.id}
              task={task}
              assignedUser={assignedUser}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              onMove={onMoveTask}
              index={index}
            />
          );
        })}
      </div>

      {/* Add Task Button */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={onAddTask}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Plus className="size-4" />
          Agregar tarea
        </button>
      </div>
    </div>
  );
}
