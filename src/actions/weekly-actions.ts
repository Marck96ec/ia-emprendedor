"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  getActionCaptureSchema,
  parsePersistedActionCaptureSchema,
  validateActionCompletion,
} from "@/lib/action-capture";
import { createClient } from "@/lib/supabase/server";

const UpdateWeeklyActionSchema = z.object({
  action_id: z.string().uuid(),
  completion_data: z.string().min(2),
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

    completion_data: String(formData.get("completion_data") ?? ""),
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
    completion_data: completionDataText,
  } = parsed.data;

  let completionData: unknown;
  try {
    completionData = JSON.parse(completionDataText);
  } catch {
    redirect(dashboardError("El resultado no tiene un formato válido."));
  }

  const { data: action, error: actionError } = await supabase
    .from("weekly_actions")
    .select("id, capture_schema, status, execution_mode")
    .eq("id", actionId)
    .maybeSingle();

  if (actionError || !action || action.status !== "pending") {
    redirect(dashboardError("No encontramos una acción pendiente para registrar."));
  }

  const persistedSchema = parsePersistedActionCaptureSchema(action.capture_schema);
  if (
    action.capture_schema !== null &&
    action.capture_schema !== undefined &&
    !persistedSchema.success
  ) {
    console.error("WEEKLY_ACTION_CAPTURE_SCHEMA_INVALID", {
      actionId,
      issues: persistedSchema.error.issues,
    });
    redirect(dashboardError("Esta acción tiene un esquema de resultado inválido."));
  }

  const captureSchema = getActionCaptureSchema(action.capture_schema);
  const validation = validateActionCompletion(captureSchema, completionData);
  if (!validation.success) {
    redirect(dashboardError("Completa los campos obligatorios y revisa el resultado."));
  }

  const { data: updatedAction, error } = await supabase.rpc(
    "complete_weekly_action_with_evidence",
    {
      p_action_id: actionId,
      p_completion_data: completionData,
    },
  );

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

  redirect(
    "/dashboard?message=" +
      encodeURIComponent(
        "Acción completada. Resultado guardado para el aprendizaje de esta semana.",
      ),
  );
}