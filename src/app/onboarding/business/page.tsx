import { redirect } from "next/navigation";

import { createBusiness } from "@/actions/business";
import { createClient } from "@/lib/supabase/server";

type BusinessOnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function BusinessOnboardingPage({
  searchParams,
}: BusinessOnboardingPageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  // Si ya tiene negocio, no tiene sentido repetir onboarding.
  if (business) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            IA Emprendedor
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-gray-900">
            Cuéntanos sobre tu negocio
          </h1>

          <p className="mt-3 text-gray-600">
            Empecemos con la información básica. Después
            profundizaremos durante el diagnóstico.
          </p>

          {error && (
            <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            action={createBusiness}
            className="mt-8 space-y-6"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre del negocio
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={120}
                placeholder="Ej. Panadería San José"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="business_type"
                className="block text-sm font-medium text-gray-700"
              >
                Tipo de negocio
              </label>

              <input
                id="business_type"
                name="business_type"
                type="text"
                placeholder="Ej. Panadería, restaurante, peluquería..."
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Describe brevemente tu negocio
              </label>

              <textarea
                id="description"
                name="description"
                rows={5}
                placeholder="¿Qué vendes, a quién y cómo funciona tu negocio?"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white"
            >
              Continuar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}