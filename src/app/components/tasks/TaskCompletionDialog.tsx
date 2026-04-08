import { useEffect, useMemo, useState } from "react";
import { Clock3, FileText, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type CompletionPayload = {
  actualMinutes: number;
  completionEvidence: string | null;
};

type TaskCompletionDialogProps = {
  open: boolean;
  taskTitle: string;
  initialActualMinutes?: number | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: CompletionPayload) => Promise<void>;
};

export function TaskCompletionDialog({
  open,
  taskTitle,
  initialActualMinutes = null,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: TaskCompletionDialogProps) {
  const [actualMinutesInput, setActualMinutesInput] = useState("");
  const [completionEvidence, setCompletionEvidence] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setActualMinutesInput(initialActualMinutes && initialActualMinutes > 0 ? String(initialActualMinutes) : "");
    setCompletionEvidence("");
    setError("");
  }, [open, initialActualMinutes]);

  const parsedActualMinutes = useMemo(() => {
    const numericValue = Number(actualMinutesInput);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return null;
    }
    return Math.round(numericValue);
  }, [actualMinutesInput]);

  const handleConfirm = async () => {
    if (parsedActualMinutes === null) {
      setError("Debes registrar el tiempo real en minutos para terminar la tarea.");
      return;
    }

    if (completionEvidence.length > 5000) {
      setError("La evidencia no puede superar 5000 caracteres.");
      return;
    }

    setError("");
    await onConfirm({
      actualMinutes: parsedActualMinutes,
      completionEvidence: completionEvidence.trim() ? completionEvidence.trim() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirmar finalización de tarea</DialogTitle>
          <DialogDescription>
            Registra el tiempo real para cerrar la tarea
            {" "}
            <span className="font-medium text-foreground">"{taskTitle}"</span>.
            Puedes adjuntar evidencia en texto de forma opcional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Tiempo real invertido (minutos)</label>
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                min={1}
                step={1}
                value={actualMinutesInput}
                inputMode="numeric"
                pattern="[0-9]*"
                onKeyDown={(event) => {
                  if (["e", "E", "+", "-", "."].includes(event.key)) {
                    event.preventDefault();
                  }
                }}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/\D/g, "");
                  setActualMinutesInput(digitsOnly);
                }}
                className="app-control pl-9"
                placeholder="Ej: 95"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Evidencia (opcional)</label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <textarea
                value={completionEvidence}
                onChange={(event) => setCompletionEvidence(event.target.value)}
                className="app-control min-h-[110px] pl-9"
                placeholder="Describe o pega enlace de evidencia (ej. acta, captura, URL, comentario final)."
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="app-btn-secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="app-btn-primary"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting}
            >
              <Save className="size-4" />
              {isSubmitting ? "Guardando..." : "Finalizar tarea"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
