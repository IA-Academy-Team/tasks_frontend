import { useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { ApiError } from "../../shared/api/api";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
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
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("El nombre del area es obligatorio.");
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
    const confirmed = window.confirm(
      `Deseas eliminar el area "${area.name}"? Esta accion solo aplica si no tiene dependencias activas.`,
    );

    if (!confirmed) {
      return;
    }

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
    }
  };

  return (
    <div className="size-full flex flex-col bg-background">
      <div className="bg-primary border-b border-primary/30 px-8 py-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/15">
            <Building2 className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-foreground">Areas</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Gestion de areas operativas
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-auto space-y-6">
        <section className="bg-card rounded-2xl border border-primary/25 p-5 shadow-[0_8px_24px_rgba(2,106,167,0.12)]">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingAreaId ? "Editar area" : "Crear area"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                placeholder="Nombre del area"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Descripcion</label>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                placeholder="Descripcion breve"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="area-is-active"
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              <label htmlFor="area-is-active" className="text-sm text-foreground">
                Area activa
              </label>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-70"
              >
                <Plus className="size-4" />
                {isSubmitting ? "Guardando..." : editingAreaId ? "Actualizar" : "Crear"}
              </button>
              {editingAreaId && (
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
            <h3 className="text-lg font-semibold text-primary">Listado de areas</h3>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AreaStatusFilter)}
              className="px-3 py-2 border border-border rounded-xl bg-input-background"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando areas...</div>
          ) : areas.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay areas para este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Miembros activos</th>
                    <th className="px-4 py-3 text-left">Proyectos activos</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area) => (
                    <tr key={area.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium">{area.name}</p>
                        <p className="text-muted-foreground">{area.description ?? "Sin descripcion"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={area.isActive ? "text-success" : "text-warning"}>
                          {area.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{area.activeMemberCount}</td>
                      <td className="px-4 py-3">{area.activeProjectCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(area)}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Pencil className="size-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDelete(area);
                            }}
                            className="inline-flex items-center gap-1 text-destructive hover:underline"
                          >
                            <Trash2 className="size-4" />
                            Eliminar
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
      </div>
    </div>
  );
}

