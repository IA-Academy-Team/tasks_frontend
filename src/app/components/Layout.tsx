import { Outlet, useNavigate, useLocation } from 'react-router';
import { FolderKanban, Users, LayoutDashboard, LogOut, UserCircle2, Building2, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../../modules/auth/lib/auth-routing';
import { canAccessResource } from '../../modules/auth/lib/access-policy';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const canManageAreas = user ? canAccessResource(user.role, 'areas') : false;
  const canManageEmployees = user ? canAccessResource(user.role, 'employees') : false;
  const dashboardPath = user ? getDefaultRouteForRole(user.role) : '/';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;
  const isProjectsActive = location.pathname === '/projects' || location.pathname.startsWith('/projects/');
  const isDashboardActive = location.pathname === dashboardPath;
  const isProfileActive = isActive('/profile');
  const isAreasActive = isActive('/areas');
  const isEmployeesActive = isActive('/employees');
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navigateTo = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col shadow-lg">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">Tasks</h1>
          <p className="text-xs text-white/80 mt-0.5">Gestión de proyectos</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => navigateTo(dashboardPath)}
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
            onClick={() => navigateTo('/projects')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isProjectsActive
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
            }`}
          >
            <FolderKanban className="size-4 shrink-0" />
            <span className="flex-1 text-left">Proyectos</span>
          </button>

          <button
            onClick={() => navigateTo('/profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isProfileActive
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
            }`}
          >
            <UserCircle2 className="size-4 shrink-0" />
            Mi perfil
          </button>

          {canManageAreas && (
            <button
              onClick={() => navigateTo('/areas')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isAreasActive
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
              }`}
            >
              <Building2 className="size-4 shrink-0" />
              Areas
            </button>
          )}

          {canManageEmployees && (
            <button
              onClick={() => navigateTo('/employees')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isEmployeesActive
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
              }`}
            >
              <Users className="size-4 shrink-0" />
              Empleados
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

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/45" onClick={closeMobileMenu}>
          <aside
            className="h-full w-72 bg-sidebar border-r border-sidebar-border shadow-xl p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-sidebar-border">
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">Tasks</h1>
                <p className="text-xs text-white/80">Gestión de proyectos</p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground"
                onClick={closeMobileMenu}
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="pt-3 space-y-1">
              <button
                onClick={() => navigateTo(dashboardPath)}
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
                onClick={() => navigateTo('/projects')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isProjectsActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
                }`}
              >
                <FolderKanban className="size-4 shrink-0" />
                Proyectos
              </button>
              <button
                onClick={() => navigateTo('/profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isProfileActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
                }`}
              >
                <UserCircle2 className="size-4 shrink-0" />
                Mi perfil
              </button>
              {canManageAreas && (
                <button
                  onClick={() => navigateTo('/areas')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isAreasActive
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
                  }`}
                >
                  <Building2 className="size-4 shrink-0" />
                  Areas
                </button>
              )}
              {canManageEmployees && (
                <button
                  onClick={() => navigateTo('/employees')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isEmployeesActive
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-sidebar-foreground/90 hover:bg-sidebar-accent'
                  }`}
                >
                  <Users className="size-4 shrink-0" />
                  Empleados
                </button>
              )}
            </nav>
            <div className="pt-4 mt-4 border-t border-sidebar-border">
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
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-auto">
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-card">
          <button
            type="button"
            className="p-2 rounded-lg border border-border hover:bg-secondary"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-medium text-foreground">TaskApp</p>
          <button
            type="button"
            className="p-2 rounded-lg border border-border hover:bg-secondary"
            onClick={() => {
              void handleLogout();
            }}
          >
            <LogOut className="size-5" />
          </button>
        </header>
        <div className="flex-1 flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
