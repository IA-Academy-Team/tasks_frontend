import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';
import { ApiError } from '../../shared/api/api';
import { getDefaultRouteForRole } from '../../modules/auth/lib/auth-routing';

export function Login() {
  const navigate = useNavigate();
  const { user, login, isReady } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && user) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [isReady, user, navigate]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mapAuthError = (incomingError: unknown) => {
    if (incomingError instanceof ApiError) {
      if (incomingError.code === 'USER_INACTIVE') {
        return 'Tu cuenta está inactiva. Contacta a un administrador.';
      }

      if (incomingError.code === 'EMAIL_DOMAIN_NOT_ALLOWED') {
        return 'Tu correo no tiene permiso para iniciar sesión en este entorno.';
      }

      return incomingError.message;
    }

    return 'No fue posible iniciar sesión. Intenta nuevamente.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Completa correo y contraseña');
      return;
    }

    setIsSubmitting(true);

    try {
      const authenticatedUser = await login(email.trim(), password);
      if (!authenticatedUser) {
        setError('No fue posible recuperar tu sesión después del login.');
        return;
      }

      navigate(getDefaultRouteForRole(authenticatedUser.role), { replace: true });
    } catch (incomingError) {
      setError(mapAuthError(incomingError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(15,118,110,0.14),transparent_30%),radial-gradient(circle_at_95%_20%,rgba(11,110,168,0.14),transparent_34%)] pointer-events-none" />
      <div className="absolute top-[-80px] right-[-60px] w-[320px] h-[320px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-30px] w-[280px] h-[280px] rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="app-panel overflow-hidden">
          <div className="px-8 py-6 text-center border-b border-border/60 bg-[linear-gradient(130deg,#0d4663_0%,#0f766e_58%,#1f3c67_100%)]">
            <h1 className="text-2xl font-bold text-primary-foreground">Tasks</h1>
            <p className="text-sm text-primary-foreground/90 mt-1">Inicia sesión en tu cuenta</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-user" className="block text-sm font-semibold text-foreground mb-1.5">
                  Correo electrónico
                </label>
                <input
                  id="login-user"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-control"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-foreground mb-1.5">
                  Contraseña
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-control"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="app-btn-primary w-full py-3"
              >
                <LogIn className="size-4" />
                {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm">
              <p>
                <Link
                  to="/recuperar-contraseña"
                  className="app-auth-link"
                >
                  Recuperar contraseña
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
