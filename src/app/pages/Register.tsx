import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { user, register, isReady } = useAuth();

  useEffect(() => {
    if (isReady && user) navigate('/', { replace: true });
  }, [isReady, user, navigate]);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void register({
      name: formData.name.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
    });
    setError('El registro self-service no está habilitado en esta fase del proyecto.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(15,118,110,0.14),transparent_30%),radial-gradient(circle_at_95%_20%,rgba(11,110,168,0.14),transparent_34%)] pointer-events-none" />
      <div className="absolute top-[-80px] right-[-60px] w-[320px] h-[320px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-30px] w-[280px] h-[280px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="app-panel overflow-hidden">
          <div className="px-8 py-6 text-center border-b border-border/60 bg-[linear-gradient(130deg,#0d4663_0%,#0f766e_58%,#1f3c67_100%)]">
            <h1 className="text-2xl font-bold text-primary-foreground">Crear cuenta</h1>
            <p className="text-sm text-primary-foreground/90 mt-1">Regístrate para usar Tasks</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-sm font-semibold text-foreground mb-1.5">
                  Nombre completo *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="app-control"
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-username" className="block text-sm font-semibold text-foreground mb-1.5">
                  Usuario *
                </label>
                <input
                  id="reg-username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="app-control"
                  placeholder="nombreusuario"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-sm font-semibold text-foreground mb-1.5">
                  Correo electrónico *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="app-control"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-sm font-semibold text-foreground mb-1.5">
                  Contraseña * (mín. 6 caracteres)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="app-control"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-semibold text-foreground mb-1.5">
                  Confirmar contraseña *
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="app-control"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                className="app-btn-primary w-full py-3"
              >
                <UserPlus className="size-4" />
                Regístrarme
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
