import Link from "next/link";

import { resendSignupConfirmation, signup } from "@/actions/auth";
import { PasswordField } from "@/components/password-field";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    status?: "account_exists" | "account_created" | "verification_sent";
  }>;
};

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const { error, message, status } = await searchParams;
  const accountExists = status === "account_exists";
  const confirmationSent =
    status === "account_created" || status === "verification_sent";

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

        {error && <div className="alert-box mt-6" role="alert">{error}</div>}

        {accountExists && (
          <div className="success-box mt-6 space-y-3" role="status">
            <p className="font-semibold">{message ?? "Este correo ya está registrado."}</p>
            <p className="text-sm leading-6">
              Si ya confirmaste tu cuenta, inicia sesión. Si todavía no la
              verificaste, puedes reenviar el correo de confirmación.
            </p>
          </div>
        )}

        {confirmationSent && (
          <div className="success-box mt-6 space-y-3" role="status">
            <p className="font-semibold">📩 ¡Ya casi estás listo!</p>
            <p className="text-sm leading-6">
              Confirma tu correo electrónico para activar tu cuenta. Después,
              inicia sesión y te acompañaremos paso a paso para conocer tu
              negocio, entender tus objetivos y preparar tu primer plan de
              acción con TUCEO IA.
            </p>
          </div>
        )}

        {accountExists ? (
          <div className="mt-6 space-y-4">
            <Link href="/login" className="primary-button w-full">
              Iniciar sesión
            </Link>

            <form action={resendSignupConfirmation} className="space-y-3">
              <div>
                <label htmlFor="resend-email" className="field-label">
                  Correo de la cuenta
                </label>
                <input
                  id="resend-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="form-field"
                  placeholder="tu@negocio.com"
                />
              </div>
              <button type="submit" className="secondary-button w-full">
                Reenviar verificación
              </button>
            </form>

            <Link href="/signup" className="ghost-button w-full">
              Usar otro correo
            </Link>
          </div>
        ) : confirmationSent ? (
          <div className="mt-6 space-y-3">
            <Link href="/login" className="primary-button w-full">
              Ir a iniciar sesión
            </Link>
            <Link href="/signup" className="ghost-button w-full">
              Crear otra cuenta
            </Link>
          </div>
        ) : (
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

            <PasswordField
              id="password"
              name="password"
              label="Contraseña"
              required
              minLength={8}
              autoComplete="new-password"
            />

            <button type="submit" className="primary-button w-full">
              Crear cuenta
            </button>
          </form>
        )}

        {!accountExists && !confirmationSent && (
          <p className="mt-6 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="link-button">
              Inicia sesión
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}