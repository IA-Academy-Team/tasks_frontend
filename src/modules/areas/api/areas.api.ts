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

export const listAreas = (status: AreaStatusFilter) =>
  api.get<AreasResponse>(`${API_PREFIX}/areas?status=${status}`);

export const createArea = (payload: CreateAreaPayload) =>
  api.post<AreaResponse>(`${API_PREFIX}/areas`, payload);

export const updateArea = (areaId: number, payload: UpdateAreaPayload) =>
  api.patch<AreaResponse>(`${API_PREFIX}/areas/${areaId}`, payload);

export const deleteArea = (areaId: number) =>
  api.delete<DeleteAreaResponse>(`${API_PREFIX}/areas/${areaId}`);

