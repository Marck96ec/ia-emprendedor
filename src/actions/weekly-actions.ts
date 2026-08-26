"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const UpdateWeeklyActionSchema = z.object({
  action_id: z.string().uuid(),
  status: z.enum(["pending", "completed"]),
});

function dashboardError(message: string) {
  return (
    "/dashboard?error=" +
    encodeURIComponent(message)
  );
}

export async function updateWeeklyActionStatus(
  formData: FormData,
) {
  const parsed = UpdateWeeklyActionSchema.safeParse({
    action_id: String(
      formData.get("action_id") ?? "",
    ),

    status: String(
      formData.get("status") ?? "",
    ),
  });

  if (!parsed.success) {
    redirect(
      dashboardError(
        "No pudimos actualizar la acción.",
      ),
    );
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const {
    action_id: actionId,
    status,
  } = parsed.data;

  const { data: updatedAction, error } =
    await supabase
      .from("weekly_actions")
      .update({
        status,

        completed_at:
          status === "completed"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", actionId)
      .select("id")
      .maybeSingle();

  if (error) {
    console.error(
      "WEEKLY_ACTION_UPDATE_ERROR",
      error,
    );

    redirect(
      dashboardError(
        "No pudimos actualizar la acción.",
      ),
    );
  }

  /*
   * Si alguien intenta enviar manualmente el ID
   * de una acción perteneciente a otro usuario,
   * RLS hará que ninguna fila sea actualizada.
   */
  if (!updatedAction) {
    redirect(
      dashboardError(
        "No encontramos esa acción.",
      ),
    );
  }

  revalidatePath("/dashboard");

  redirect("/dashboard");
}