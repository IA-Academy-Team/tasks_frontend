import { Outlet, useNavigate, useLocation } from "react-router";
import {
  FolderKanban,
  Users,
  LayoutDashboard,
  LogOut,
  UserCircle2,
  Building2,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDefaultRouteForRole } from "../../modules/auth/lib/auth-routing";
import { canAccessResource } from "../../modules/auth/lib/access-policy";

type NavItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  isVisible: boolean;
  isActive: boolean;
};

const baseNavButtonClass =
  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";

const getNavButtonClass = (isActive: boolean) =>
  `${baseNavButtonClass} ${
    isActive
      ? "bg-sidebar-accent text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
      : "text-sidebar-foreground/88 hover:bg-sidebar-accent/80"
  }`;

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const canManageAreas = user ? canAccessResource(user.role, "areas") : false;
  const canManageEmployees = user ? canAccessResource(user.role, "employees") : false;
  const dashboardPath = user ? getDefaultRouteForRole(user.role) : "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;
  const isProjectsActive = location.pathname === "/projects" || location.pathname.startsWith("/projects/");
  const isDashboardActive = location.pathname === dashboardPath;
  const isProfileActive = isActive("/profile");
  const isAreasActive = isActive("/areas");
  const isEmployeesActive = isActive("/employees");
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navigateTo = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      path: dashboardPath,
      icon: LayoutDashboard,
      isVisible: true,
      isActive: isDashboardActive,
    },
    {
      key: "projects",
      label: "Proyectos",
      path: "/projects",
      icon: FolderKanban,
      isVisible: true,
      isActive: isProjectsActive,
    },
    {
      key: "profile",
      label: "Mi perfil",
      path: "/profile",
      icon: UserCircle2,
      isVisible: true,
      isActive: isProfileActive,
    },
    {
      key: "areas",
      label: "Areas",
      path: "/areas",
      icon: Building2,
      isVisible: canManageAreas,
      isActive: isAreasActive,
    },
    {
      key: "employees",
      label: "Empleados",
      path: "/employees",
      icon: Users,
      isVisible: canManageEmployees,
      isActive: isEmployeesActive,
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.isVisible);

  const renderNav = () => (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => navigateTo(item.path)}
            className={getNavButtonClass(item.isActive)}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-72 shrink-0 border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground flex-col shadow-2xl">
        <div className="p-5 border-b border-sidebar-border/80">
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        </div>

        {renderNav()}

        <div className="p-3 border-t border-sidebar-border/80">
          <button
            onClick={() => {
              void handleLogout();
            }}
            className={`${baseNavButtonClass} text-sidebar-foreground/88 hover:bg-sidebar-accent/80`}
          >
            <LogOut className="size-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/45" onClick={closeMobileMenu}>
          <aside
            className="h-full w-72 border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground shadow-2xl p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-sidebar-border/80">
              <div>
                <h1 className="text-lg font-bold">Tasks</h1>
                <p className="text-xs text-sidebar-foreground/80">Gestión de proyectos</p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-sidebar-accent/80 text-sidebar-foreground"
                onClick={closeMobileMenu}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="pt-3">{renderNav()}</div>
            <div className="pt-4 mt-4 border-t border-sidebar-border/80">
              <button
                onClick={() => {
                  void handleLogout();
                }}
                className={`${baseNavButtonClass} text-sidebar-foreground/88 hover:bg-sidebar-accent/80`}
              >
                <LogOut className="size-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0 overflow-auto">
        <header className="md:hidden flex items-center justify-between border-b border-border/70 px-4 py-3 bg-card/95 backdrop-blur-sm">
          <button
            type="button"
            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-semibold tracking-tight text-foreground">TaskApp</p>
          <button
            type="button"
            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
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
