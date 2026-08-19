"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const VALID_BUSINESS_STAGES = [
  "starting",
  "operating",
  "growing",
  "stalled",
] as const;

export async function createDiagnostic(formData: FormData) {
  const businessStage = String(
    formData.get("business_stage") ?? "",
  ).trim();

  const teamSizeRaw = String(
    formData.get("team_size") ?? "",
  ).trim();

  const mainChallenge = String(
    formData.get("main_challenge") ?? "",
  ).trim();

  const primaryGoal = String(
    formData.get("primary_goal") ?? "",
  ).trim();

  const customersDescription = String(
    formData.get("customers_description") ?? "",
  ).trim();

  const salesProcess = String(
    formData.get("sales_process") ?? "",
  ).trim();

  const monthlyRevenueRaw = String(
    formData.get("monthly_revenue") ?? "",
  ).trim();

  const currencyCodeRaw = String(
    formData.get("currency_code") ?? "",
  )
    .trim()
    .toUpperCase();

  if (
    !VALID_BUSINESS_STAGES.includes(
      businessStage as (typeof VALID_BUSINESS_STAGES)[number],
    )
  ) {
    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "Selecciona una etapa válida para tu negocio.",
        ),
    );
  }

  const teamSize = Number.parseInt(teamSizeRaw, 10);

  if (
    !Number.isInteger(teamSize) ||
    teamSize < 1 ||
    teamSize > 10000
  ) {
    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "Ingresa un tamaño de equipo válido.",
        ),
    );
  }

  if (
    mainChallenge.length < 10 ||
    mainChallenge.length > 1000
  ) {
    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "Describe tu principal problema con al menos 10 caracteres.",
        ),
    );
  }

  if (
    primaryGoal.length < 10 ||
    primaryGoal.length > 1000
  ) {
    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "Describe tu objetivo principal con al menos 10 caracteres.",
        ),
    );
  }

  if (
    customersDescription.length < 10 ||
    customersDescription.length > 1000
  ) {
    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "Describe tus clientes con al menos 10 caracteres.",
        ),
    );
  }

  if (
    salesProcess.length < 10 ||
    salesProcess.length > 1500
  ) {
    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "Describe cómo consigues ventas con al menos 10 caracteres.",
        ),
    );
  }

  let monthlyRevenue: number | null = null;
  let currencyCode: string | null = null;

  if (monthlyRevenueRaw) {
    monthlyRevenue = Number(monthlyRevenueRaw);

    if (
      !Number.isFinite(monthlyRevenue) ||
      monthlyRevenue < 0
    ) {
      redirect(
        "/onboarding/diagnostic?error=" +
          encodeURIComponent(
            "Ingresa una facturación mensual válida.",
          ),
      );
    }

    if (currencyCodeRaw.length !== 3) {
      redirect(
        "/onboarding/diagnostic?error=" +
          encodeURIComponent(
            "Selecciona una moneda válida.",
          ),
      );
    }

    currencyCode = currencyCodeRaw;
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  // Encontrar el negocio del usuario autenticado.
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    console.error(
      "DIAGNOSTIC_BUSINESS_LOOKUP_ERROR",
      businessError,
    );

    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "No pudimos cargar tu negocio. Intenta nuevamente.",
        ),
    );
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  // Evitar crear más de un diagnóstico por negocio.
  const { data: existingDiagnostic, error: lookupError } =
    await supabase
      .from("business_diagnostics")
      .select("id")
      .eq("business_id", business.id)
      .maybeSingle();

  if (lookupError) {
    console.error(
      "DIAGNOSTIC_LOOKUP_ERROR",
      lookupError,
    );

    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "No pudimos verificar tu diagnóstico.",
        ),
    );
  }

  if (existingDiagnostic) {
    redirect("/dashboard");
  }

  const { error } = await supabase
    .from("business_diagnostics")
    .insert({
      business_id: business.id,
      business_stage: businessStage,
      team_size: teamSize,
      main_challenge: mainChallenge,
      primary_goal: primaryGoal,
      customers_description: customersDescription,
      sales_process: salesProcess,
      monthly_revenue: monthlyRevenue,
      currency_code: currencyCode,
    });

  if (error) {
    console.error("DIAGNOSTIC_CREATE_ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "No pudimos guardar tu diagnóstico. Intenta nuevamente.",
        ),
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}