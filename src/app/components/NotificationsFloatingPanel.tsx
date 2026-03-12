import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, FolderKanban, ListTodo, MapPinned, X } from "lucide-react";
import { useNavigate } from "react-router";
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "../../modules/notifications/api/notifications.api";
import {
  disconnectNotificationsSocket,
  getNotificationsSocket,
  type NotificationCreatedRealtimeEvent,
  type NotificationReadRealtimeEvent,
  type NotificationsReadAllRealtimeEvent,
} from "../../modules/notifications/realtime/notifications.socket";
import { useAuth } from "../context/AuthContext";

const formatNotificationDate = (value: string) => (
  new Date(value).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object"
  && value !== null
);

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return null;
};

export function NotificationsFloatingPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (withLoading = true) => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (withLoading) {
      setIsLoading(true);
    }

    try {
      const response = await listNotifications({ status: "all", limit: 25 });
      const result = response?.data;

      setNotifications(result?.notifications ?? []);
      setUnreadCount(result?.unreadCount ?? 0);
    } catch {
      // Toast feedback is handled in the shared API layer.
    } finally {
      if (withLoading) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      disconnectNotificationsSocket();
      return;
    }

    void fetchNotifications();
    const socket = getNotificationsSocket();

    const handleNotificationCreated = (event: NotificationCreatedRealtimeEvent) => {
      setNotifications((current) => {
        const next = [event.notification, ...current.filter((item) => item.id !== event.notification.id)];
        return next.slice(0, 25);
      });
      setUnreadCount(event.unreadCount);
    };

    const handleNotificationRead = (event: NotificationReadRealtimeEvent) => {
      setNotifications((current) => current.map((item) => (
        item.id === event.notificationId
          ? { ...item, isRead: true, readAt: event.readAt }
          : item
      )));
      setUnreadCount(event.unreadCount);
    };

    const handleNotificationsReadAll = (event: NotificationsReadAllRealtimeEvent) => {
      setNotifications((current) => current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt ?? event.readAt,
      })));
      setUnreadCount(event.unreadCount);
    };

    const handleSocketConnect = () => {
      void fetchNotifications(false);
    };

    socket.on("connect", handleSocketConnect);
    socket.on("notifications:new", handleNotificationCreated);
    socket.on("notifications:read", handleNotificationRead);
    socket.on("notifications:read-all", handleNotificationsReadAll);
    socket.connect();

    return () => {
      socket.off("connect", handleSocketConnect);
      socket.off("notifications:new", handleNotificationCreated);
      socket.off("notifications:read", handleNotificationRead);
      socket.off("notifications:read-all", handleNotificationsReadAll);
      disconnectNotificationsSocket();
    };
  }, [fetchNotifications, userId]);

  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [fetchNotifications, isOpen, userId]);

  const hasUnreadNotifications = unreadCount > 0;

  const handleOpenResource = (notification: NotificationItem) => {
    if (notification.resourceType === "task") {
      let projectId: number | null = null;
      let taskId: number | null = notification.resourceId;

      if (isRecord(notification.metadata)) {
        projectId = toNumberOrNull(notification.metadata.projectId);
        taskId = toNumberOrNull(notification.metadata.taskId) ?? taskId;
      }

      if (projectId && taskId) {
        navigate(`/projects/${projectId}?taskId=${taskId}`);
        setIsOpen(false);
        return;
      }
    }

    if (notification.resourceType === "project") {
      const projectId = notification.resourceId;
      if (projectId) {
        navigate(`/projects/${projectId}`);
        setIsOpen(false);
        return;
      }
    }

    if (notification.resourceType === "area") {
      if (user?.role === "admin") {
        navigate("/areas");
      } else {
        navigate("/app/employee/dashboard");
      }
      setIsOpen(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const response = await markNotificationAsRead(notificationId);
      const updated = response?.data;
      if (!updated) {
        return;
      }

      setNotifications((current) => current.map((item) => (
        item.id === notificationId ? updated : item
      )));
      void fetchNotifications(false);
    } catch {
      // Toast feedback is handled in the shared API layer.
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);

    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      })));
      setUnreadCount(0);
      void fetchNotifications(false);
    } catch {
      // Toast feedback is handled in the shared API layer.
    } finally {
      setIsMarkingAll(false);
    }
  };

  const notificationIcon = useMemo(() => ({
    task_assignment: <ListTodo className="size-4 text-primary" />,
    project_assignment: <FolderKanban className="size-4 text-primary" />,
    area_assignment: <MapPinned className="size-4 text-primary" />,
  }), []);

  if (!user) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-20 right-8 z-[1250] inline-flex size-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-[0_10px_24px_rgba(16,36,58,0.18)] transition-all hover:bg-secondary hover:scale-[1.02] mb-2"
        aria-label="Abrir panel de notificaciones"
        title="Notificaciones"
      >
        <Bell className="size-5" />
        {hasUnreadNotifications && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section className="fixed bottom-[5.25rem] right-8 z-[1250] w-[22rem] rounded-2xl border border-border bg-card shadow-[0_18px_40px_rgba(16,36,58,0.24)]">
          <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-foreground">Notificaciones</p>
              <p className="text-xs text-muted-foreground">
                {hasUnreadNotifications ? `${unreadCount} sin leer` : "Todo al dia"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  void handleMarkAllAsRead();
                }}
                disabled={isMarkingAll || !hasUnreadNotifications}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-55"
                title="Marcar todas como leidas"
              >
                <CheckCheck className="size-3.5" />
                Todas
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Cerrar panel de notificaciones"
              >
                <X className="size-4" />
              </button>
            </div>
          </header>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Cargando notificaciones...</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No hay notificaciones para mostrar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`px-3 py-2.5 transition-colors ${
                      notification.isRead ? "bg-card" : "bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 rounded-md bg-secondary p-1">
                        {notificationIcon[notification.notificationTypeCode]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-foreground">{notification.title}</p>
                          {!notification.isRead && (
                            <span className="size-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {formatNotificationDate(notification.createdAt)}
                          </span>
                          <div className="flex items-center gap-1">
                            {notification.resourceType && (
                              <button
                                type="button"
                                onClick={() => handleOpenResource(notification)}
                                className="rounded-md px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
                              >
                                Ver
                              </button>
                            )}
                            {!notification.isRead && (
                              <button
                                type="button"
                                onClick={() => {
                                  void handleMarkAsRead(notification.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-foreground hover:bg-secondary"
                              >
                                <Check className="size-3" />
                                Leida
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </>
  );
}
