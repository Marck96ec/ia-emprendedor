"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DiagnosticOnboardingSchema } from "@/lib/onboarding-validation";
import { createClient } from "@/lib/supabase/server";

export async function createDiagnostic(formData: FormData) {
  const parsed = DiagnosticOnboardingSchema.safeParse({
    business_stage: formData.get("business_stage"),
    team_size: formData.get("team_size"),
    owner_hours_per_week: formData.get("owner_hours_per_week"),
    main_challenge: formData.get("main_challenge"),
    primary_goal: formData.get("primary_goal"),
    customers_description: formData.get("customers_description"),
    sales_process: formData.get("sales_process"),
    owner_responsibilities: formData.get("owner_responsibilities"),
    monthly_revenue: formData.get("monthly_revenue"),
    currency_code: formData.get("currency_code"),
  });

  if (!parsed.success) {
    redirect(
      "/onboarding/diagnostic?error=" +
        encodeURIComponent(
          "Completa todos los datos del diagnóstico. Puedes usar valores aproximados.",
        ),
    );
  }

  const {
    business_stage: businessStage,
    team_size: teamSize,
    owner_hours_per_week: ownerHoursPerWeek,
    main_challenge: mainChallenge,
    primary_goal: primaryGoal,
    customers_description: customersDescription,
    sales_process: salesProcess,
    owner_responsibilities: ownerResponsibilities,
    monthly_revenue: monthlyRevenue,
    currency_code: currencyCode,
  } = parsed.data;

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
      owner_hours_per_week: ownerHoursPerWeek,
      owner_responsibilities: ownerResponsibilities,
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