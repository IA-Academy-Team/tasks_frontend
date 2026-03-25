import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ListFilter,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UserCheck,
  UserX,
  Users2,
} from "lucide-react";
import { toast } from "react-toastify";
import { ApiError } from "../../shared/api/api";
import { PageHero } from "../components/PageHero";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeStatus,
  type EmployeeStatusFilter,
  type EmployeeSummary,
} from "../../modules/employees/api/employees.api";
import { cn } from "../components/ui/utils";

export function Employees() {
  const PAGE_SIZE = 8;
  const filterOptions: Array<{
    value: EmployeeStatusFilter;
    label: string;
    icon: typeof ListFilter;
    activeClassName: string;
  }> = [
    { value: "all", label: "Todos", icon: ListFilter, activeClassName: "border-accent/45 bg-accent/14 text-accent" },
    { value: "active", label: "Activos", icon: UserCheck, activeClassName: "border-success/45 bg-success/14 text-success" },
    { value: "inactive", label: "Inactivos", icon: UserX, activeClassName: "border-warning/45 bg-warning/14 text-warning" },
  ];

  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [image, setImage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDeleteEmployee, setPendingDeleteEmployee] = useState<EmployeeSummary | null>(null);
  const [pendingStatusUpdateEmployee, setPendingStatusUpdateEmployee] = useState<{
    employee: EmployeeSummary;
    isActive: boolean;
  } | null>(null);

  const resetForm = () => {
    setEditingEmployeeId(null);
    setName("");
    setEmail("");
    setPassword("");
    setPhoneNumber("");
    setImage("");
  };

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listEmployees(statusFilter);
      setEmployees(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        toast.error(incomingError.message);
      } else {
        toast.error("No fue posible cargar los empleados.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  const startEdit = (employee: EmployeeSummary) => {
    setEditingEmployeeId(employee.id);
    setName(employee.name);
    setEmail(employee.email);
    setPassword("");
    setPhoneNumber(employee.phoneNumber ?? "");
    setImage(employee.image ?? "");
    setIsEmployeeModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedPhoneNumber = phoneNumber.trim();
    const trimmedImage = image.trim();

    if (!trimmedName) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (trimmedName.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    if (!editingEmployeeId) {
      if (!trimmedEmail) {
        toast.error("El correo es obligatorio.");
        return;
      }

      if (!trimmedEmail.includes("@")) {
        toast.error("El correo debe incluir el simbolo @.");
        return;
      }

      const [localPart, domainPart] = trimmedEmail.split("@");
      if (!localPart) {
        toast.error("El correo debe incluir texto antes de @.");
        return;
      }
      if (!domainPart) {
        toast.error("El correo debe incluir un dominio despues de @.");
        return;
      }
      if (!domainPart.includes(".")) {
        toast.error("El dominio del correo no es valido. Ejemplo: correo@empresa.com");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        toast.error("El correo electronico no tiene un formato valido.");
        return;
      }

      if (!trimmedPassword) {
        toast.error("La contrasena es obligatoria para crear un empleado.");
        return;
      }
      if (trimmedPassword.length < 8) {
        toast.error("La contrasena debe tener minimo 8 caracteres.");
        return;
      }
    } else if (trimmedPassword && trimmedPassword.length < 8) {
      toast.error("La nueva contrasena debe tener minimo 8 caracteres.");
      return;
    }

    if (trimmedPassword && trimmedPassword.length > 72) {
      toast.error("La contrasena no puede superar 72 caracteres.");
      return;
    }

    if (trimmedPhoneNumber && trimmedPhoneNumber.length > 30) {
      toast.error("El telefono no puede superar 30 caracteres.");
      return;
    }

    if (trimmedImage && !/^https?:\/\//i.test(trimmedImage)) {
      toast.error("La URL de imagen debe iniciar con http:// o https://");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEmployeeId) {
        await updateEmployee(editingEmployeeId, {
          name: trimmedName,
          ...(trimmedPassword ? { password: trimmedPassword } : {}),
          phoneNumber: trimmedPhoneNumber || null,
          image: trimmedImage || null,
        });
      } else {
        await createEmployee({
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          phoneNumber: trimmedPhoneNumber || null,
          image: trimmedImage || null,
          isActive: true,
        });
      }

      resetForm();
      setIsEmployeeModalOpen(false);
      await loadEmployees();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible guardar el empleado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employee: EmployeeSummary) => {
    setIsSubmitting(true);
    try {
      await deleteEmployee(employee.id);
      await loadEmployees();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible eliminar el empleado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeStatusUpdate = async (employee: EmployeeSummary, isActive: boolean) => {
    setIsSubmitting(true);
    try {
      await updateEmployeeStatus(employee.id, { isActive });
      await loadEmployees();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible actualizar el estado del empleado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return employees;
    }

    return employees.filter((employee) => {
      const areaNames = employee.assignedAreaNames.length > 0
        ? employee.assignedAreaNames
        : employee.areaNames.length > 0
          ? employee.areaNames
          : employee.currentAreaName
            ? [employee.currentAreaName]
            : [];

      return employee.name.toLowerCase().includes(normalizedTerm)
        || employee.email.toLowerCase().includes(normalizedTerm)
        || areaNames.some((areaName) => areaName.toLowerCase().includes(normalizedTerm));
    });
  }, [employees, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const visibleStart = filteredEmployees.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(currentPage * PAGE_SIZE, filteredEmployees.length);

  const getEmployeeAreas = (employee: EmployeeSummary) => (
    employee.assignedAreaNames.length > 0
      ? employee.assignedAreaNames
      : employee.areaNames.length > 0
        ? employee.areaNames
        : employee.currentAreaName
          ? [employee.currentAreaName]
          : []
  );

  const getEmployeeInitials = (employeeName: string) => employeeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="app-shell">
      <PageHero
        title="Empleados"
        subtitle="Gestion de empleados y estado operativo"
        icon={<Users2 className="size-5" />}
      />

      <div className="app-content">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Listado de empleados</h3>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {filterOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = statusFilter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all",
                      isSelected
                        ? option.activeClassName
                        : "border-border/80 bg-card text-muted-foreground hover:border-border/90 hover:bg-secondary/80 hover:text-foreground",
                    )}
                    aria-pressed={isSelected}
                    title={`Ver empleados ${option.label.toLowerCase()}`}
                  >
                    <Icon className="size-4" />
                    <span>{option.label}</span>
                  </button>
                );
              })}

              <div className="relative w-full min-[560px]:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="app-control h-9 pl-9"
                  placeholder="Buscar por nombre, correo o area..."
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsEmployeeModalOpen(true);
                }}
                className="app-btn-primary h-10 px-4"
                aria-label="Crear empleado"
                title="Crear empleado"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando empleados...</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_14px_34px_rgba(16,36,58,0.12)] backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-sm">
                  <thead className="bg-secondary/55">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-[0.12em] [&>th]:text-muted-foreground">
                      <th className="w-[42%]">Empleado</th>
                      <th className="w-[34%]">Areas</th>
                      <th className="w-[14%]">Estado</th>
                      <th className="w-[10%] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70 bg-card">
                    {paginatedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          {searchTerm.trim().length > 0
                            ? "No se encontraron empleados con esa busqueda."
                            : "No hay empleados para este filtro."}
                        </td>
                      </tr>
                    ) : (
                      paginatedEmployees.map((employee) => {
                        const areaNames = getEmployeeAreas(employee);
                        const visibleAreaNames = areaNames.slice(0, 2);
                        const additionalAreas = Math.max(areaNames.length - visibleAreaNames.length, 0);

                        return (
                          <tr key={employee.id} className="transition-colors hover:bg-secondary/35">
                            <td className="px-4 py-3.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="size-10 border border-border/80 bg-secondary/60">
                                  {employee.image ? <AvatarImage src={employee.image} alt={employee.name} /> : null}
                                  <AvatarFallback className="bg-secondary text-xs font-semibold text-foreground">
                                    {getEmployeeInitials(employee.name) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-foreground">{employee.name}</p>
                                  <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {areaNames.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {visibleAreaNames.map((areaName) => (
                                    <span
                                      key={`${employee.id}-${areaName}`}
                                      className="inline-flex items-center rounded-md border border-border/80 bg-secondary/60 px-2 py-1 text-xs font-medium text-foreground"
                                    >
                                      {areaName}
                                    </span>
                                  ))}
                                  {additionalAreas > 0 && (
                                    <span className="inline-flex items-center rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                                      +{additionalAreas}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Sin area activa</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-2 text-sm font-medium",
                                  employee.isActive ? "text-success" : "text-warning",
                                )}
                              >
                                <span className={cn("size-2 rounded-full", employee.isActive ? "bg-success" : "bg-warning")} />
                                {employee.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                    aria-label={`Acciones de ${employee.name}`}
                                  >
                                    <MoreVertical className="size-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem onClick={() => startEdit(employee)}>
                                    <Pencil className="size-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setPendingStatusUpdateEmployee({
                                      employee,
                                      isActive: !employee.isActive,
                                    })}
                                  >
                                    {employee.isActive ? (
                                      <>
                                        <UserX className="size-4" />
                                        Desactivar
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="size-4" />
                                        Activar
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setPendingDeleteEmployee(employee)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/85 bg-secondary/55 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Mostrando {visibleStart} a {visibleEnd} de {filteredEmployees.length} empleados
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="app-btn-secondary size-9 p-0"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      aria-label="Pagina anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Pagina {currentPage} de {totalPages}
                    </p>
                    <button
                      type="button"
                      className="app-btn-secondary size-9 p-0"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      aria-label="Pagina siguiente"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={isEmployeeModalOpen}
        onOpenChange={(open) => {
          setIsEmployeeModalOpen(open);
          if (!open && !isSubmitting) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingEmployeeId ? "Editar empleado" : "Crear empleado"}</DialogTitle>
            <DialogDescription>
              Gestiona los datos base y estado operativo del empleado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="app-control"
                placeholder="Nombre del empleado"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={Boolean(editingEmployeeId)}
                className="app-control disabled:bg-muted"
                placeholder="empleado@taskapp.local"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                {editingEmployeeId ? "Nueva contraseña (opcional)" : "Contraseña"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="app-control"
                placeholder={editingEmployeeId ? "Dejar vacio para no cambiar" : "Minimo 8 caracteres"}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Telefono</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="app-control"
                placeholder="+573001234567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-1.5">Imagen de perfil (URL)</label>
              <input
                type="url"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                className="app-control"
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
              {editingEmployeeId && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsEmployeeModalOpen(false);
                  }}
                  className="app-btn-secondary"
                >
                  Cancelar edicion
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="app-btn-primary"
              >
                {isSubmitting ? "Guardando..." : editingEmployeeId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={pendingStatusUpdateEmployee !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatusUpdateEmployee(null);
          }
        }}
        title="Actualizar estado del empleado"
        description={
          pendingStatusUpdateEmployee
            ? `Se ${pendingStatusUpdateEmployee.isActive ? "activará" : "desactivará"} a ${pendingStatusUpdateEmployee.employee.name}.`
            : ""
        }
        confirmLabel="Confirmar cambio"
        variant={pendingStatusUpdateEmployee?.isActive ? "default" : "destructive"}
        isProcessing={isSubmitting}
        onConfirm={() => {
          if (!pendingStatusUpdateEmployee) {
            return;
          }
          const { employee, isActive } = pendingStatusUpdateEmployee;
          setPendingStatusUpdateEmployee(null);
          void handleEmployeeStatusUpdate(employee, isActive);
        }}
      />

      <ConfirmActionDialog
        open={pendingDeleteEmployee !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteEmployee(null);
          }
        }}
        title="Eliminar empleado"
        description={
          pendingDeleteEmployee
            ? `Se eliminará a ${pendingDeleteEmployee.name}. Si existe historial, el backend archivará la cuenta en lugar de eliminarla definitivamente.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="destructive"
        isProcessing={isSubmitting}
        confirmDelaySeconds={5}
        onConfirm={() => {
          if (!pendingDeleteEmployee) {
            return;
          }
          const employeeToDelete = pendingDeleteEmployee;
          setPendingDeleteEmployee(null);
          void handleDeleteEmployee(employeeToDelete);
        }}
      />
    </div>
  );
}
