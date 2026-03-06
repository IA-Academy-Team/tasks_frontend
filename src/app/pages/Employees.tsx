import { useEffect, useState, type FormEvent } from "react";
import { MoreHorizontal, Plus, Users2 } from "lucide-react";
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
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>("all");
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

  const loadEmployees = async () => {
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
  };

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
  }, [statusFilter]);

  useEffect(() => {
    void loadAreas();
  }, []);

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
      setError("El nombre es obligatorio.");
      return;
    }

    if (!editingEmployeeId) {
      if (!trimmedEmail) {
        setError("El correo es obligatorio.");
        return;
      }

      if (!password.trim()) {
        setError("La contrasena es obligatoria para crear un empleado.");
        return;
      }
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

  const handleOpenAssignments = async (employee: EmployeeSummary) => {
    setSelectedEmployeeId(employee.id);
    setAssignmentAreaId("");
    setError("");
    setSuccess("");
    await loadEmployeeAssignments(employee.id);
  };

  const handleAssignArea = async () => {
    if (!selectedEmployeeId) {
      setError("Selecciona primero un empleado.");
      return;
    }

    const numericAreaId = Number(assignmentAreaId);
    if (!Number.isInteger(numericAreaId) || numericAreaId <= 0) {
      setError("Selecciona un area valida para reasignar.");
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
        <section className="app-panel overflow-hidden">
          <div className="app-panel-header">
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
          {error && <p className="p-4 text-sm text-destructive">{error}</p>}
          {success && <p className="p-4 text-sm text-success">{success}</p>}

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando empleados...</div>
          ) : employees.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay empleados para este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-th">Empleado</th>
                    <th className="app-th">Area actual</th>
                    <th className="app-th">Estado</th>
                    <th className="app-th">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="app-row">
                      <td className="app-td">
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-muted-foreground">{employee.email}</p>
                      </td>
                      <td className="app-td">{employee.currentAreaName ?? "Sin area activa"}</td>
                      <td className="app-td">
                        <span className={employee.isActive ? "text-success" : "text-warning"}>
                          {employee.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="app-td">
                        <div className="flex justify-end">
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="app-panel app-panel-pad">
          <h3 className="text-lg font-semibold text-foreground mb-4">Asignaciones por empleado</h3>
          {!selectedEmployee ? (
            <p className="text-sm text-muted-foreground">
              Selecciona un empleado desde la tabla para gestionar su area y revisar historial.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Empleado:</span> {selectedEmployee.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
                  <p className="text-sm mt-1">
                    <span className="font-medium">Area actual:</span>{" "}
                    {selectedEmployee.currentAreaName ?? "Sin area activa"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Reasignar area</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={assignmentAreaId}
                      onChange={(event) => setAssignmentAreaId(event.target.value)}
                      className="app-control min-w-[220px]"
                    >
                      <option value="">Selecciona area</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        void handleAssignArea();
                      }}
                      className="app-btn-primary"
                    >
                      Reasignar
                    </button>
                  </div>
                </div>
              </div>

              {isLoadingAssignments ? (
                <p className="text-sm text-muted-foreground">Cargando historial...</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="border border-border rounded-xl p-4">
                    <h4 className="font-medium mb-3">Historial de areas</h4>
                    {employeeAreaAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin asignaciones de area.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {employeeAreaAssignments.map((assignment) => (
                          <li key={assignment.id} className="border border-border rounded-lg p-2">
                            <p className="font-medium">{assignment.areaName}</p>
                            <p className="text-muted-foreground">
                              {assignment.isActive ? "Activa" : "Finalizada"} ·{" "}
                              {new Date(assignment.assignedAt).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="border border-border rounded-xl p-4">
                    <h4 className="font-medium mb-3">Historial de proyectos</h4>
                    {employeeProjectMemberships.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin membresias de proyecto.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {employeeProjectMemberships.map((membership) => (
                          <li key={membership.id} className="border border-border rounded-lg p-2">
                            <p className="font-medium">{membership.projectName}</p>
                            <p className="text-muted-foreground">
                              {membership.isActive ? "Activa" : "Finalizada"} · {membership.projectStatus}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
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

            {error && (
              <p className="md:col-span-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
                {error}
              </p>
            )}

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
    </div>
  );
}
