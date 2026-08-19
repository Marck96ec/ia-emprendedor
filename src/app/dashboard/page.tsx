import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(
        `
          id,
          name,
          business_type,
          description,
          created_at
        `,
      )
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    console.error("BUSINESS_LOAD_ERROR", businessError);

    throw new Error("No pudimos cargar el negocio");
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  const { data: diagnostic, error: diagnosticError } =
    await supabase
      .from("business_diagnostics")
      .select("id")
      .eq("business_id", business.id)
      .maybeSingle();

  if (diagnosticError) {
    console.error(
      "DIAGNOSTIC_LOAD_ERROR",
      diagnosticError,
    );

    throw new Error("No pudimos cargar el diagnóstico");
  }

  if (!diagnostic) {
    redirect("/onboarding/diagnostic");
  }

  const email =
    typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : "Usuario";

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              IA Emprendedor
            </p>

            <h1 className="mt-1 text-3xl font-semibold text-gray-900">
              {business.name}
            </h1>

            {business.business_type && (
              <p className="mt-1 text-gray-600">
                {business.business_type}
              </p>
            )}
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
            <h2 className="text-lg font-semibold text-gray-900">
              Tu negocio está listo
            </h2>

            {business.description ? (
              <p className="mt-2 text-gray-600">
                {business.description}
              </p>
            ) : (
              <p className="mt-2 text-gray-600">
                Ya completaste la información básica de tu negocio.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Diagnóstico inicial completado
            </h2>

            <p className="mt-2 text-gray-600">
              Ya tenemos la información necesaria para comenzar a
              analizar tu negocio.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}