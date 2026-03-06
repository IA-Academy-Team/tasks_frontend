import { Outlet, useNavigate, useLocation } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
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
  "group relative w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all";

const getNavButtonClass = (isActive: boolean, isCollapsed = false) =>
  `${baseNavButtonClass} ${
    isActive
      ? "bg-sidebar-accent text-sidebar-foreground ring-1 ring-sidebar-ring/45 shadow-[0_10px_24px_rgba(2,12,24,0.24)]"
      : "text-sidebar-foreground/78 hover:text-sidebar-foreground hover:bg-sidebar-accent/72"
  } ${isCollapsed ? "justify-center px-2.5" : ""}`;

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const canManageAreas = user ? canAccessResource(user.role, "areas") : false;
  const canManageEmployees = user ? canAccessResource(user.role, "employees") : false;
  const dashboardPath = user ? getDefaultRouteForRole(user.role) : "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const renderNav = (isCollapsed = false) => (
    <nav className="flex-1 overflow-y-hidden overflow-x-visible px-3 py-4 space-y-1.5">
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => navigateTo(item.path)}
            className={getNavButtonClass(item.isActive, isCollapsed)}
            aria-label={item.label}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon className="size-4 shrink-0" />
            {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
            {isCollapsed && (
              <span className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-sidebar-border bg-[#0b2438] px-2.5 py-1.5 text-xs text-sidebar-foreground opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 translate-x-1">
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      <aside
        className={`hidden md:flex h-screen relative shrink-0 border-r border-sidebar-border/80 bg-[linear-gradient(180deg,#0a2c47_0%,#0e3a5e_48%,#0f3453_100%)] text-sidebar-foreground flex-col shadow-[20px_0_36px_rgba(8,24,43,0.18)] transition-[width] duration-300 ease-in-out ${
          isSidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(130,235,224,0.18),transparent_34%)]" />
        <div
          className={`relative border-b border-sidebar-border/80 ${
            isSidebarCollapsed ? "px-0 py-3 flex items-center justify-center" : "px-5 py-6"
          }`}
        >
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            className={`z-20 inline-flex items-center justify-center transition-all ${
              isSidebarCollapsed
                ? "size-9 rounded-xl border border-white/18 bg-white/10 text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:border-white/28 hover:bg-white/18"
                : "absolute right-2 top-1/2 size-10 -translate-y-1/2 text-sidebar-foreground/86 hover:rounded-lg hover:border hover:border-white/24 hover:bg-white/14 hover:text-sidebar-foreground"
            }`}
            aria-label={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-6" />}
          </button>
          {!isSidebarCollapsed && <h1 className="pr-12 text-4xl font-bold tracking-tight leading-none">Tasks</h1>}
        </div>

        {renderNav(isSidebarCollapsed)}

        <div className="relative p-3 border-t border-sidebar-border/80 mt-auto">
          <button
            onClick={() => {
              void handleLogout();
            }}
            className={`${baseNavButtonClass} text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/72 ${
              isSidebarCollapsed ? "justify-center px-2.5" : ""
            }`}
            aria-label="Cerrar sesión"
            title={isSidebarCollapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="size-4 shrink-0" />
            {!isSidebarCollapsed && "Cerrar sesión"}
            {isSidebarCollapsed && (
              <span className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-sidebar-border bg-[#0b2438] px-2.5 py-1.5 text-xs text-sidebar-foreground opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 translate-x-1">
                Cerrar sesión
              </span>
            )}
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/45" onClick={closeMobileMenu}>
          <aside
            className="h-full w-72 border-r border-sidebar-border/80 bg-[linear-gradient(180deg,#0a2c47_0%,#0e3a5e_48%,#0f3453_100%)] text-sidebar-foreground shadow-2xl p-4"
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
            <div className="pt-3">{renderNav(false)}</div>
            <div className="pt-4 mt-4 border-t border-sidebar-border/80">
              <button
                onClick={() => {
                  void handleLogout();
                }}
                className={`${baseNavButtonClass} text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/72`}
              >
                <LogOut className="size-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between border-b border-white/12 px-4 py-3 bg-[linear-gradient(118deg,#0b2f4b_0%,#105b7e_50%,#127f68_100%)] text-primary-foreground">
          <button
            type="button"
            className="p-2 rounded-lg border border-white/26 hover:bg-white/16 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-semibold tracking-tight text-primary-foreground">TaskApp</p>
          <button
            type="button"
            className="p-2 rounded-lg border border-white/26 hover:bg-white/16 transition-colors"
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
