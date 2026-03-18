import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleSlash2,
  ListFilter,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users2,
  X,
} from "lucide-react";
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
  updateAreaStatus,
  type AreaStatusFilter,
  type AreaSummary,
} from "../../modules/areas/api/areas.api";
import {
  assignEmployeeArea,
  listEmployees,
  unassignEmployeeArea,
  type EmployeeSummary,
} from "../../modules/employees/api/employees.api";
import { cn } from "../components/ui/utils";

export function Areas() {
  const PAGE_SIZE = 12;
  const filterOptions: Array<{
    value: AreaStatusFilter;
    label: string;
    icon: typeof ListFilter;
    activeClassName: string;
  }> = [
    { value: "all", label: "Todas", icon: ListFilter, activeClassName: "border-accent/40 bg-accent/15 text-accent" },
    { value: "active", label: "Activas", icon: CheckCircle2, activeClassName: "border-success/40 bg-success/15 text-success" },
    { value: "inactive", label: "Inactivas", icon: CircleSlash2, activeClassName: "border-warning/40 bg-warning/15 text-warning" },
  ];

  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<AreaStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [pendingDeleteArea, setPendingDeleteArea] = useState<AreaSummary | null>(null);
  const [pendingStatusUpdateArea, setPendingStatusUpdateArea] = useState<{
    area: AreaSummary;
    isActive: boolean;
  } | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [initialEmployeeIds, setInitialEmployeeIds] = useState<number[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
      const response = await listAreas(statusFilter);
      setAreas(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        toast.error(incomingError.message);
      } else {
        toast.error("No fue posible cargar las areas.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  const filteredAreas = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return areas;
    }

    return areas.filter((area) => (
      area.name.toLowerCase().includes(normalizedTerm)
      || (area.description ?? "").toLowerCase().includes(normalizedTerm)
    ));
  }, [areas, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, filteredAreas.length, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAreas.length / PAGE_SIZE));
  const paginatedAreas = filteredAreas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalMembers = filteredAreas.reduce((accumulator, area) => accumulator + area.activeMemberCount, 0);
  const totalProjects = filteredAreas.reduce((accumulator, area) => accumulator + area.activeProjectCount, 0);

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
    const employeesData = await loadEmployees();
    setEmployees(employeesData);
    const areaEmployeeIds = employeesData
      .filter((employee) => (
        employee.areaIds.includes(area.id)
        || employee.currentAreaId === area.id
      ))
      .map((employee) => employee.id);
    setSelectedEmployeeIds(areaEmployeeIds);
    setInitialEmployeeIds(areaEmployeeIds);
    setIsAreaModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

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
      } else {
        const createdAreaResponse = await createArea({
          name: trimmedName,
          description: trimmedDescription || null,
          isActive,
        });
        savedAreaId = createdAreaResponse?.data?.id ?? null;
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
          toast.warning(
            `Se guardó el area, pero ${failedCount} cambio(s) de empleados no se pudo(ieron) aplicar.`,
          );
        }
      }

      resetForm();
      setEmployees([]);
      setIsAreaModalOpen(false);
      await loadAreas();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible guardar el area.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (area: AreaSummary) => {
    setIsSubmitting(true);
    try {
      await deleteArea(area.id);
      await loadAreas();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible eliminar el area.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAreaStatusUpdate = async (area: AreaSummary, isActive: boolean) => {
    setIsSubmitting(true);
    try {
      await updateAreaStatus(area.id, { isActive });
      await loadAreas();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible actualizar el estado del area.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell h-full">
      <PageHero
        title="Areas"
        subtitle="Gestion de areas operativas"
        icon={<Building2 className="size-5" />}
        className="min-h-0 py-3"
      />

      <div className="app-content flex-1 min-h-0 overflow-hidden gap-3 py-3 md:gap-3 md:py-4">
        <section className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Estructura organizacional</h3>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <div className="relative w-full sm:min-w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="app-control h-10 pl-9"
                  placeholder="Buscar area..."
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  void openCreateAreaModal();
                }}
                className="app-btn-primary h-10 px-4"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 my-2">
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
                        : "border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground",
                    )}
                    aria-pressed={isSelected}
                    title={`Ver areas ${option.label.toLowerCase()}`}
                  >
                    <Icon className="size-4" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando areas...</div>
          ) : filteredAreas.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-5 text-sm text-muted-foreground">
              {areas.length === 0
                ? "No hay areas para este filtro."
                : "No encontramos areas que coincidan con tu busqueda."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {paginatedAreas.map((area) => (
                <article
                  key={area.id}
                  className="group rounded-xl border border-border/80 bg-card/90 p-4 shadow-[0_10px_24px_rgba(18,38,59,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(18,38,59,0.1)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-semibold text-foreground">{area.name}</h4>
                      <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {(area.description ?? "Sin descripcion breve").trim() || "Sin descripcion breve"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label={`Acciones de ${area.name}`}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => {
                          void startEdit(area);
                        }}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPendingStatusUpdateArea({
                            area,
                            isActive: !area.isActive,
                          })}
                        >
                          {area.isActive ? (
                            <>
                              <CircleSlash2 className="size-4" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4" />
                              Activar
                            </>
                          )}
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Users2 className="size-4" />
                        Empleados
                      </span>
                      <span className="font-semibold text-foreground">{area.activeMemberCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <BriefcaseBusiness className="size-4" />
                        Proyectos
                      </span>
                      <span className="font-semibold text-foreground">{area.activeProjectCount}</span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-border/70 pt-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                        area.isActive
                          ? "border-success/35 bg-success/10 text-success"
                          : "border-warning/35 bg-warning/10 text-warning",
                      )}
                    >
                      {area.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mt-auto mb-20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Total areas
                </p>
                <p className="mt-0.5 text-2xl font-bold text-primary">{filteredAreas.length}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Personal total
                </p>
                <p className="mt-0.5 text-2xl font-bold text-foreground">{totalMembers}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Proyectos activos
                </p>
                <p className="mt-0.5 text-2xl font-bold text-foreground">{totalProjects}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end mr-16">
              <button
                type="button"
                className="app-btn-secondary h-9 px-3"
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
                className="app-btn-secondary h-9 px-3"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>

      <Dialog
        open={isAreaModalOpen}
        onOpenChange={(open) => {
          setIsAreaModalOpen(open);
          if (!open && !isSubmitting) {
            resetForm();
            setEmployees([]);
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
                                  {employee.email} · {employee.areaNames.length > 0
                                    ? employee.areaNames.join(" · ")
                                    : employee.currentAreaName ?? "Sin area"}
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
        open={pendingStatusUpdateArea !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatusUpdateArea(null);
          }
        }}
        title="Actualizar estado del area"
        description={
          pendingStatusUpdateArea
            ? `Se ${pendingStatusUpdateArea.isActive ? "activará" : "inactivará"} "${pendingStatusUpdateArea.area.name}".`
            : ""
        }
        confirmLabel="Confirmar cambio"
        variant={pendingStatusUpdateArea?.isActive ? "default" : "destructive"}
        isProcessing={isSubmitting}
        onConfirm={() => {
          if (!pendingStatusUpdateArea) {
            return;
          }
          const { area, isActive } = pendingStatusUpdateArea;
          setPendingStatusUpdateArea(null);
          void handleAreaStatusUpdate(area, isActive);
        }}
      />

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
