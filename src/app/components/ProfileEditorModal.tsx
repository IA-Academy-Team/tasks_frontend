import { useEffect, useState } from "react";
import { Camera, Mail, Phone, Save, Shield, User, UserCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  getMyProfile,
  updateMyProfile,
  type UserProfile,
} from "../../modules/users/api/profile.api";
import { useSession } from "../../modules/auth/providers/SessionProvider";
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type ProfileEditorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileEditorModal({
  open,
  onOpenChange,
}: ProfileEditorModalProps) {
  const { refreshSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [image, setImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const roleLabel = profile ? (profile.role === "admin" ? "Administrador" : "Empleado") : "Sin rol";
  const initials = (profile?.name ?? "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await getMyProfile();
        const nextProfile = response?.data ?? null;
        setProfile(nextProfile);
        setName(nextProfile?.name ?? "");
        setPhoneNumber(nextProfile?.phoneNumber ?? "");
        setImage(nextProfile?.image ?? "");
      } catch {
        setProfile(null);
        setName("");
        setPhoneNumber("");
        setImage("");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedPhone = phoneNumber.trim();
    const normalizedImage = image.trim();

    if (!normalizedName) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateMyProfile({
        name: normalizedName,
        phoneNumber: normalizedPhone || null,
        image: normalizedImage || null,
      });

      const nextProfile = response?.data ?? null;
      setProfile(nextProfile);
      setName(nextProfile?.name ?? normalizedName);
      setPhoneNumber(nextProfile?.phoneNumber ?? "");
      setImage(nextProfile?.image ?? "");
      await refreshSession();
      onOpenChange(false);
    } catch {
      // El manejo de mensajes de error y exito lo centraliza api.ts con toast.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-border/80 bg-card/95 p-0 shadow-[var(--shadow-xl)] backdrop-blur-sm sm:max-w-xl">
        <DialogHeader className="app-band border-b border-border/80 px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
            <UserCircle2 className="size-5 text-primary" />
            Editar perfil
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Actualiza tu información principal de forma rápida.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Cargando perfil...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
            <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-secondary/45 p-3">
              <span className="relative size-12 overflow-hidden rounded-full border border-border/80 bg-muted/70">
                {image ? (
                  <img src={image} alt={name || "Usuario"} className="size-full object-cover" />
                ) : (
                  <span className="inline-flex size-full items-center justify-center text-sm font-semibold text-foreground">
                    {initials || "U"}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name || "Usuario"}</p>
                <p className="truncate text-xs text-muted-foreground">{profile?.email ?? "Sin correo"}</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary/45 bg-primary/14 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Shield className="size-3.5" />
                {roleLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-modal-name" className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <User className="size-4 text-primary" />
                  Nombre
                </label>
                <input
                  id="profile-modal-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="app-control"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Mail className="size-4 text-primary" />
                  Correo
                </label>
                <input
                  type="text"
                  value={profile?.email ?? ""}
                  disabled
                  className="app-control bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-modal-phone" className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Phone className="size-4 text-primary" />
                  Telefono
                </label>
                <input
                  id="profile-modal-phone"
                  type="text"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="app-control"
                  placeholder="+573001234567"
                />
              </div>
              <div>
                <label htmlFor="profile-modal-image" className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Camera className="size-4 text-primary" />
                  URL de imagen
                </label>
                <input
                  id="profile-modal-image"
                  type="text"
                  value={image}
                  onChange={(event) => setImage(event.target.value)}
                  className="app-control"
                  placeholder="https://... o data:image/png;base64,..."
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border/85 pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="app-btn-secondary"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="app-btn-primary px-5"
              >
                <Save className="size-4" />
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
