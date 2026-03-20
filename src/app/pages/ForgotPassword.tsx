import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Mail, Shield } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSent(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background-light dark:bg-background-dark px-4 py-8 flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(80,72,229,0.16)_0%,rgba(8,16,40,0.65)_55%,rgba(8,16,40,0.9)_100%)]" />
        <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[450px]">
        <div className="rounded-2xl border border-slate-200/70 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 rounded-xl bg-primary p-3 text-white shadow-[0_12px_24px_rgba(80,72,229,0.3)]">
              <Shield className="size-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Tasks</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Plataforma profesional de gestión operativa
            </p>
          </div>

          <div className="mb-5 text-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recuperar contraseña</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {sent
                ? 'Si existe una cuenta con ese correo, recibirás instrucciones.'
                : 'Ingresa tu correo y te enviaremos un enlace.'}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="size-5" />
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/35 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
                    placeholder="nombre@empresa.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Enviar enlace
                <ArrowRight className="ml-2 size-4" />
              </button>
            </form>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              Revisa tu bandeja de entrada y la carpeta de spam para continuar.
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center dark:border-slate-800">
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
