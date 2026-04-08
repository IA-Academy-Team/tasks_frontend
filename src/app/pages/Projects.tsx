import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  Archive,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  ListChecks,
  ListFilter,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import { listAreas, type AreaSummary } from "../../modules/areas/api/areas.api";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../../shared/api/api";
import { PageHero } from "../components/PageHero";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { cn } from "../components/ui/utils";

type NormalizedProjectStatus = "active" | "closed" | "unknown";

const getNormalizedProjectStatus = (status: string): NormalizedProjectStatus => {
  const normalized = status.trim().toLowerCase();
  if (normalized === "active" || normalized === "activo") return "active";
  if (normalized === "closed" || normalized === "cerrado") return "closed";
  return "unknown";
};

const getProjectStatusMeta = (status: string) => {
  const normalized = getNormalizedProjectStatus(status);

  if (normalized === "active") {
    return {
      label: "Activo",
      textClassName: "text-success",
      badgeClassName: "border-success/45 bg-success/14 text-success",
      barClassName: "bg-success",
    };
  }

  if (normalized === "closed") {
    return {
      label: "Desactivado",
      textClassName: "text-warning",
      badgeClassName: "border-warning/45 bg-warning/14 text-warning",
      barClassName: "bg-warning",
    };
  }

  return {
    label: status || "Sin estado",
    textClassName: "text-muted-foreground",
    badgeClassName: "border-border/85 bg-secondary/65 text-muted-foreground",
    barClassName: "bg-muted-foreground/45",
  };
};

const parseDate = (dateValue: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return new Date(`${dateValue}T00:00:00`);
  }
  return new Date(dateValue);
};

const formatProjectDate = (dateValue: string | null) => {
  if (!dateValue) {
    return "Sin fecha";
  }

  const parsed = parseDate(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "Sin fecha";
  }

  return parsed.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getProjectRisk = (project: ProjectSummary) => {
  if (getNormalizedProjectStatus(project.status) !== "active" || !project.endDate) {
    return null;
  }

  const dueDate = parseDate(project.endDate);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffInDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    return {
      label: "Retrasado",
      className: "border-destructive/45 bg-destructive/12 text-destructive",
    };
  }

  if (diffInDays <= 7) {
    return {
      label: "Proximo a vencer",
      className: "border-warning/45 bg-warning/14 text-warning",
    };
  }

  return null;
};

export function Projects() {
  const PAGE_SIZE = 6;
  const statusFilterOptions: Array<{
    value: ProjectStatusFilter;
    label: string;
  }> = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "closed", label: "Desactivados" },
  ];

  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<ProjectSummary | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
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

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listProjects({
        status: statusFilter,
        areaId: areaFilter === "all" ? undefined : Number(areaFilter),
      });
      setProjects(response?.data ?? []);
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        toast.error(incomingError.message);
      } else {
        toast.error("No fue posible cargar los proyectos.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [areaFilter, statusFilter]);

  const loadAreas = useCallback(async () => {
    if (!isAdmin) {
      setAreas([]);
      return;
    }

    try {
      const response = await listAreas("all");
      setAreas(response?.data ?? []);
    } catch {
      setAreas([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, areaFilter, searchTerm]);

  const filteredProjects = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return projects;
    }

    return projects.filter((project) => (
      project.name.toLowerCase().includes(normalizedTerm)
      || project.areaName.toLowerCase().includes(normalizedTerm)
      || (project.description ?? "").toLowerCase().includes(normalizedTerm)
      || project.status.toLowerCase().includes(normalizedTerm)
    ));
  }, [projects, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProjects = filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const visibleStart = filteredProjects.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(currentPage * PAGE_SIZE, filteredProjects.length);
  const maxTaskCount = useMemo(
    () => filteredProjects.reduce((max, project) => Math.max(max, project.totalTaskCount), 0) || 1,
    [filteredProjects],
  );

  const startEdit = (project: ProjectSummary) => {
    setEditingProjectId(project.id);
    setAreaId(project.areaId ? String(project.areaId) : "");
    setName(project.name);
    setDescription(project.description ?? "");
    setStartDate(project.startDate ?? "");
    setEndDate(project.endDate ?? "");
    setIsProjectModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const numericAreaId = areaId.trim() ? Number(areaId) : null;

    if (!trimmedName) {
      toast.error("El nombre del proyecto es obligatorio.");
      return;
    }

    if (numericAreaId !== null && (!Number.isInteger(numericAreaId) || numericAreaId <= 0)) {
      toast.error("El area seleccionada no es valida.");
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
      } else {
        await createProject({
          areaId: numericAreaId,
          name: trimmedName,
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
        });
      }

      resetForm();
      setIsProjectModalOpen(false);
      await loadProjects();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        if (incomingError.code === "PROJECT_NAME_ALREADY_EXISTS_IN_AREA") {
          toast.error("Ya existe un proyecto con ese nombre en el area seleccionada.");
          return;
        }

        toast.error(incomingError.message || "No fue posible guardar el proyecto.");
        return;
      }

      toast.error("No fue posible guardar el proyecto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: ProjectSummary) => {
    setIsSubmitting(true);
    try {
      await deleteProject(project.id);
      await loadProjects();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible eliminar el proyecto.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (project: ProjectSummary, status: ProjectStatusUpdate) => {
    setIsSubmitting(true);
    try {
      await updateProjectStatus(project.id, { status });
      await loadProjects();
    } catch (incomingError) {
      if (!(incomingError instanceof ApiError)) {
        toast.error("No fue posible actualizar el estado.");
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
        <section className="space-y-4">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Listado de proyectos</h3>
            </div>

            <div className="flex w-full items-center justify-end gap-2 overflow-x-auto overflow-y-visible px-1 py-1 xl:w-auto xl:overflow-visible">
                {isAdmin && (
                  <div className="relative w-[220px] shrink-0">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={areaFilter}
                      onChange={(event) => setAreaFilter(event.target.value)}
                      className="app-control h-9 pl-9 pr-8"
                      title="Filtrar por area"
                    >
                      <option value="all">Todas las areas</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="app-btn-secondary h-9 shrink-0 px-3.5"
                    >
                      <ListFilter className="size-4 text-muted-foreground" />
                      Estado: {statusFilterOptions.find((option) => option.value === statusFilter)?.label ?? "Todos"}
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuRadioGroup
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as ProjectStatusFilter)}
                    >
                      {statusFilterOptions.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="relative w-[280px] shrink-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="app-control h-9 pl-9"
                    placeholder="Buscar proyecto..."
                  />
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsProjectModalOpen(true);
                    }}
                    className="app-btn-primary size-10 shrink-0 p-0"
                    aria-label="Crear proyecto"
                    title="Crear proyecto"
                  >
                    <Plus className="size-4" />
                  </button>
                )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando proyectos...</div>
          ) : paginatedProjects.length === 0 ? (
            <div className="app-panel app-panel-pad py-10 text-center text-sm text-muted-foreground">
              {searchTerm.trim().length > 0
                ? "No se encontraron proyectos para esta busqueda."
                : "No hay proyectos para este filtro."}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedProjects.map((project) => {
                  const statusMeta = getProjectStatusMeta(project.status);
                  const normalizedStatus = getNormalizedProjectStatus(project.status);
                  const risk = getProjectRisk(project);
                  const taskLoadPercent = Math.min(100, Math.round((project.totalTaskCount / maxTaskCount) * 100));

                  return (
                    <article
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className={cn(
                        "app-panel group cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-primary/45",
                        normalizedStatus === "closed" && "opacity-95",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold", statusMeta.badgeClassName)}>
                            {statusMeta.label}
                          </span>
                          {risk && (
                            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold", risk.className)}>
                              <AlertTriangle className="size-3" />
                              {risk.label}
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(event) => event.stopPropagation()}
                                className="app-btn-secondary size-8 p-0"
                                aria-label={`Acciones de ${project.name}`}
                              >
                                <MoreVertical className="size-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startEdit(project);
                                }}
                              >
                                <Pencil className="size-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {normalizedStatus === "active" && (
                                <DropdownMenuItem
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPendingStatusUpdate({ project, status: "closed" });
                                  }}
                                >
                                  <Archive className="size-4" />
                                  Desactivar
                                </DropdownMenuItem>
                              )}
                              {normalizedStatus !== "active" && (
                                <DropdownMenuItem
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPendingStatusUpdate({ project, status: "active" });
                                  }}
                                >
                                  <CheckCircle2 className="size-4" />
                                  Activar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPendingDeleteProject(project);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="mt-3 min-w-0">
                        <p className="truncate text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                          {project.name}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">{project.areaName}</p>
                      </div>

                      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                        {project.description?.trim() || "Sin descripcion operativa"}
                      </p>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <ListChecks className="size-3.5" />
                            Carga de tareas
                          </span>
                          <span className={cn("font-semibold", statusMeta.textClassName)}>{project.totalTaskCount}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn("h-full rounded-full transition-all", statusMeta.barClassName)}
                            style={{ width: `${taskLoadPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border/85 pt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" />
                          {project.activeMemberCount} miembros
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatProjectDate(project.endDate)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="app-panel app-band flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Mostrando {visibleStart} a {visibleEnd} de {filteredProjects.length} proyectos
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="app-btn-secondary size-9 p-0"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      aria-label="Pagina anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Pagina {currentPage} de {totalPages}
                    </p>
                    <button
                      type="button"
                      className="app-btn-secondary size-9 p-0"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      aria-label="Pagina siguiente"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog
        open={isProjectModalOpen}
        onOpenChange={(open) => {
          setIsProjectModalOpen(open);
          if (!open && !isSubmitting) {
            resetForm();
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
                <option value="">Sin area (opcional)</option>
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

      <Dialog
        open={isProjectDetailModalOpen}
        onOpenChange={(open) => {
          setIsProjectDetailModalOpen(open);
          if (!open) {
            setSelectedProjectForDetail(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del proyecto</DialogTitle>
          </DialogHeader>
          {selectedProjectForDetail ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p><span className="font-medium">Nombre:</span> {selectedProjectForDetail.name}</p>
              <p><span className="font-medium">Area:</span> {selectedProjectForDetail.areaName}</p>
              <p><span className="font-medium">Estado:</span> {selectedProjectForDetail.status}</p>
              <p><span className="font-medium">Descripcion:</span> {selectedProjectForDetail.description ?? "Sin descripcion"}</p>
              <p><span className="font-medium">Inicio:</span> {selectedProjectForDetail.startDate ?? "-"}</p>
              <p><span className="font-medium">Fin:</span> {selectedProjectForDetail.endDate ?? "-"}</p>
              <p><span className="font-medium">Cierre:</span> {selectedProjectForDetail.closedAt ?? "-"}</p>
              <p><span className="font-medium">Miembros activos:</span> {selectedProjectForDetail.activeMemberCount}</p>
              <p><span className="font-medium">Tareas totales:</span> {selectedProjectForDetail.totalTaskCount}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Proyecto no disponible.</p>
          )}
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
            ? `Se eliminara permanentemente "${pendingDeleteProject.name}" junto con las tareas del proyecto. Esta accion no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="destructive"
        isProcessing={isSubmitting}
        confirmDelaySeconds={8}
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
            ? `Se cambiara el estado de "${pendingStatusUpdate.project.name}" a "${
              pendingStatusUpdate.status === "active"
                ? "activo"
                : "desactivado"
            }".`
            : ""
        }
        confirmLabel="Confirmar cambio"
        variant={pendingStatusUpdate?.status === "active" ? "default" : "destructive"}
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
