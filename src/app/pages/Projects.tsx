import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../shared/api/api";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
  updateProjectStatus,
  type ProjectStatusFilter,
  type ProjectSummary,
  type ProjectStatusUpdate,
} from "../../modules/projects/api/projects.api";

export function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [areaId, setAreaId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const resetForm = () => {
    setEditingProjectId(null);
    setAreaId("");
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
  };

  const loadProjects = async () => {
    try {
      setError("");
      const response = await listProjects({
        status: statusFilter,
        areaId: areaFilter === "all" ? undefined : Number(areaFilter),
      });
      setProjects(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible cargar los proyectos.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadAreas = async () => {
    try {
      const response = await listAreas("all");
      setAreas(response?.data ?? []);
    } catch {
      setAreas([]);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, [statusFilter, areaFilter]);

  useEffect(() => {
    void loadAreas();
  }, []);

  const startEdit = (project: ProjectSummary) => {
    setEditingProjectId(project.id);
    setAreaId(String(project.areaId));
    setName(project.name);
    setDescription(project.description ?? "");
    setStartDate(project.startDate ?? "");
    setEndDate(project.endDate ?? "");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const numericAreaId = Number(areaId);

    if (!trimmedName) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }

    if (!Number.isInteger(numericAreaId) || numericAreaId <= 0) {
      setError("Debes seleccionar un area valida.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProjectId) {
        await updateProject(editingProjectId, {
          areaId: numericAreaId,
          name: trimmedName,
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
        });
        setSuccess("Proyecto actualizado correctamente.");
      } else {
        await createProject({
          areaId: numericAreaId,
          name: trimmedName,
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
        });
        setSuccess("Proyecto creado correctamente.");
      }

      resetForm();
      await loadProjects();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible guardar el proyecto.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: ProjectSummary) => {
    const confirmed = window.confirm(
      `Deseas eliminar el proyecto "${project.name}"? Si tiene historial se archivara.`,
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    try {
      const response = await deleteProject(project.id);
      const mode = response?.data?.mode ?? "deleted";
      setSuccess(
        mode === "archived"
          ? "Proyecto archivado por historial existente."
          : "Proyecto eliminado.",
      );
      await loadProjects();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible eliminar el proyecto.");
      }
    }
  };

  const handleStatusUpdate = async (project: ProjectSummary, status: ProjectStatusUpdate) => {
    const confirmed = window.confirm(`Deseas cambiar el estado de "${project.name}" a ${status}?`);
    if (!confirmed) return;

    setError("");
    setSuccess("");
    try {
      await updateProjectStatus(project.id, { status });
      setSuccess("Estado del proyecto actualizado.");
      await loadProjects();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible actualizar el estado.");
      }
    }
  };

  return (
    <div className="size-full flex flex-col bg-background">
      <div className="bg-primary border-b border-primary/30 px-8 py-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/15">
            <FolderKanban className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-foreground">Proyectos</h2>
            <p className="text-sm text-white/90 mt-0.5">Gestion de proyectos por area</p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-auto space-y-6">
        {isAdmin && (
          <section className="bg-card rounded-2xl border border-primary/25 p-5 shadow-[0_8px_24px_rgba(2,106,167,0.12)]">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {editingProjectId ? "Editar proyecto" : "Crear proyecto"}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Area</label>
                <select
                  value={areaId}
                  onChange={(event) => setAreaId(event.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-input-background"
                >
                  <option value="">Selecciona un area</option>
                  {areas.filter((area) => area.isActive).map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-input-background"
                  placeholder="Nombre del proyecto"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Descripcion</label>
                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-input-background"
                  placeholder="Descripcion"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-input-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-input-background"
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-70"
                >
                  <Plus className="size-4" />
                  {isSubmitting ? "Guardando..." : editingProjectId ? "Actualizar" : "Crear"}
                </button>
                {editingProjectId && (
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
        )}

        <section className="bg-card rounded-2xl border border-primary/25 overflow-hidden shadow-[0_8px_24px_rgba(2,106,167,0.12)]">
          <div className="px-5 py-4 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-primary">Listado de proyectos</h3>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ProjectStatusFilter)}
                className="px-3 py-2 border border-border rounded-xl bg-input-background"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="closed">Cerrados</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <select
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
                className="px-3 py-2 border border-border rounded-xl bg-input-background"
              >
                <option value="all">Todas las areas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && !isAdmin && <p className="p-4 text-sm text-destructive">{error}</p>}
          {success && !isAdmin && <p className="p-4 text-sm text-success">{success}</p>}

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando proyectos...</div>
          ) : projects.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay proyectos para este filtro.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="px-4 py-3 text-left">Proyecto</th>
                    <th className="px-4 py-3 text-left">Area</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Miembros</th>
                    <th className="px-4 py-3 text-left">Tareas</th>
                    <th className="px-4 py-3 text-left">Fechas</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium">{project.name}</p>
                        <p className="text-muted-foreground">{project.description ?? "Sin descripcion"}</p>
                      </td>
                      <td className="px-4 py-3">{project.areaName}</td>
                      <td className="px-4 py-3">{project.status}</td>
                      <td className="px-4 py-3">{project.activeMemberCount}</td>
                      <td className="px-4 py-3">{project.totalTaskCount}</td>
                      <td className="px-4 py-3">
                        <p>Inicio: {project.startDate ?? "-"}</p>
                        <p>Fin: {project.endDate ?? "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            className="text-primary hover:underline"
                          >
                            Ver detalle
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(project)}
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <Pencil className="size-4" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleDelete(project);
                                }}
                                className="inline-flex items-center gap-1 text-destructive hover:underline"
                              >
                                <Trash2 className="size-4" />
                                Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleStatusUpdate(project, "closed");
                                }}
                                className="text-warning hover:underline"
                              >
                                Cerrar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleStatusUpdate(project, "cancelled");
                                }}
                                className="text-destructive hover:underline"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleStatusUpdate(project, "active");
                                }}
                                className="text-success hover:underline"
                              >
                                Activar
                              </button>
                            </>
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
