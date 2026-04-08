import { Outlet, useNavigate, useLocation } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FolderKanban,
  ClipboardList,
  Users,
  LayoutDashboard,
  Pencil,
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
import { ProfileEditorModal } from "./ProfileEditorModal";
import { NotificationsFloatingPanel } from "./NotificationsFloatingPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type NavItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  isVisible: boolean;
  isActive: boolean;
};

const baseNavButtonClass =
  "group relative w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-base font-medium transition-all";

const getNavButtonClass = (isActive: boolean, isCollapsed = false) =>
  `${baseNavButtonClass} ${
    isActive
      ? "bg-sidebar-accent text-sidebar-foreground ring-1 ring-sidebar-ring/45 shadow-[0_8px_20px_rgba(15,61,98,0.14)] dark:shadow-[0_10px_24px_rgba(2,12,24,0.24)]"
      : "text-sidebar-foreground/86 hover:text-sidebar-foreground hover:bg-sidebar-accent/82"
  } ${isCollapsed ? "justify-center px-3" : ""}`;

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const canManageAreas = user ? canAccessResource(user.role, "areas") : false;
  const canManageEmployees = user ? canAccessResource(user.role, "employees") : false;
  const dashboardPath = user ? getDefaultRouteForRole(user.role) : "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;
  const isProjectsActive = location.pathname === "/projects" || location.pathname.startsWith("/projects/");
  const isStandaloneTasksActive = isActive("/tasks/standalone");
  const isDashboardActive = location.pathname === dashboardPath;
  const isAreasActive = isActive("/areas");
  const isEmployeesActive = isActive("/employees");
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navigateTo = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  const handleOpenProfileModal = () => {
    setIsProfileModalOpen(true);
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
      key: "standalone-tasks",
      label: "Tareas",
      path: "/tasks/standalone",
      icon: ClipboardList,
      isVisible: true,
      isActive: isStandaloneTasksActive,
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
    <nav className="flex-1 overflow-hidden px-3 py-4 space-y-1.5">
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
            <Icon className="size-5 shrink-0" />
            {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );

  const renderUserMenu = (isCollapsed = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`${baseNavButtonClass} text-sidebar-foreground/88 hover:text-sidebar-foreground hover:bg-sidebar-accent/82 ${
            isCollapsed ? "justify-center px-3" : ""
          }`}
          aria-label="Opciones de usuario"
          title={isCollapsed ? "Opciones de usuario" : undefined}
        >
          <span className="size-9 shrink-0 rounded-full overflow-hidden border border-sidebar-border bg-sidebar-accent/65 flex items-center justify-center">
            {user?.image ? (
              <img src={user.image} alt={user.name} className="size-full object-cover" />
            ) : (
              <UserCircle2 className="size-6 text-sidebar-foreground" />
            )}
          </span>
          {!isCollapsed && (
            <span className="flex-1 min-w-0 text-left">
              <span className="block truncate text-[15px] leading-5">{user?.name ?? "Usuario"}</span>
              <span className="block truncate text-xs leading-5 text-sidebar-foreground/74">
                {user?.email ?? "Sin correo"}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={isCollapsed ? "right" : "top"}
        align={isCollapsed ? "start" : "end"}
        sideOffset={8}
        className="z-[1200] w-52 rounded-xl border-border/90 bg-card/98 p-1.5 shadow-2xl backdrop-blur-sm"
      >
        <DropdownMenuItem
          onSelect={handleOpenProfileModal}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm"
        >
          <Pencil className="size-4" />
          Editar perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void handleLogout();
          }}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="h-screen overflow-y-hidden overflow-x-visible flex bg-background">
      <aside
        className={`hidden md:flex h-screen relative z-30 shrink-0 overflow-y-hidden overflow-x-visible border-r border-sidebar-border/85 bg-sidebar text-sidebar-foreground flex-col shadow-[var(--shadow-sm)] transition-[width] duration-300 ease-in-out ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_34%)] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.14),transparent_36%)]" />
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
                ? "size-10 rounded-xl border border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] hover:bg-sidebar-accent/85"
                : "absolute right-2 top-1/2 size-11 -translate-y-1/2 text-sidebar-foreground/86 hover:rounded-lg hover:border hover:border-sidebar-border hover:bg-sidebar-accent/75 hover:text-sidebar-foreground"
            }`}
            aria-label={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="size-6" /> : <ChevronLeft className="size-6" />}
          </button>
          {!isSidebarCollapsed && <h1 className="pr-12 text-2xl font-bold tracking-tight leading-none">Tasks</h1>}
        </div>

        {renderNav(isSidebarCollapsed)}

        <div className="relative p-3 border-t border-sidebar-border/80 mt-auto">
          {renderUserMenu(isSidebarCollapsed)}
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/45" onClick={closeMobileMenu}>
          <aside
            className="h-full w-72 border-r border-sidebar-border/85 bg-sidebar text-sidebar-foreground shadow-[var(--shadow-lg)] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-sidebar-border/80">
              <div>
                <h1 className="text-xl font-bold">Tasks</h1>
                <p className="text-sm text-sidebar-foreground/80">Gestión de proyectos</p>
              </div>
              <button
                type="button"
                className="p-2.5 rounded-lg hover:bg-sidebar-accent/80 text-sidebar-foreground"
                onClick={closeMobileMenu}
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="pt-3">{renderNav(false)}</div>
            <div className="pt-4 mt-4 border-t border-sidebar-border/80">
              {renderUserMenu(false)}
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        <header className="md:hidden flex items-center justify-between border-b border-border/85 px-4 py-3 bg-card/95 backdrop-blur-sm">
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

      <ProfileEditorModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />
      <NotificationsFloatingPanel />
    </div>
  );
}
