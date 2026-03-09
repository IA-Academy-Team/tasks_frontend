import { useEffect, useState } from "react";
import { Building2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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

export function Areas() {
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<AreaStatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [pendingDeleteArea, setPendingDeleteArea] = useState<AreaSummary | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingAreaId(null);
    setName("");
    setDescription("");
    setIsActive(true);
  };

  const loadAreas = async () => {
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
  };

  useEffect(() => {
    void loadAreas();
  }, [statusFilter]);

  const startEdit = (area: AreaSummary) => {
    setEditingAreaId(area.id);
    setName(area.name);
    setDescription(area.description ?? "");
    setIsActive(area.isActive);
    setSuccess("");
    setError("");
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
      if (editingAreaId) {
        await updateArea(editingAreaId, {
          name: trimmedName,
          description: trimmedDescription || null,
          isActive,
        });
        setSuccess("Area actualizada correctamente.");
      } else {
        await createArea({
          name: trimmedName,
          description: trimmedDescription || null,
          isActive,
        });
        setSuccess("Area creada correctamente.");
      }

      resetForm();
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
              resetForm();
              setError("");
              setSuccess("");
              setIsAreaModalOpen(true);
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
        <section className="app-panel overflow-hidden">
          <div className="app-panel-header">
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
          {success && <p className="p-4 text-sm text-success">{success}</p>}

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando areas...</div>
          ) : areas.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay areas para este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-th">Nombre</th>
                    <th className="app-th">Estado</th>
                    <th className="app-th">Miembros activos</th>
                    <th className="app-th">Proyectos activos</th>
                    <th className="app-th">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area) => (
                    <tr key={area.id} className="app-row">
                      <td className="app-td">
                        <p className="font-medium">{area.name}</p>
                        <p className="text-muted-foreground">{area.description ?? "Sin descripcion"}</p>
                      </td>
                      <td className="app-td">
                        <span className={area.isActive ? "text-success" : "text-warning"}>
                          {area.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="app-td">{area.activeMemberCount}</td>
                      <td className="app-td">{area.activeProjectCount}</td>
                      <td className="app-td">
                        <div className="flex justify-end">
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
                              <DropdownMenuItem onClick={() => startEdit(area)}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={isAreaModalOpen}
        onOpenChange={(open) => {
          setIsAreaModalOpen(open);
          if (!open && !isSubmitting) {
            resetForm();
            setError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAreaId ? "Editar area" : "Crear area"}</DialogTitle>
            <DialogDescription>
              Define la informacion principal del area operativa.
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
