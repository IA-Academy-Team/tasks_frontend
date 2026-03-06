import { useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { ApiError } from "../../shared/api/api";
import { PageHero } from "../components/PageHero";
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
    <div className="app-shell">
      <PageHero
        title="Areas"
        subtitle="Gestion de areas operativas"
        icon={<Building2 className="size-5" />}
      />

      <div className="app-content">
        <section className="app-panel app-panel-pad">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingAreaId ? "Editar area" : "Crear area"}
          </h3>
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
                className="app-btn-primary"
              >
                <Plus className="size-4" />
                {isSubmitting ? "Guardando..." : editingAreaId ? "Actualizar" : "Crear"}
              </button>
              {editingAreaId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="app-btn-secondary"
                >
                  Cancelar edicion
                </button>
              )}
            </div>
          </form>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          {success && <p className="mt-4 text-sm text-success">{success}</p>}
        </section>

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
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(area)}
                            className="app-action-link inline-flex items-center gap-1"
                          >
                            <Pencil className="size-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDelete(area);
                            }}
                            className="app-action-link-danger inline-flex items-center gap-1"
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
