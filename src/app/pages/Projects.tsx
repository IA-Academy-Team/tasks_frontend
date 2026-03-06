import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../shared/api/api";
import { PageHero } from "../components/PageHero";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
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
  const [pendingDeleteProject, setPendingDeleteProject] = useState<ProjectSummary | null>(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    project: ProjectSummary;
    status: ProjectStatusUpdate;
  } | null>(null);

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
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (project: ProjectSummary, status: ProjectStatusUpdate) => {
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <PageHero
        title="Proyectos"
        subtitle="Gestion de proyectos por area"
        icon={<FolderKanban className="size-5" />}
      />

      <div className="app-content">
        {isAdmin && (
          <section className="app-panel app-panel-pad">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {editingProjectId ? "Editar proyecto" : "Crear proyecto"}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Area</label>
                <select
                  value={areaId}
                  onChange={(event) => setAreaId(event.target.value)}
                  className="app-control"
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
                <label className="block text-sm font-semibold text-foreground mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="app-control"
                  placeholder="Nombre del proyecto"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Descripcion</label>
                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="app-control"
                  placeholder="Descripcion"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="app-control"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="app-control"
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-btn-primary"
                >
                  <Plus className="size-4" />
                  {isSubmitting ? "Guardando..." : editingProjectId ? "Actualizar" : "Crear"}
                </button>
                {editingProjectId && (
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
        )}

        <section className="app-panel overflow-hidden">
          <div className="app-panel-header">
            <h3 className="text-lg font-semibold text-foreground">Listado de proyectos</h3>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ProjectStatusFilter)}
                className="app-control h-9 min-w-36"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="closed">Cerrados</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <select
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
                className="app-control h-9 min-w-44"
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
              <table className="app-table">
                <thead className="app-table-head">
                  <tr>
                    <th className="app-th">Proyecto</th>
                    <th className="app-th">Area</th>
                    <th className="app-th">Estado</th>
                    <th className="app-th">Miembros</th>
                    <th className="app-th">Tareas</th>
                    <th className="app-th">Fechas</th>
                    <th className="app-th">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="app-row">
                      <td className="app-td">
                        <p className="font-medium">{project.name}</p>
                        <p className="text-muted-foreground">{project.description ?? "Sin descripcion"}</p>
                      </td>
                      <td className="app-td">{project.areaName}</td>
                      <td className="app-td">{project.status}</td>
                      <td className="app-td">{project.activeMemberCount}</td>
                      <td className="app-td">{project.totalTaskCount}</td>
                      <td className="app-td">
                        <p>Inicio: {project.startDate ?? "-"}</p>
                        <p>Fin: {project.endDate ?? "-"}</p>
                      </td>
                      <td className="app-td">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            className="app-action-link"
                          >
                            Ver detalle
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(project)}
                                className="app-action-link inline-flex items-center gap-1"
                              >
                                <Pencil className="size-4" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteProject(project)}
                                className="app-action-link-danger inline-flex items-center gap-1"
                              >
                                <Trash2 className="size-4" />
                                Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingStatusUpdate({ project, status: "closed" })}
                                className="app-action-link"
                              >
                                Cerrar
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingStatusUpdate({ project, status: "cancelled" })}
                                className="app-action-link-danger"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingStatusUpdate({ project, status: "active" })}
                                className="app-action-link"
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

      <ConfirmActionDialog
        open={pendingDeleteProject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteProject(null);
          }
        }}
        title="Eliminar proyecto"
        description={
          pendingDeleteProject
            ? `Se eliminará "${pendingDeleteProject.name}". Si existe historial asociado, el backend lo archivará automáticamente.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="destructive"
        isProcessing={isSubmitting}
        onConfirm={() => {
          if (!pendingDeleteProject) {
            return;
          }
          const projectToDelete = pendingDeleteProject;
          setPendingDeleteProject(null);
          void handleDelete(projectToDelete);
        }}
      />

      <ConfirmActionDialog
        open={pendingStatusUpdate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatusUpdate(null);
          }
        }}
        title="Actualizar estado del proyecto"
        description={
          pendingStatusUpdate
            ? `Se cambiará el estado de "${pendingStatusUpdate.project.name}" a "${pendingStatusUpdate.status}".`
            : ""
        }
        confirmLabel="Confirmar cambio"
        variant={pendingStatusUpdate?.status === "cancelled" ? "destructive" : "default"}
        isProcessing={isSubmitting}
        onConfirm={() => {
          if (!pendingStatusUpdate) {
            return;
          }
          const { project, status } = pendingStatusUpdate;
          setPendingStatusUpdate(null);
          void handleStatusUpdate(project, status);
        }}
      />
    </div>
  );
}
