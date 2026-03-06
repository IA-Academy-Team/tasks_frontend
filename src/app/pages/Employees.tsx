import { useEffect, useState } from "react";
import { ApiError } from "../../shared/api/api";
import {
  createEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeStatus,
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

  useEffect(() => {
    void loadEmployees();
  }, [statusFilter]);

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

  const handleSubmit = async (event: React.FormEvent) => {
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

