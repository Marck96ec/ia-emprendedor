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
    <main className="ambient-shell flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-6 sm:py-8 lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto max-w-2xl">
        <div className="surface-card rounded-2xl p-5 sm:p-6">
          <p className="badge-chip">IA Emprendedor</p>

          <div className="mt-4">
            <OnboardingProgress currentStep={1} />
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Cuéntanos sobre tu negocio
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-5 text-slate-600">
            Con estas respuestas entenderemos mejor tu negocio y prepararemos las prioridades más importantes para tu primera semana.
          </p>

          {error && <div className="alert-box mt-6">{error}</div>}

          <form action={createBusiness} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  placeholder="Ej. Starbucks"
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
                  placeholder="Ej. cafetería y bebidas"
                  className="form-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="field-label">
                Describe brevemente tu negocio
              </label>

              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="¿Qué vendes, a quién y cómo funciona tu negocio?"
                className="form-field resize-y"
              />
            </div>

            <button type="submit" className="primary-button w-full">
              Presentar mi negocio
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}