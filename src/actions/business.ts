"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { BusinessOnboardingSchema } from "@/lib/onboarding-validation";
import { createClient } from "@/lib/supabase/server";

export async function createBusiness(formData: FormData) {
  const parsed = BusinessOnboardingSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    revenue_model: formData.get("revenue_model"),
  });

  if (!parsed.success) {
    redirect(
      "/onboarding/business?error=" +
        encodeURIComponent(
          "Completa el nombre, la descripción y cómo gana dinero tu empresa.",
        ),
    );
  }

  const { name, description, revenue_model: revenueModel } = parsed.data;

  const supabase = await createClient();

  // 1. Verificar quién está autenticado.
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  // 2. Comprobar si ya tiene negocio.
  const { data: existingBusiness, error: existingBusinessError } =
    await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

  if (existingBusinessError) {
    console.error("BUSINESS_LOOKUP_ERROR", existingBusinessError);

    redirect(
      "/onboarding/business?error=" +
        encodeURIComponent(
          "No pudimos verificar tu negocio. Intenta nuevamente.",
        ),
    );
  }

  if (existingBusiness) {
    redirect("/dashboard");
  }

  // 3. Crear negocio.
  const { error } = await supabase.from("businesses").insert({
    owner_id: userId,
    name,
    revenue_model: revenueModel,
    description,
  });

  if (error) {
    console.error("BUSINESS_CREATE_ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    redirect(
      "/onboarding/business?error=" +
        encodeURIComponent(
          "No pudimos crear tu negocio. Intenta nuevamente.",
        ),
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}