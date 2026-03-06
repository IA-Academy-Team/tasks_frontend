import { useEffect, useState, type FormEvent } from "react";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
import { ApiError } from "../../shared/api/api";
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
    const confirmed = window.confirm(
      nextIsActive
        ? `Deseas activar a ${employee.name}?`
        : `Deseas desactivar a ${employee.name}?`,
    );

    if (!confirmed) {
      return;
    }

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
    <div className="size-full flex flex-col bg-background">
      <div className="bg-primary border-b border-primary/30 px-8 py-6 shadow-md">
        <h2 className="text-2xl font-bold text-primary-foreground">Empleados</h2>
        <p className="text-sm text-white/90 mt-0.5">
          Gestion de empleados y estado operativo
        </p>
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-auto space-y-6">
        <section className="bg-card rounded-2xl border border-primary/25 p-5 shadow-[0_8px_24px_rgba(2,106,167,0.12)]">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingEmployeeId ? "Editar empleado" : "Crear empleado"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                placeholder="Nombre del empleado"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={Boolean(editingEmployeeId)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background disabled:bg-muted"
                placeholder="empleado@taskapp.local"
              />
            </div>

            {!editingEmployeeId && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Contrasena</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                  placeholder="Minimo 8 caracteres"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Telefono</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                placeholder="+573001234567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Imagen (URL)</label>
              <input
                type="url"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
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

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-70"
              >
                {isSubmitting ? "Guardando..." : editingEmployeeId ? "Actualizar" : "Crear"}
              </button>
              {editingEmployeeId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 border border-border rounded-xl hover:bg-secondary"
                >
                  Cancelar edicion
                </button>
              )}
            </div>
          </form>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          {success && <p className="mt-4 text-sm text-success">{success}</p>}
        </section>

        <section className="bg-card rounded-2xl border border-primary/25 overflow-hidden shadow-[0_8px_24px_rgba(2,106,167,0.12)]">
          <div className="px-5 py-4 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-primary">Listado de empleados</h3>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as EmployeeStatusFilter)}
              className="px-3 py-2 border border-border rounded-xl bg-input-background"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando empleados...</div>
          ) : employees.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay empleados para este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="px-4 py-3 text-left">Empleado</th>
                    <th className="px-4 py-3 text-left">Area actual</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-muted-foreground">{employee.email}</p>
                      </td>
                      <td className="px-4 py-3">{employee.currentAreaName ?? "Sin area activa"}</td>
                      <td className="px-4 py-3">
                        <span className={employee.isActive ? "text-success" : "text-warning"}>
                          {employee.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(employee)}
                            className="text-primary hover:underline"
                          >
                            Editar
                          </button>
                          {employee.isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleStatusChange(employee, false);
                              }}
                              className="text-destructive hover:underline"
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                void handleStatusChange(employee, true);
                              }}
                              className="text-success hover:underline"
                            >
                              Activar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              void handleOpenAssignments(employee);
                            }}
                            className="text-primary hover:underline"
                          >
                            Asignaciones
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-primary/25 p-5 shadow-[0_8px_24px_rgba(2,106,167,0.12)]">
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
                      className="px-3 py-2 border border-border rounded-xl bg-input-background min-w-[220px]"
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
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
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
    </div>
  );
}
