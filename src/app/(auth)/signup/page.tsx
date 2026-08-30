import Link from "next/link";

import { signup } from "@/actions/auth";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="ambient-shell flex min-h-screen items-center justify-center px-4">
      <div className="surface-card w-full max-w-md rounded-[2rem] p-6 sm:p-8">
        <p className="badge-chip">IA Emprendedor</p>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          Crear cuenta
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Empieza a construir el plan de tu negocio con IA Emprendedor.
        </p>

        {error && <div className="alert-box mt-6">{error}</div>}
        {message && <div className="success-box mt-6">{message}</div>}

        <form action={signup} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="field-label">
              Correo
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="form-field"
              placeholder="tu@negocio.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Contraseña
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="form-field"
            />
          </div>

          <button type="submit" className="primary-button w-full">
            Crear cuenta
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="link-button">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}