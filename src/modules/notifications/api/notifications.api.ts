import { api, API_PREFIX } from "../../../shared/api/api";

export type NotificationStatusFilter = "all" | "unread" | "read";
export type NotificationTypeCode = "area_assignment" | "project_assignment" | "task_assignment";
export type NotificationResourceType = "area" | "project" | "task";

export interface NotificationItem {
  id: number;
  userId: number;
  notificationTypeId: number;
  notificationTypeCode: NotificationTypeCode;
  notificationTypeName: string;
  title: string;
  message: string;
  resourceType: NotificationResourceType | null;
  resourceId: number | null;
  metadata: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  data: {
    notifications: NotificationItem[];
    unreadCount: number;
  };
}

export interface NotificationResponse {
  data: NotificationItem;
}

export interface MarkAllNotificationsReadResponse {
  data: {
    updatedCount: number;
  };
}

const buildNotificationsQuery = (params: {
  status?: NotificationStatusFilter;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  query.set("status", params.status ?? "all");
  query.set("limit", String(params.limit ?? 25));
  return query.toString();
};

export const listNotifications = (params: { status?: NotificationStatusFilter; limit?: number } = {}) =>
  api.get<NotificationsResponse>(`${API_PREFIX}/notifications?${buildNotificationsQuery(params)}`);

export const markNotificationAsRead = (notificationId: number) =>
  api.patch<NotificationResponse>(`${API_PREFIX}/notifications/${notificationId}/read`, {}, {
    toast: {
      successMessage: "Notificacion marcada como leida.",
      errorMessage: "No fue posible marcar la notificacion como leida.",
    },
  });

export const markAllNotificationsAsRead = () =>
  api.patch<MarkAllNotificationsReadResponse>(`${API_PREFIX}/notifications/read-all`, {}, {
    toast: {
      errorMessage: "No fue posible marcar las notificaciones.",
    },
  });
