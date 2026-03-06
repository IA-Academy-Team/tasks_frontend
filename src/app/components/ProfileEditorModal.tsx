import { useEffect, useState } from "react";
import { Save, UserCircle2 } from "lucide-react";
import { ApiError } from "../../shared/api/api";
import {
  getMyProfile,
  updateMyProfile,
  type UserProfile,
} from "../../modules/users/api/profile.api";
import { useSession } from "../../modules/auth/providers/SessionProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError("");
      setSuccess("");
      try {
        const response = await getMyProfile();
        const nextProfile = response?.data ?? null;
        setProfile(nextProfile);
        setName(nextProfile?.name ?? "");
        setPhoneNumber(nextProfile?.phoneNumber ?? "");
        setImage(nextProfile?.image ?? "");
      } catch (incomingError) {
        if (incomingError instanceof ApiError) {
          setError(incomingError.message);
        } else {
          setError("No fue posible cargar el perfil.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedName = name.trim();
    const normalizedPhone = phoneNumber.trim();
    const normalizedImage = image.trim();

    if (!normalizedName) {
      setError("El nombre es obligatorio.");
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
      setSuccess("Perfil actualizado correctamente.");
      await refreshSession();
    } catch (incomingError) {
      if (incomingError instanceof ApiError) {
        setError(incomingError.message);
      } else {
        setError("No fue posible actualizar el perfil.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="size-5 text-primary" />
            Editar perfil
          </DialogTitle>
          <DialogDescription>
            Actualiza tu información básica de usuario.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-sm text-muted-foreground">Cargando perfil...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="profile-modal-name" className="block text-sm font-semibold text-foreground mb-1.5">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Correo</label>
                <input
                  type="text"
                  value={profile?.email ?? ""}
                  disabled
                  className="app-control bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rol</label>
                <input
                  type="text"
                  value={profile?.role === "admin" ? "Administrador" : "Empleado"}
                  disabled
                  className="app-control bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-modal-phone" className="block text-sm font-semibold text-foreground mb-1.5">
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
              <label htmlFor="profile-modal-image" className="block text-sm font-semibold text-foreground mb-1.5">
                URL de imagen
              </label>
              <input
                id="profile-modal-image"
                type="url"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                className="app-control"
                placeholder="https://..."
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-xl">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="app-btn-primary w-full md:w-auto px-5"
            >
              <Save className="size-4" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
