import { api, API_PREFIX } from "../../../shared/api/api";

export type AreaStatusFilter = "all" | "active" | "inactive";

export interface AreaSummary {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  activeMemberCount: number;
  activeProjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AreaResponse {
  data: AreaSummary;
}

export interface AreasResponse {
  data: AreaSummary[];
}

export interface DeleteAreaResponse {
  data: {
    id: number;
    mode: "deleted" | "archived";
  };
}

export interface CreateAreaPayload {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateAreaPayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateAreaStatusPayload {
  isActive: boolean;
}

export const listAreas = (status: AreaStatusFilter) =>
  api.get<AreasResponse>(`${API_PREFIX}/areas?status=${status}`);

export const createArea = (payload: CreateAreaPayload) =>
  api.post<AreaResponse>(`${API_PREFIX}/areas`, payload, {
    toast: {
      successMessage: "Area creada correctamente.",
      errorMessage: "No fue posible crear el area.",
    },
  });

export const updateArea = (areaId: number, payload: UpdateAreaPayload) =>
  api.patch<AreaResponse>(`${API_PREFIX}/areas/${areaId}`, payload, {
    toast: {
      successMessage: "Area actualizada correctamente.",
      errorMessage: "No fue posible actualizar el area.",
    },
  });

export const updateAreaStatus = (areaId: number, payload: UpdateAreaStatusPayload) =>
  api.patch<AreaResponse>(`${API_PREFIX}/areas/${areaId}/status`, payload, {
    toast: {
      successMessage: payload.isActive ? "Area activada correctamente." : "Area inactivada correctamente.",
      errorMessage: "No fue posible actualizar el estado del area.",
    },
  });

export const deleteArea = (areaId: number) =>
  api.delete<DeleteAreaResponse>(`${API_PREFIX}/areas/${areaId}`, {
    toast: {
      successMessage: "Area procesada correctamente.",
      errorMessage: "No fue posible eliminar el area.",
    },
  });
