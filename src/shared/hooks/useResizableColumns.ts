import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type ColumnWidthMap<K extends string> = Record<K, number>;

type ResizeSession<K extends string> = {
  column: K;
  startX: number;
  startWidth: number;
  minWidth: number;
};

const isBrowser = () => typeof window !== "undefined";

const loadPersistedWidths = <K extends string>(
  initialWidths: ColumnWidthMap<K>,
  storageKey?: string,
): ColumnWidthMap<K> => {
  if (!storageKey || !isBrowser()) {
    return initialWidths;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return initialWidths;
    }

    const parsed = JSON.parse(raw) as Partial<Record<K, unknown>>;
    const next = { ...initialWidths };

    (Object.keys(initialWidths) as K[]).forEach((key) => {
      const value = parsed[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 64) {
        next[key] = value;
      }
    });

    return next;
  } catch {
    return initialWidths;
  }
};

type UseResizableColumnsOptions<K extends string> = {
  initialWidths: ColumnWidthMap<K>;
  defaultMinWidth?: number;
  minWidthsByColumn?: Partial<Record<K, number>>;
  storageKey?: string;
};

export const useResizableColumns = <K extends string>({
  initialWidths,
  defaultMinWidth = 96,
  minWidthsByColumn,
  storageKey,
}: UseResizableColumnsOptions<K>) => {
  const [columnWidths, setColumnWidths] = useState<ColumnWidthMap<K>>(
    () => loadPersistedWidths(initialWidths, storageKey),
  );

  const resizeSessionRef = useRef<ResizeSession<K> | null>(null);

  const stopResize = useCallback(() => {
    resizeSessionRef.current = null;
    if (!isBrowser()) {
      return;
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const resizeSession = resizeSessionRef.current;
    if (!resizeSession) {
      return;
    }

    const deltaX = event.clientX - resizeSession.startX;
    const nextWidth = Math.max(
      resizeSession.minWidth,
      Math.round(resizeSession.startWidth + deltaX),
    );

    setColumnWidths((previous) => {
      if (previous[resizeSession.column] === nextWidth) {
        return previous;
      }

      return {
        ...previous,
        [resizeSession.column]: nextWidth,
      };
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isBrowser()) {
      return;
    }
    window.removeEventListener("mousemove", handleMouseMove);
    stopResize();
  }, [handleMouseMove, stopResize]);

  const startResize = useCallback((column: K, event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startWidth = columnWidths[column];
    const columnMinWidth = minWidthsByColumn?.[column];
    const minWidth = typeof columnMinWidth === "number"
      ? columnMinWidth
      : defaultMinWidth;

    resizeSessionRef.current = {
      column,
      startX: event.clientX,
      startWidth,
      minWidth,
    };

    if (!isBrowser()) {
      return;
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, { once: true });
  }, [columnWidths, defaultMinWidth, handleMouseMove, handleMouseUp, minWidthsByColumn]);

  useEffect(() => {
    if (!storageKey || !isBrowser()) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(columnWidths));
  }, [columnWidths, storageKey]);

  useEffect(() => {
    return () => {
      if (!isBrowser()) {
        return;
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      stopResize();
    };
  }, [handleMouseMove, handleMouseUp, stopResize]);

  return {
    columnWidths,
    setColumnWidths,
    startResize,
  };
};
