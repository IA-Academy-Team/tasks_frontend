import { io, type Socket } from "socket.io-client";
import { API_URL } from "../../../shared/api/api";
import type { NotificationItem } from "../api/notifications.api";

export interface NotificationCreatedRealtimeEvent {
  notification: NotificationItem;
  unreadCount: number;
  issuedAt: string;
}

export interface NotificationReadRealtimeEvent {
  notificationId: number;
  readAt: string;
  unreadCount: number;
  issuedAt: string;
}

export interface NotificationsReadAllRealtimeEvent {
  readAt: string;
  unreadCount: number;
  issuedAt: string;
}

export interface TaskRealtimeEvent {
  task?: {
    id: number;
    projectId: number;
  };
  taskId?: number;
  issuedAt: string;
}

export interface AnalyticsUpdatedRealtimeEvent {
  entity: "task" | "project" | "employee" | "area";
  action: string;
  issuedAt: string;
}

interface NotificationsServerToClientEvents {
  "notifications:new": (payload: NotificationCreatedRealtimeEvent) => void;
  "notifications:read": (payload: NotificationReadRealtimeEvent) => void;
  "notifications:read-all": (payload: NotificationsReadAllRealtimeEvent) => void;
  "task:created": (payload: TaskRealtimeEvent) => void;
  "task:updated": (payload: TaskRealtimeEvent) => void;
  "task:deleted": (payload: TaskRealtimeEvent) => void;
  "analytics:updated": (payload: AnalyticsUpdatedRealtimeEvent) => void;
}

type NotificationsSocket = Socket<NotificationsServerToClientEvents>;

let notificationsSocket: NotificationsSocket | null = null;

export const getNotificationsSocket = (): NotificationsSocket => {
  if (notificationsSocket) {
    return notificationsSocket;
  }

  const socketServerUrl = typeof API_URL === "string" ? API_URL : undefined;

  notificationsSocket = io(socketServerUrl, {
    path: "/socket.io",
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket", "polling"],
  });

  return notificationsSocket;
};

export const disconnectNotificationsSocket = () => {
  if (!notificationsSocket) {
    return;
  }

  notificationsSocket.removeAllListeners();
  notificationsSocket.disconnect();
  notificationsSocket = null;
};
