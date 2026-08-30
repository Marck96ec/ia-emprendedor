import { redirect } from "next/navigation";

import { createBusiness } from "@/actions/business";
import { OnboardingProgress } from "@/components/onboarding-progress";
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
    <main className="ambient-shell min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="surface-card rounded-[2rem] p-5 sm:p-8">
          <p className="badge-chip">IA Emprendedor</p>

          <div className="mt-6">
            <OnboardingProgress currentStep={1} />
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            Cuéntanos sobre tu negocio
          </h1>

          <p className="mt-3 text-slate-600">
            Empecemos con la información básica de tu negocio. Te tomará solo unos minutos completar todo el proceso y recibir tu primera semana de prioridades.
          </p>

          {error && <div className="alert-box mt-6">{error}</div>}

          <form action={createBusiness} className="mt-8 space-y-6">
            <div>
              <label htmlFor="name" className="field-label">
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
                className="form-field"
              />
            </div>

            <div>
              <label htmlFor="business_type" className="field-label">
                Tipo de negocio
              </label>

              <input
                id="business_type"
                name="business_type"
                type="text"
                placeholder="Ej. Panadería, restaurante, peluquería..."
                className="form-field"
              />
            </div>

            <div>
              <label htmlFor="description" className="field-label">
                Describe brevemente tu negocio
              </label>

              <textarea
                id="description"
                name="description"
                rows={5}
                placeholder="¿Qué vendes, a quién y cómo funciona tu negocio?"
                className="form-field resize-y"
              />
            </div>

            <button type="submit" className="primary-button w-full">
              Continuar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}