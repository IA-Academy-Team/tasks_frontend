import { Outlet, useNavigate, useLocation } from 'react-router';
import { FolderKanban, Users, LayoutDashboard, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProjects } from '../store';
import { Project } from '../types';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [projects, setProjects] = useState<Project[]>([]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    setProjects(getProjects());
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isProjectsActive = location.pathname === '/projects' || location.pathname.startsWith('/projects/');

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <p className="text-xs text-gray-500">Gestión de proyectos</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Dashboard */}
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive('/')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </button>

          {/* Proyectos - abre la vista directamente */}
          <button
            onClick={() => navigate('/projects')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isProjectsActive
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FolderKanban className="size-4" />
            <span className="flex-1 text-left">Proyectos</span>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {projects.length}
            </span>
          </button>

          {/* Miembros - solo admin */}
          {isAdmin && (
            <button
              onClick={() => navigate('/members')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive('/members')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="size-4" />
              Miembros
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}