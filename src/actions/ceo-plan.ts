"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateCEOPlan } from "@/lib/ai/generate-ceo-plan";
import { createClient } from "@/lib/supabase/server";

const MODEL =
  process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

const PROMPT_VERSION = "v1";

function dashboardError(message: string) {
  return (
    "/dashboard?error=" +
    encodeURIComponent(message)
  );
}

function dashboardMessage(message: string) {
  return (
    "/dashboard?message=" +
    encodeURIComponent(message)
  );
}

export async function generateCEOPlanAction() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  /*
   * 1. Obtener negocio.
   */
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(
        `
          id,
          name,
          business_type,
          description
        `,
      )
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    console.error(
      "CEO_PLAN_BUSINESS_ERROR",
      businessError,
    );

    redirect(
      dashboardError(
        "No pudimos cargar tu negocio.",
      ),
    );
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  /*
   * 2. Obtener diagnóstico.
   */
  const {
    data: diagnostic,
    error: diagnosticError,
  } = await supabase
    .from("business_diagnostics")
    .select(
      `
        business_stage,
        team_size,
        main_challenge,
        primary_goal,
        customers_description,
        sales_process,
        monthly_revenue,
        currency_code
      `,
    )
    .eq("business_id", business.id)
    .maybeSingle();

  if (diagnosticError) {
    console.error(
      "CEO_PLAN_DIAGNOSTIC_ERROR",
      diagnosticError,
    );

    redirect(
      dashboardError(
        "No pudimos cargar tu diagnóstico.",
      ),
    );
  }

  if (!diagnostic) {
    redirect("/onboarding/diagnostic");
  }

  /*
   * 3. Verificar si ya existe un plan.
   */
  const {
    data: existingPlan,
    error: existingPlanError,
  } = await supabase
    .from("ceo_plans")
    .select("id, status")
    .eq("business_id", business.id)
    .maybeSingle();

  if (existingPlanError) {
    console.error(
      "CEO_PLAN_LOOKUP_ERROR",
      existingPlanError,
    );

    redirect(
      dashboardError(
        "No pudimos verificar tu plan actual.",
      ),
    );
  }

  if (existingPlan?.status === "ready") {
    redirect("/dashboard");
  }

  if (existingPlan?.status === "generating") {
    redirect(
      dashboardMessage(
        "Tu plan ya se está generando.",
      ),
    );
  }

  /*
   * 4. Reclamar el derecho a generar.
   *
   * Esto evita que dos clics generen dos llamadas
   * simultáneas a OpenAI.
   */
  let planId: string;

  if (!existingPlan) {
    const {
      data: createdPlan,
      error: createPlanError,
    } = await supabase
      .from("ceo_plans")
      .insert({
        business_id: business.id,
        status: "generating",
        model: MODEL,
        prompt_version: PROMPT_VERSION,
      })
      .select("id")
      .single();

    if (createPlanError) {
      /*
       * 23505 = unique_violation.
       * Otro request pudo crear el plan primero.
       */
      if (createPlanError.code === "23505") {
        redirect(
          dashboardMessage(
            "Tu plan ya se está generando.",
          ),
        );
      }

      console.error(
        "CEO_PLAN_CREATE_RECORD_ERROR",
        createPlanError,
      );

      redirect(
        dashboardError(
          "No pudimos iniciar la generación del plan.",
        ),
      );
    }

    planId = createdPlan.id;
  } else {
    /*
     * Solo permitimos reclamar un plan que esté failed.
     * El primer request lo cambia a generating.
     */
    const {
      data: claimedPlan,
      error: claimError,
    } = await supabase
      .from("ceo_plans")
      .update({
        status: "generating",
        model: MODEL,
        prompt_version: PROMPT_VERSION,
        executive_summary: null,
        diagnosis: null,
        priorities: null,
        weekly_plan: null,
        generated_at: null,
      })
      .eq("id", existingPlan.id)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error(
        "CEO_PLAN_CLAIM_ERROR",
        claimError,
      );

      redirect(
        dashboardError(
          "No pudimos reintentar la generación.",
        ),
      );
    }

    if (!claimedPlan) {
      redirect(
        dashboardMessage(
          "Tu plan ya se está generando.",
        ),
      );
    }

    planId = claimedPlan.id;
  }

  /*
   * 5. Ejecutar el CEO IA.
   */
  try {
    const output = await generateCEOPlan({
      business: {
        name: business.name,
        businessType: business.business_type,
        description: business.description,
      },

      diagnostic: {
        businessStage:
          diagnostic.business_stage,

        teamSize:
          diagnostic.team_size,

        mainChallenge:
          diagnostic.main_challenge,

        primaryGoal:
          diagnostic.primary_goal,

        customersDescription:
          diagnostic.customers_description,

        salesProcess:
          diagnostic.sales_process,

        monthlyRevenue:
          diagnostic.monthly_revenue === null
            ? null
            : Number(
                diagnostic.monthly_revenue,
              ),

        currencyCode:
          diagnostic.currency_code,
      },
    });

    /*
     * 6. Guardar resultado estructurado.
     */
    const { error: saveError } =
      await supabase
        .from("ceo_plans")
        .update({
          status: "ready",

          executive_summary:
            output.executive_summary,

          diagnosis:
            output.diagnosis,

          priorities:
            output.priorities,

          weekly_plan:
            output.weekly_plan,

          generated_at:
            new Date().toISOString(),
        })
        .eq("id", planId);

    if (saveError) {
      throw saveError;
    }
  } catch (error) {
    console.error(
      "CEO_PLAN_GENERATION_ERROR",
      error,
    );

    const { error: failedUpdateError } =
      await supabase
        .from("ceo_plans")
        .update({
          status: "failed",
        })
        .eq("id", planId);

    if (failedUpdateError) {
      console.error(
        "CEO_PLAN_FAILED_STATUS_ERROR",
        failedUpdateError,
      );
    }

    redirect(
      dashboardError(
        "No pudimos generar el plan. Puedes intentarlo nuevamente.",
      ),
    );
  }

  revalidatePath("/dashboard");

  redirect("/dashboard");
}