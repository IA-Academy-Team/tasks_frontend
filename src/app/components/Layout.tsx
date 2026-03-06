import { Outlet, useNavigate, useLocation } from 'react-router';
import { FolderKanban, Users, LayoutDashboard, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProjects } from '../store';
import { Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../../modules/auth/lib/auth-routing';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [projects, setProjects] = useState<Project[]>([]);
  const dashboardPath = user ? getDefaultRouteForRole(user.role) : '/';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    setProjects(getProjects());
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isProjectsActive = location.pathname === '/projects' || location.pathname.startsWith('/projects/');
  const isDashboardActive = location.pathname === dashboardPath;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — azul sólido, identidad del proyecto */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shadow-lg">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">Tasks</h1>
          <p className="text-xs text-white/80 mt-0.5">Gestión de proyectos</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => navigate(dashboardPath)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDashboardActive
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
            }`}
          >
            <LayoutDashboard className="size-4 shrink-0" />
            Dashboard
          </button>

          <button
            onClick={() => navigate('/projects')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isProjectsActive
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
            }`}
          >
            <FolderKanban className="size-4 shrink-0" />
            <span className="flex-1 text-left">Proyectos</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-sidebar-foreground font-medium">
              {projects.length}
            </span>
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate('/members')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive('/members')
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
              }`}
            >
              <Users className="size-4 shrink-0" />
              Miembros
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => {
              void handleLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent font-medium transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content - flex para que el contenido ocupe todo el alto */}
      <main className="flex-1 flex flex-col min-h-0 overflow-auto">
        <div className="flex-1 flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
