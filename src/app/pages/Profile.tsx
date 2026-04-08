import { useEffect, useState } from "react";
import { UserCircle2, Save } from "lucide-react";
import { toast } from "react-toastify";
import { ApiError } from "../../shared/api/api";
import { PageHero } from "../components/PageHero";
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
  const [, setError] = useState("");
  const [, setSuccess] = useState("");

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
    <div className="app-shell">
      <PageHero
        title="Mi perfil"
        subtitle="Actualiza tu informacion basica de usuario"
        icon={<UserCircle2 className="size-5" />}
      />

      <div className="app-content">
        <div className="max-w-2xl app-panel app-panel-pad">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-semibold text-foreground mb-1.5">
                Nombre
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="app-control"
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
                  className="app-control bg-muted text-muted-foreground"
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
                  className="app-control bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-phone" className="block text-sm font-semibold text-foreground mb-1.5">
                Telefono
              </label>
              <input
                id="profile-phone"
                type="text"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="app-control"
                placeholder="+573001234567"
              />
            </div>

            <div>
              <label htmlFor="profile-image" className="block text-sm font-semibold text-foreground mb-1.5">
                URL de imagen
              </label>
              <input
                id="profile-image"
                type="url"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                className="app-control"
                placeholder="https://..."
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="app-btn-primary w-full md:w-auto px-5"
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
