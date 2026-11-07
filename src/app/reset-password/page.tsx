import Link from "next/link";

import { updatePassword } from "@/actions/auth";
import { PasswordField } from "@/components/password-field";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { error } = await searchParams;

  return (
    <main className="ambient-shell flex min-h-screen items-center justify-center px-4">
      <div className="surface-card w-full max-w-md rounded-[2rem] p-6 sm:p-8">
        <p className="badge-chip">TUCEO IA</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          Crea una nueva contraseña
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Elige una contraseña segura para volver a entrar a tu negocio.
        </p>

        {error && <div className="alert-box mt-6" role="alert">{error}</div>}

        <form action={updatePassword} className="mt-6 space-y-5">
          <PasswordField
            id="password"
            name="password"
            label="Nueva contraseña"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
          />
          <PasswordField
            id="confirmation"
            name="confirmation"
            label="Repite la contraseña"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button type="submit" className="primary-button w-full">
            Guardar contraseña
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="link-button">Volver a iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
