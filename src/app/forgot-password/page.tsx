import Link from "next/link";

import { requestPasswordReset } from "@/actions/auth";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="ambient-shell flex min-h-screen items-center justify-center px-4">
      <div className="surface-card w-full max-w-md rounded-[2rem] p-6 sm:p-8">
        <p className="badge-chip">TUCEO IA</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          Recuperar contraseña
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Te enviaremos un enlace para crear una nueva contraseña y volver a tu
          negocio.
        </p>

        {error && <div className="alert-box mt-6" role="alert">{error}</div>}
        {message && <div className="success-box mt-6" role="status">{message}</div>}

        <form action={requestPasswordReset} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="field-label">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              className="form-field"
              placeholder="tu@negocio.com"
            />
          </div>
          <button type="submit" className="primary-button w-full">
            Enviar enlace
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/login" className="link-button">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
