import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { generateCEOPlanAction } from "@/actions/ceo-plan";
import { CEOPlanSchema } from "@/lib/ai/ceo-agent";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const {
    error: pageError,
    message,
  } = await searchParams;

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
    console.error(
      "BUSINESS_LOAD_ERROR",
      businessError,
    );

    throw new Error(
      "No pudimos cargar el negocio",
    );
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  const {
    data: diagnostic,
    error: diagnosticError,
  } = await supabase
    .from("business_diagnostics")
    .select("id")
    .eq("business_id", business.id)
    .maybeSingle();

  if (diagnosticError) {
    console.error(
      "DIAGNOSTIC_LOAD_ERROR",
      diagnosticError,
    );

    throw new Error(
      "No pudimos cargar el diagnóstico",
    );
  }

  if (!diagnostic) {
    redirect("/onboarding/diagnostic");
  }

  /*
   * Obtener plan del CEO IA.
   */
  const {
    data: ceoPlan,
    error: ceoPlanError,
  } = await supabase
    .from("ceo_plans")
    .select(
      `
        id,
        status,
        executive_summary,
        diagnosis,
        priorities,
        weekly_plan,
        model,
        generated_at
      `,
    )
    .eq("business_id", business.id)
    .maybeSingle();

  if (ceoPlanError) {
    console.error(
      "CEO_PLAN_LOAD_ERROR",
      ceoPlanError,
    );

    throw new Error(
      "No pudimos cargar el plan del CEO IA",
    );
  }

  /*
   * Validación defensiva de lo guardado en JSONB.
   */
  const parsedCEOPlan =
    ceoPlan?.status === "ready"
      ? CEOPlanSchema.safeParse({
          executive_summary:
            ceoPlan.executive_summary,

          diagnosis:
            ceoPlan.diagnosis,

          priorities:
            ceoPlan.priorities,

          weekly_plan:
            ceoPlan.weekly_plan,
        })
      : null;

  const readyPlan =
    parsedCEOPlan?.success
      ? parsedCEOPlan.data
      : null;

  if (
    ceoPlan?.status === "ready" &&
    parsedCEOPlan &&
    !parsedCEOPlan.success
  ) {
    console.error(
      "CEO_PLAN_INVALID_STORED_OUTPUT",
      parsedCEOPlan.error,
    );
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

        {pageError && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
            {message}
          </div>
        )}

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
        </div>

        {!ceoPlan && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">
              CEO IA
            </h2>

            <p className="mt-2 text-gray-600">
              Ya tenemos suficiente información para analizar
              tu negocio y definir tus próximas prioridades.
            </p>

            <form
              action={generateCEOPlanAction}
              className="mt-6"
            >
              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white"
              >
                Generar mi plan
              </button>
            </form>
          </div>
        )}

        {ceoPlan?.status === "generating" && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Generando tu plan...
            </h2>

            <p className="mt-2 text-gray-600">
              El CEO IA está analizando tu negocio.
            </p>
          </div>
        )}

        {ceoPlan?.status === "failed" && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              No pudimos generar el plan
            </h2>

            <p className="mt-2 text-gray-600">
              Puedes volver a intentarlo.
            </p>

            <form
              action={generateCEOPlanAction}
              className="mt-5"
            >
              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white"
              >
                Intentar nuevamente
              </button>
            </form>
          </div>
        )}

        {readyPlan && (
          <>
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                CEO IA
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-gray-900">
                Resumen ejecutivo
              </h2>

              <p className="mt-4 leading-7 text-gray-700">
                {readyPlan.executive_summary}
              </p>
            </section>

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900">
                Diagnóstico
              </h2>

              <p className="mt-4 leading-7 text-gray-700">
                {readyPlan.diagnosis}
              </p>
            </section>

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900">
                Tus 3 prioridades
              </h2>

              <div className="mt-6 space-y-4">
                {readyPlan.priorities
                  .slice()
                  .sort(
                    (a, b) =>
                      a.rank - b.rank,
                  )
                  .map((priority) => (
                    <div
                      key={priority.rank}
                      className="rounded-xl bg-gray-50 p-5"
                    >
                      <p className="text-sm font-semibold text-gray-500">
                        Prioridad {priority.rank}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold text-gray-900">
                        {priority.title}
                      </h3>

                      <p className="mt-3 text-gray-700">
                        {priority.reason}
                      </p>

                      <p className="mt-3 text-sm text-gray-600">
                        <strong>
                          Impacto esperado:
                        </strong>{" "}
                        {priority.expected_impact}
                      </p>
                    </div>
                  ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900">
                Plan de 7 días
              </h2>

              <div className="mt-6 space-y-4">
                {readyPlan.weekly_plan
                  .slice()
                  .sort(
                    (a, b) =>
                      a.day - b.day,
                  )
                  .map((item) => (
                    <div
                      key={item.day}
                      className="rounded-xl border border-gray-200 p-5"
                    >
                      <p className="text-sm font-semibold text-gray-500">
                        Día {item.day}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold text-gray-900">
                        {item.action}
                      </h3>

                      <p className="mt-3 text-gray-700">
                        {item.objective}
                      </p>

                      <p className="mt-3 text-sm text-gray-600">
                        <strong>
                          Cómo saber si funcionó:
                        </strong>{" "}
                        {item.success_metric}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}