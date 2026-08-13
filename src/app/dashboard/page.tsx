import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "Usuario";

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">IA Emprendedor</p>

            <h1 className="mt-1 text-3xl font-semibold text-gray-900">
              Dashboard
            </h1>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800"
            >
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Sesión iniciada como
          </p>

          <p className="mt-1 font-medium text-gray-900">
            {email}
          </p>

          <div className="mt-8 rounded-xl bg-gray-50 p-6">
            <h2 className="font-semibold text-gray-900">
              Próximo paso
            </h2>

            <p className="mt-2 text-gray-600">
              Aquí construiremos el onboarding de tu negocio.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}