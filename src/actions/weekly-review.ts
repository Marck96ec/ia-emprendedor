"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const WeeklyReviewSchema = z.object({
  what_worked: z.string().trim().min(5).max(2000),
  what_didnt_work: z.string().trim().min(5).max(2000),
  business_changes: z.string().trim().min(5).max(2000),
  next_week_focus: z
    .string()
    .trim()
    .max(1000)
    .refine(
      (value) =>
        value.length === 0 ||
        value.length >= 5,
      {
        message:
          "El enfoque debe tener al menos 5 caracteres.",
      },
    ),
});

function reviewError(message: string) {
  return (
    "/weekly-review?error=" +
    encodeURIComponent(message)
  );
}

export async function createWeeklyReview(
  formData: FormData,
) {
  const parsed = WeeklyReviewSchema.safeParse({
    what_worked: String(
      formData.get("what_worked") ?? "",
    ),

    what_didnt_work: String(
      formData.get("what_didnt_work") ?? "",
    ),

    business_changes: String(
      formData.get("business_changes") ?? "",
    ),

    next_week_focus: String(
      formData.get("next_week_focus") ?? "",
    ),
  });

  if (!parsed.success) {
    redirect(
      reviewError(
        "Completa correctamente la revisión semanal.",
      ),
    );
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  /*
   * Obtener negocio del usuario.
   */
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    console.error(
      "WEEKLY_REVIEW_BUSINESS_ERROR",
      businessError,
    );

    redirect(
      reviewError(
        "No pudimos cargar tu negocio.",
      ),
    );
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  /*
   * Obtener el plan más reciente.
   */
  const { data: ceoPlan, error: planError } =
    await supabase
      .from("ceo_plans")
      .select("id, week_number, status")
      .eq("business_id", business.id)
      .order("week_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (planError) {
    console.error(
      "WEEKLY_REVIEW_PLAN_ERROR",
      planError,
    );

    redirect(
      reviewError(
        "No pudimos cargar tu plan semanal.",
      ),
    );
  }

  if (!ceoPlan || ceoPlan.status !== "ready") {
    redirect("/dashboard");
  }

  /*
   * Impedir dos revisiones para la misma semana.
   */
  const {
    data: existingReview,
    error: reviewLookupError,
  } = await supabase
    .from("weekly_reviews")
    .select("id")
    .eq("ceo_plan_id", ceoPlan.id)
    .maybeSingle();

  if (reviewLookupError) {
    console.error(
      "WEEKLY_REVIEW_LOOKUP_ERROR",
      reviewLookupError,
    );

    redirect(
      reviewError(
        "No pudimos verificar tu revisión.",
      ),
    );
  }

  if (existingReview) {
    redirect("/dashboard");
  }

  /*
   * Calcular progreso desde la base de datos.
   *
   * Nunca confiamos en números enviados desde el navegador.
   */
  const {
    data: actions,
    error: actionsError,
  } = await supabase
    .from("weekly_actions")
    .select("status")
    .eq("ceo_plan_id", ceoPlan.id);

  if (actionsError) {
    console.error(
      "WEEKLY_REVIEW_ACTIONS_ERROR",
      actionsError,
    );

    redirect(
      reviewError(
        "No pudimos cargar tus acciones.",
      ),
    );
  }

  if (!actions || actions.length !== 7) {
    redirect(
      reviewError(
        "Tu plan semanal todavía no tiene las 7 acciones esperadas.",
      ),
    );
  }

  const completedActions =
    actions.filter(
      (action) =>
        action.status === "completed",
    ).length;

  const nextWeekFocus =
    parsed.data.next_week_focus?.trim() || null;

  const { error } = await supabase
    .from("weekly_reviews")
    .insert({
      ceo_plan_id: ceoPlan.id,

      what_worked:
        parsed.data.what_worked,

      what_didnt_work:
        parsed.data.what_didnt_work,

      business_changes:
        parsed.data.business_changes,

      next_week_focus:
        nextWeekFocus,

      completed_actions:
        completedActions,

      total_actions: 7,
    });

  if (error) {
    /*
     * Si dos requests intentan crear la revisión
     * simultáneamente, UNIQUE ceo_plan_id protege
     * contra duplicados.
     */
    if (error.code === "23505") {
      redirect("/dashboard");
    }

    console.error(
      "WEEKLY_REVIEW_CREATE_ERROR",
      error,
    );

    redirect(
      reviewError(
        "No pudimos guardar tu revisión.",
      ),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/weekly-review");

  redirect(
    "/dashboard?message=" +
      encodeURIComponent(
        "Revisión semanal guardada.",
      ),
  );
}