import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Eye, FolderKanban, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
import { useAuth } from "../context/AuthContext";
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
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
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

  const getProjectStatusClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "active" || normalized === "activo") return "text-success";
    if (normalized === "cancelled" || normalized === "cancelado") return "text-destructive";
    if (normalized === "closed" || normalized === "cerrado") return "text-warning";
    return "text-muted-foreground";
  };

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
    setIsProjectModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const numericAreaId = Number(areaId);

    if (!trimmedName) {
      toast.error("El nombre del proyecto es obligatorio.");
      return;
    }

    if (!Number.isInteger(numericAreaId) || numericAreaId <= 0) {
      toast.error("Debes seleccionar un area valida.");
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
      setIsProjectModalOpen(false);
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
        actions={isAdmin ? (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setError("");
              setSuccess("");
              setIsProjectModalOpen(true);
            }}
            className="app-btn-primary h-10 w-10 p-0"
            aria-label="Crear proyecto"
            title="Crear proyecto"
          >
            <Plus className="size-5" />
          </button>
        ) : undefined}
      />

      <div className="app-content">
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
          {success && <p className="p-4 text-sm text-success">{success}</p>}

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
                      <td className="app-td">
                        <span className={getProjectStatusClass(project.status)}>{project.status}</span>
                      </td>
                      <td className="app-td">{project.activeMemberCount}</td>
                      <td className="app-td">{project.totalTaskCount}</td>
                      <td className="app-td">
                        <p>Inicio: {project.startDate ?? "-"}</p>
                        <p>Fin: {project.endDate ?? "-"}</p>
                      </td>
                      <td className="app-td">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
                                aria-label={`Acciones de ${project.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                                <Eye className="size-4" />
                                Ver detalle
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => startEdit(project)}>
                                    <Pencil className="size-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setPendingStatusUpdate({ project, status: "closed" })}>
                                    Cerrar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setPendingStatusUpdate({ project, status: "cancelled" })}>
                                    Cancelar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setPendingStatusUpdate({ project, status: "active" })}>
                                    Activar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setPendingDeleteProject(project)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </>
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
      </div>

      <Dialog
        open={isProjectModalOpen}
        onOpenChange={(open) => {
          setIsProjectModalOpen(open);
          if (!open && !isSubmitting) {
            resetForm();
            setError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingProjectId ? "Editar proyecto" : "Crear proyecto"}</DialogTitle>
          </DialogHeader>

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
            <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3">
              {editingProjectId && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsProjectModalOpen(false);
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
                {isSubmitting ? "Guardando..." : editingProjectId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
