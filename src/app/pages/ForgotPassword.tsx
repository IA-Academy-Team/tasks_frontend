import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Mail, Shield } from 'lucide-react';
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSent(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(13,111,104,0.11)_0%,rgba(15,111,159,0.08)_55%,rgba(15,36,56,0.06)_100%)]" />
        <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[450px]">
        <div className="rounded-2xl border border-border/90 bg-card/95 p-8 shadow-[var(--shadow-xl)] backdrop-blur-xl md:p-10">
          <div className="mb-5 flex justify-center">
            <div className="rounded-xl bg-primary p-3 text-white shadow-[0_12px_24px_rgba(13,111,104,0.3)]">
              <Shield className="size-7" />
            </div>
          </div>

          <div className="mb-5 text-center">
            <h2 className="text-lg font-semibold text-foreground">Recuperar contraseña</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sent
                ? 'Si existe una cuenta con ese correo, recibirás instrucciones.'
                : 'Ingresa tu correo y te enviaremos un enlace.'}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                    <Mail className="size-5" />
                  </span>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-md pl-11 pr-4"
                    placeholder="nombre@empresa.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-md"
              >
                Enviar enlace
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground">
              Revisa tu bandeja de entrada y la carpeta de spam para continuar.
            </div>
          )}

          <div className="mt-8 border-t border-border/85 pt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeft className="size-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
