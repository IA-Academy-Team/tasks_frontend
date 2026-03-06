import { useState } from 'react';
import { Link } from 'react-router';
import { Mail, ArrowLeft } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(15,118,110,0.14),transparent_30%),radial-gradient(circle_at_95%_20%,rgba(11,110,168,0.14),transparent_34%)] pointer-events-none" />
      <div className="absolute top-[-80px] right-[-60px] w-[320px] h-[320px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="app-panel overflow-hidden">
          <div className="px-8 py-6 text-center border-b border-border/60 bg-[linear-gradient(130deg,#0d4663_0%,#0f766e_58%,#1f3c67_100%)]">
            <div className="inline-flex p-3 rounded-full bg-white/20 mb-3">
              <Mail className="size-8 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-primary-foreground">Recuperar contraseña</h1>
            <p className="text-sm text-primary-foreground/90 mt-1">
              {sent
                ? 'Si existe una cuenta con ese correo, recibirás instrucciones.'
                : 'Ingresa tu correo y te enviaremos un enlace.'}
            </p>
          </div>
          <div className="p-8">
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-semibold text-foreground mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="app-control"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="app-btn-primary w-full py-3"
                >
                  Enviar enlace
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground text-center mb-4">
                Revisa tu bandeja de entrada y la carpeta de spam.
              </p>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-medium"
              >
                <ArrowLeft className="size-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
