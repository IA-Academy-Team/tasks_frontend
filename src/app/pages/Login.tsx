import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { ApiError } from '../../shared/api/api';
import { getDefaultRouteForRole } from '../../modules/auth/lib/auth-routing';
import { toast } from "react-toastify";

export function Login() {
  const navigate = useNavigate();
  const { user, login, isReady } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isReady && user) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [isReady, user, navigate]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const validateLoginInput = (rawEmail: string, rawPassword: string): string | null => {
    const trimmedEmail = rawEmail.trim();
    const trimmedPassword = rawPassword.trim();

    if (!trimmedEmail && !trimmedPassword) {
      return 'Debes ingresar tu correo electrónico y tu contraseña.';
    }

    if (!trimmedEmail) {
      return 'Debes ingresar tu correo electrónico.';
    }

    if (!trimmedPassword) {
      return 'Debes ingresar tu contraseña.';
    }

    if (trimmedEmail.includes(' ')) {
      return 'El correo electrónico no debe contener espacios.';
    }

    const atIndex = trimmedEmail.indexOf('@');
    if (atIndex === -1) {
      return "El correo debe incluir '@' y un dominio. Ejemplo: usuario@dominio.com.";
    }

    const localPart = trimmedEmail.slice(0, atIndex);
    const domainPart = trimmedEmail.slice(atIndex + 1);

    if (!localPart) {
      return "Antes de '@' debes escribir tu usuario de correo.";
    }

    if (!domainPart) {
      return "Falta el dominio del correo después de '@'.";
    }

    if (!domainPart.includes('.')) {
      return 'El dominio del correo debe incluir un punto. Ejemplo: dominio.com.';
    }

    if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
      return 'El dominio del correo no puede iniciar ni terminar con punto.';
    }

    return null;
  };

  const mapAuthError = (incomingError: unknown) => {
    if (incomingError instanceof ApiError) {
      const normalizedMessage = incomingError.message.trim().toLowerCase();

      if (incomingError.code === 'EMAIL_DOMAIN_NOT_ALLOWED') {
        return 'Tu correo no tiene permiso para iniciar sesión en este entorno.';
      }

      if (incomingError.code === 'INVALID_CREDENTIALS' || normalizedMessage === 'invalid email or password') {
        return 'Correo o contraseña incorrectos.';
      }

      return incomingError.message;
    }

    return 'No fue posible iniciar sesión. Intenta nuevamente.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateLoginInput(email, password);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setIsSubmitting(true);

    try {
      const authenticatedUser = await login(normalizedEmail, password);
      if (!authenticatedUser) {
        toast.error('No fue posible recuperar tu sesión después del login.');
        return;
      }

      navigate(getDefaultRouteForRole(authenticatedUser.role), { replace: true });
    } catch (incomingError) {
      toast.error(mapAuthError(incomingError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(13,111,104,0.11)_0%,rgba(15,111,159,0.08)_55%,rgba(15,36,56,0.06)_100%)]" />
        <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[450px]">
        <div className="rounded-2xl border border-border/85 bg-card/95 p-8 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 rounded-xl bg-primary p-3 text-white shadow-[0_12px_24px_rgba(13,111,104,0.3)]">
              <Shield className="size-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Tasks</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Plataforma profesional de gestión operativa
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-user" className="mb-1.5 block text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Mail className="size-5" />
                </span>
                <input
                  id="login-user"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/35"
                  placeholder="nombre@empresa.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="block text-sm font-medium text-foreground">
                  Contraseña
                </label>
                <Link
                  to="/recuperar-contraseña"
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="size-5" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-border bg-background py-3 pl-11 pr-12 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/35"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span className="text-xs text-muted-foreground">Mantener sesión activa</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
            >
              {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
              <ArrowRight className="ml-2 size-4" />
            </button>
          </form>

          <div className="mt-8 border-t border-border/85 pt-6">
            <p className="text-center text-sm text-muted-foreground">
              ¿Necesitas acceso?{" "}
              <span className="font-semibold text-primary">Contacta al administrador</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
