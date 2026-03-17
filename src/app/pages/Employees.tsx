import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MoreHorizontal, Plus, Trash2, Users2 } from "lucide-react";
import { toast } from "react-toastify";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
import { ApiError } from "../../shared/api/api";
import { PageHero } from "../components/PageHero";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
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
  assignEmployeeArea,
  createEmployee,
  deleteEmployee,
  listEmployeeAreaAssignments,
  listEmployees,
  listEmployeeProjectMemberships,
  updateEmployee,
  updateEmployeeStatus,
  type EmployeeAreaAssignment,
  type EmployeeProjectMembership,
  type EmployeeStatusFilter,
  type EmployeeSummary,
} from "../../modules/employees/api/employees.api";

export function Employees() {
  const PAGE_SIZE = 8;

  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [image, setImage] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [assignmentAreaId, setAssignmentAreaId] = useState("");
  const [employeeAreaAssignments, setEmployeeAreaAssignments] = useState<EmployeeAreaAssignment[]>([]);
  const [employeeProjectMemberships, setEmployeeProjectMemberships] = useState<EmployeeProjectMembership[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    employee: EmployeeSummary;
    nextIsActive: boolean;
  } | null>(null);
  const [pendingDeleteEmployee, setPendingDeleteEmployee] = useState<EmployeeSummary | null>(null);

  const resetForm = () => {
    setEditingEmployeeId(null);
    setName("");
    setEmail("");
    setPassword("");
    setPhoneNumber("");
    setImage("");
    setEmailVerified(false);
    setIsActive(true);
  };

  const loadEmployees = useCallback(async () => {
    try {
      setError("");
      const response = await listEmployees(statusFilter);
      setEmployees(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar los empleados.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const loadAreas = async () => {
    try {
      const response = await listAreas("active");
      setAreas(response?.data ?? []);
    } catch {
      setAreas([]);
    }
  };

  const loadEmployeeAssignments = async (employeeId: number) => {
    setIsLoadingAssignments(true);
    try {
      const [areaAssignmentsResponse, membershipsResponse] = await Promise.all([
        listEmployeeAreaAssignments(employeeId, "all"),
        listEmployeeProjectMemberships(employeeId, "all"),
      ]);

      setEmployeeAreaAssignments(areaAssignmentsResponse?.data ?? []);
      setEmployeeProjectMemberships(membershipsResponse?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar las asignaciones del empleado.");
      }
      setEmployeeAreaAssignments([]);
      setEmployeeProjectMemberships([]);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    void loadAreas();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, employees.length]);

  const startEdit = (employee: EmployeeSummary) => {
    setEditingEmployeeId(employee.id);
    setName(employee.name);
    setEmail(employee.email);
    setPassword("");
    setPhoneNumber(employee.phoneNumber ?? "");
    setImage(employee.image ?? "");
    setEmailVerified(employee.emailVerified);
    setIsActive(employee.isActive);
    setError("");
    setSuccess("");
    setIsEmployeeModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
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

      if (!password.trim()) {
        toast.error("La contrasena es obligatoria para crear un empleado.");
        return;
      }
      if (password.trim().length < 8) {
        toast.error("La contrasena debe tener minimo 8 caracteres.");
        return;
      }
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
          phoneNumber: trimmedPhoneNumber || null,
          image: trimmedImage || null,
          emailVerified,
        });

        if (isActive !== employees.find((item) => item.id === editingEmployeeId)?.isActive) {
          await updateEmployeeStatus(editingEmployeeId, { isActive });
        }

        setSuccess("Empleado actualizado correctamente.");
      } else {
        await createEmployee({
          name: trimmedName,
          email: trimmedEmail,
          password: password.trim(),
          phoneNumber: trimmedPhoneNumber || null,
          image: trimmedImage || null,
          emailVerified,
          isActive,
        });
        setSuccess("Empleado creado correctamente.");
      }

      resetForm();
      setIsEmployeeModalOpen(false);
      await loadEmployees();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible guardar el empleado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (employee: EmployeeSummary, nextIsActive: boolean) => {
    setError("");
    setSuccess("");

    try {
      await updateEmployeeStatus(employee.id, { isActive: nextIsActive });
      setSuccess(nextIsActive ? "Empleado activado." : "Empleado desactivado.");
      await loadEmployees();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible actualizar el estado del empleado.");
      }
    }
  };

  const handleDeleteEmployee = async (employee: EmployeeSummary) => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const response = await deleteEmployee(employee.id);
      const mode = response?.data?.mode ?? "deleted";
      setSuccess(
        mode === "archived"
          ? "Empleado archivado por historial existente."
          : "Empleado eliminado correctamente.",
      );

      if (selectedEmployeeId === employee.id) {
        setSelectedEmployeeId(null);
        setEmployeeAreaAssignments([]);
        setEmployeeProjectMemberships([]);
      }

      await loadEmployees();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible eliminar el empleado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignments = async (employee: EmployeeSummary) => {
    setSelectedEmployeeId(employee.id);
    setAssignmentAreaId("");
    setError("");
    setSuccess("");
    await loadEmployeeAssignments(employee.id);
  };

  const handleAssignArea = async () => {
    if (!selectedEmployeeId) {
      toast.error("Selecciona primero un empleado.");
      return;
    }

    const numericAreaId = Number(assignmentAreaId);
    if (!Number.isInteger(numericAreaId) || numericAreaId <= 0) {
      toast.error("Selecciona un area valida para reasignar.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await assignEmployeeArea(selectedEmployeeId, { areaId: numericAreaId });
      setSuccess("Area reasignada correctamente.");
      setAssignmentAreaId("");
      await Promise.all([
        loadEmployees(),
        loadEmployeeAssignments(selectedEmployeeId),
      ]);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible reasignar el area.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEmployee = selectedEmployeeId
    ? employees.find((employee) => employee.id === selectedEmployeeId) ?? null
    : null;

  const totalPages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const paginatedEmployees = employees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="app-shell">
      <PageHero
        title="Empleados"
        subtitle="Gestion de empleados y estado operativo"
        icon={<Users2 className="size-5" />}
        actions={(
          <button
            type="button"
            onClick={() => {
              resetForm();
              setError("");
              setSuccess("");
              setIsEmployeeModalOpen(true);
            }}
            className="app-btn-primary h-10 w-10 p-0"
            aria-label="Crear empleado"
            title="Crear empleado"
          >
            <Plus className="size-5" />
          </button>
        )}
      />

      <div className="app-content">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Listado de empleados</h3>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as EmployeeStatusFilter)}
            className="app-control h-9 min-w-40"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando empleados...</div>
        ) : employees.length === 0 ? (
          <div className="text-sm text-muted-foreground">No hay empleados para este filtro.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {paginatedEmployees.map((employee) => (
                <article
                  key={employee.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-[0_10px_30px_rgba(16,36,58,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{employee.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label={`Acciones de ${employee.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => startEdit(employee)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            void handleOpenAssignments(employee);
                          }}
                        >
                          Asignaciones
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {employee.isActive ? (
                          <DropdownMenuItem
                            onClick={() => setPendingStatusChange({ employee, nextIsActive: false })}
                            className="text-destructive focus:text-destructive"
                          >
                            Desactivar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setPendingStatusChange({ employee, nextIsActive: true })}>
                            Activar
                          </DropdownMenuItem>
                        )}
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
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground truncate">
                    {employee.currentAreaName ?? "Sin area activa"}
                  </p>
                  <p className={`text-sm ${employee.isActive ? "text-success" : "text-warning"}`}>
                    {employee.isActive ? "Activo" : "Inactivo"}
                  </p>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  className="app-btn-secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Anterior
                </button>
                <p className="text-sm text-muted-foreground">
                  Pagina {currentPage} de {totalPages}
                </p>
                <button
                  type="button"
                  className="app-btn-secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog
        open={isEmployeeModalOpen}
        onOpenChange={(open) => {
          setIsEmployeeModalOpen(open);
          if (!open && !isSubmitting) {
            resetForm();
            setError("");
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

            {!editingEmployeeId && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Contrasena</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="app-control"
                  placeholder="Minimo 8 caracteres"
                />
              </div>
            )}

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
              <label className="block text-sm font-semibold text-foreground mb-1.5">Imagen (URL)</label>
              <input
                type="url"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                className="app-control"
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={emailVerified}
                  onChange={(event) => setEmailVerified(event.target.checked)}
                />
                <span className="text-sm text-foreground">Correo verificado</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                <span className="text-sm text-foreground">Empleado activo</span>
              </label>
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
        open={pendingStatusChange !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatusChange(null);
          }
        }}
        title={
          pendingStatusChange?.nextIsActive
            ? "Activar empleado"
            : "Desactivar empleado"
        }
        description={
          pendingStatusChange
            ? pendingStatusChange.nextIsActive
              ? `Se activará la cuenta de ${pendingStatusChange.employee.name}.`
              : `Se desactivará la cuenta de ${pendingStatusChange.employee.name}.`
            : ""
        }
        confirmLabel={pendingStatusChange?.nextIsActive ? "Activar" : "Desactivar"}
        variant={pendingStatusChange?.nextIsActive ? "default" : "destructive"}
        isProcessing={isSubmitting}
        onConfirm={() => {
          if (!pendingStatusChange) {
            return;
          }
          const { employee, nextIsActive } = pendingStatusChange;
          setPendingStatusChange(null);
          void handleStatusChange(employee, nextIsActive);
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
