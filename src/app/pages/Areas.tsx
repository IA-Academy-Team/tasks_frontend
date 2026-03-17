import { useCallback, useEffect, useState } from "react";
import { Building2, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
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
  DropdownMenuCheckboxItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  createArea,
  deleteArea,
  listAreas,
  updateArea,
  type AreaStatusFilter,
  type AreaSummary,
} from "../../modules/areas/api/areas.api";
import {
  assignEmployeeArea,
  listEmployees,
  unassignEmployeeArea,
  type EmployeeSummary,
} from "../../modules/employees/api/employees.api";

export function Areas() {
  const PAGE_SIZE = 8;

  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<AreaStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [pendingDeleteArea, setPendingDeleteArea] = useState<AreaSummary | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [initialEmployeeIds, setInitialEmployeeIds] = useState<number[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingAreaId(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setSelectedEmployeeIds([]);
    setInitialEmployeeIds([]);
  };

  const loadAreas = useCallback(async () => {
    try {
      setError("");
      const response = await listAreas(statusFilter);
      setAreas(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar las areas.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, areas.length]);

  const totalPages = Math.max(1, Math.ceil(areas.length / PAGE_SIZE));
  const paginatedAreas = areas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const response = await listEmployees("all");
      return response?.data ?? [];
    } catch {
      return [] as EmployeeSummary[];
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployeeIds((current) => (
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    ));
  };

  const openCreateAreaModal = async () => {
    resetForm();
    setError("");
    setSuccess("");
    const employeesData = await loadEmployees();
    setEmployees(employeesData);
    setSelectedEmployeeIds([]);
    setInitialEmployeeIds([]);
    setIsAreaModalOpen(true);
  };

  const startEdit = async (area: AreaSummary) => {
    setEditingAreaId(area.id);
    setName(area.name);
    setDescription(area.description ?? "");
    setIsActive(area.isActive);
    setSuccess("");
    setError("");
    const employeesData = await loadEmployees();
    setEmployees(employeesData);
    const areaEmployeeIds = employeesData
      .filter((employee) => employee.currentAreaId === area.id)
      .map((employee) => employee.id);
    setSelectedEmployeeIds(areaEmployeeIds);
    setInitialEmployeeIds(areaEmployeeIds);
    setIsAreaModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      toast.error("El nombre del area es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    try {
      let savedAreaId = editingAreaId;

      if (editingAreaId) {
        await updateArea(editingAreaId, {
          name: trimmedName,
          description: trimmedDescription || null,
          isActive,
        });
        setSuccess("Area actualizada correctamente.");
      } else {
        const createdAreaResponse = await createArea({
          name: trimmedName,
          description: trimmedDescription || null,
          isActive,
        });
        savedAreaId = createdAreaResponse?.data?.id ?? null;
        setSuccess("Area creada correctamente.");
      }

      if (savedAreaId) {
        const selectedSet = new Set(selectedEmployeeIds);
        const initialSet = new Set(initialEmployeeIds);

        const toUnassign = initialEmployeeIds.filter((employeeId) => !selectedSet.has(employeeId));
        const toAssign = selectedEmployeeIds.filter((employeeId) => !initialSet.has(employeeId));

        const unassignResults = await Promise.allSettled(
          toUnassign.map((employeeId) => unassignEmployeeArea(employeeId, { areaId: savedAreaId! })),
        );
        const assignResults = await Promise.allSettled(
          toAssign.map((employeeId) => assignEmployeeArea(employeeId, { areaId: savedAreaId! })),
        );

        const failedCount = [...unassignResults, ...assignResults]
          .filter((result) => result.status === "rejected")
          .length;

        if (failedCount > 0) {
          setError(
            `Se guardó el area, pero ${failedCount} cambio(s) de empleados no se pudo(ieron) aplicar.`,
          );
        }
      }

      resetForm();
      setEmployees([]);
      setIsAreaModalOpen(false);
      await loadAreas();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible guardar el area.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (area: AreaSummary) => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await deleteArea(area.id);
      const mode = response?.data?.mode ?? "deleted";
      if (mode === "archived") {
        setSuccess("El area fue archivada porque tiene historial.");
      } else {
        setSuccess("El area fue eliminada.");
      }
      await loadAreas();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible eliminar el area.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <PageHero
        title="Areas"
        subtitle="Gestion de areas operativas"
        icon={<Building2 className="size-5" />}
        actions={(
          <button
            type="button"
            onClick={() => {
              void openCreateAreaModal();
            }}
            className="app-btn-primary h-10 w-10 p-0"
            aria-label="Crear area"
            title="Crear area"
          >
            <Plus className="size-5" />
          </button>
        )}
      />

      <div className="app-content">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Listado de areas</h3>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as AreaStatusFilter)}
            className="app-control h-9 min-w-40"
          >
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando areas...</div>
        ) : areas.length === 0 ? (
          <div className="text-sm text-muted-foreground">No hay areas para este filtro.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {paginatedAreas.map((area) => (
                <article
                  key={area.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-[0_10px_30px_rgba(16,36,58,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{area.name}</p>
                      <p className={`text-sm ${area.isActive ? "text-success" : "text-warning"}`}>
                        {area.isActive ? "Activa" : "Inactiva"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label={`Acciones de ${area.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => {
                          void startEdit(area);
                        }}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setPendingDeleteArea(area)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {area.activeMemberCount} empleados · {area.activeProjectCount} proyectos
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
        open={isAreaModalOpen}
        onOpenChange={(open) => {
          setIsAreaModalOpen(open);
          if (!open && !isSubmitting) {
            resetForm();
            setEmployees([]);
            setError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAreaId ? "Editar area" : "Crear area"}</DialogTitle>
            <DialogDescription>
              Define la informacion principal del area y sus empleados.
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
                placeholder="Nombre del area"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Descripcion</label>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="app-control"
                placeholder="Descripcion breve"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="area-modal-is-active"
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              <label htmlFor="area-modal-is-active" className="text-sm text-foreground">
                Area activa
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-1.5">Empleados del area</label>
              {isLoadingEmployees ? (
                <p className="text-sm text-muted-foreground">Cargando empleados...</p>
              ) : employees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay empleados disponibles.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="app-btn-secondary"
                          disabled={isSubmitting}
                        >
                          Seleccionar empleados
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[360px] max-h-72 overflow-y-auto">
                        {employees.map((employee) => {
                          const isChecked = selectedEmployeeIds.includes(employee.id);
                          const isDisabled = !employee.isActive && !isChecked;

                          return (
                            <DropdownMenuCheckboxItem
                              key={employee.id}
                              checked={isChecked}
                              disabled={isDisabled || isSubmitting}
                              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-foreground truncate">{employee.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {employee.email} · {employee.currentAreaName ?? "Sin area"}
                                </p>
                              </div>
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="text-xs text-muted-foreground">
                      Seleccionados: {selectedEmployeeIds.length}
                    </p>
                  </div>

                  {selectedEmployeeIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay empleados seleccionados para esta area.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border p-2 space-y-2">
                      {selectedEmployeeIds.map((employeeId) => {
                        const employee = employees.find((item) => item.id === employeeId);
                        if (!employee) return null;

                        return (
                          <div key={employee.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm text-foreground truncate">{employee.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleEmployeeSelection(employee.id)}
                              className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                              disabled={isSubmitting}
                              aria-label={`Quitar a ${employee.name}`}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
              {editingAreaId && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAreaModalOpen(false);
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
                <Plus className="size-4" />
                {isSubmitting ? "Guardando..." : editingAreaId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={pendingDeleteArea !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteArea(null);
          }
        }}
        title="Eliminar area"
        description={
          pendingDeleteArea
            ? `Vas a eliminar "${pendingDeleteArea.name}". Si tiene historial o dependencias activas, el backend puede archivarla en lugar de eliminarla definitivamente.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="destructive"
        isProcessing={isSubmitting}
        confirmDelaySeconds={5}
        onConfirm={() => {
          if (!pendingDeleteArea) {
            return;
          }
          const areaToDelete = pendingDeleteArea;
          setPendingDeleteArea(null);
          void handleDelete(areaToDelete);
        }}
      />
    </div>
  );
}
