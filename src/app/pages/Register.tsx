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
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-card rounded-2xl shadow-xl border border-primary/20 overflow-hidden">
          <div className="bg-primary px-8 py-6 text-center">
            <h1 className="text-2xl font-bold text-primary-foreground">Crear cuenta</h1>
            <p className="text-sm text-white/90 mt-1">Regístrate para usar Tasks</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-foreground mb-1">
                  Nombre completo *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-username" className="block text-sm font-medium text-foreground mb-1">
                  Usuario *
                </label>
                <input
                  id="reg-username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                  placeholder="nombreusuario"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-foreground mb-1">
                  Correo electrónico *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-foreground mb-1">
                  Contraseña * (mín. 6 caracteres)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-foreground mb-1">
                  Confirmar contraseña *
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-input-background"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover font-medium transition-colors shadow-md"
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
