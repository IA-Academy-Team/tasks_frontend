import { useEffect, useState } from "react";
import { UserCircle2, Save } from "lucide-react";
import { ApiError } from "../../shared/api/api";
import {
  getMyProfile,
  updateMyProfile,
  type UserProfile,
} from "../../modules/users/api/profile.api";
import { useSession } from "../../modules/auth/providers/SessionProvider";

export function Profile() {
  const { refreshSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [image, setImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError("");
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
  }, []);

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

  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-background">
      <div className="bg-primary border-b border-primary/30 px-8 py-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/15">
            <UserCircle2 className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-foreground">Mi perfil</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Actualiza tu informacion basica de usuario
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="max-w-2xl bg-card rounded-2xl border border-primary/25 shadow-[0_8px_24px_rgba(2,106,167,0.12)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-foreground mb-1">
                Nombre
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                placeholder="Tu nombre"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Correo
                </label>
                <input
                  type="text"
                  value={profile?.email ?? ""}
                  disabled
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Rol
                </label>
                <input
                  type="text"
                  value={profile?.role === "admin" ? "Administrador" : "Empleado"}
                  disabled
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-phone" className="block text-sm font-medium text-foreground mb-1">
                Telefono
              </label>
              <input
                id="profile-phone"
                type="text"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                placeholder="+573001234567"
              />
            </div>

            <div>
              <label htmlFor="profile-image" className="block text-sm font-medium text-foreground mb-1">
                URL de imagen
              </label>
              <input
                id="profile-image"
                type="url"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
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
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover font-medium transition-colors shadow-md disabled:opacity-70"
            >
              <Save className="size-4" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

