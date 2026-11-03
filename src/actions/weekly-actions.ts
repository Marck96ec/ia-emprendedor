"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  getActionCaptureSchema,
  MAX_COMPLETION_DATA_BYTES,
  normalizeCompletionData,
  parsePersistedActionCaptureSchema,
  validateActionCompletion,
  type ActionCompletionFormState,
  type CompletionIssue,
} from "@/lib/action-capture";
import { createClient } from "@/lib/supabase/server";

const UpdateWeeklyActionSchema = z.object({
  action_id: z.string().uuid(),
  completion_data: z.string().min(2).max(MAX_COMPLETION_DATA_BYTES * 2),
});

const COMPLETION_ERROR_MESSAGES: Record<string, string> = {
  ACTION_ALREADY_COMPLETED:
    "Esta acción ya tiene un resultado registrado. Conservamos la evidencia original.",
  WEEKLY_PLAN_CLOSED:
    "La semana ya está cerrada. Este resultado no se puede registrar.",
  DELIVERABLE_NOT_APPROVED:
    "Aprueba el entregable antes de registrar el resultado.",
  PLAN_NOT_READY:
    "El plan de esta semana todavía no está listo.",
  CAPTURE_SCHEMA_INVALID:
    "Esta acción tiene un esquema de resultado inválido.",
  ACTION_NOT_FOUND:
    "No encontramos esa acción.",
};

function errorState(message: string, issues?: CompletionIssue[]): ActionCompletionFormState {
  return { status: "error", message, issues };
}

function parseIssues(details: string | null | undefined): CompletionIssue[] | undefined {
  if (!details) return undefined;
  try {
    const parsed = JSON.parse(details) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((issue): issue is CompletionIssue =>
          typeof issue?.path === "string" && typeof issue?.message === "string")
      : undefined;
  } catch {
    return undefined;
  }
}

/*
 * Los errores esperados se devuelven como estado para que el formulario
 * conserve lo escrito; solo el éxito navega. La base de datos vuelve a validar
 * todo en complete_weekly_action_with_evidence.
 */
export async function updateWeeklyActionStatus(
  _previousState: ActionCompletionFormState,
  formData: FormData,
): Promise<ActionCompletionFormState> {
  const parsed = UpdateWeeklyActionSchema.safeParse({
    action_id: String(formData.get("action_id") ?? ""),
    completion_data: String(formData.get("completion_data") ?? ""),
  });

  if (!parsed.success) {
    return errorState("No pudimos leer el resultado. Revisa los campos e inténtalo de nuevo.");
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

  let submittedData: unknown;
  try {
    submittedData = JSON.parse(completionDataText);
  } catch {
    return errorState("El resultado no tiene un formato válido.");
  }

  const { data: action, error: actionError } = await supabase
    .from("weekly_actions")
    .select("id, capture_schema, status")
    .eq("id", actionId)
    .maybeSingle();

  if (actionError || !action) {
    return errorState("No encontramos esa acción.");
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
    return errorState(COMPLETION_ERROR_MESSAGES.CAPTURE_SCHEMA_INVALID);
  }

  const captureSchema = getActionCaptureSchema(action.capture_schema);
  const completionData = normalizeCompletionData(captureSchema, submittedData);

  // Una acción ya completada se delega a la RPC: un reenvío idéntico es un éxito.
  if (action.status === "pending") {
    const validation = validateActionCompletion(captureSchema, completionData);
    if (!validation.success) {
      return errorState("Revisa los campos marcados.", validation.issues);
    }
  }

  const { error } = await supabase.rpc(
    "complete_weekly_action_with_evidence",
    {
      p_action_id: actionId,
      p_completion_data: completionData,
    },
  );

  if (error) {
    if (error.hint === "COMPLETION_DATA_INVALID") {
      return errorState("Revisa los campos marcados.", parseIssues(error.details));
    }

    const knownMessage = error.hint ? COMPLETION_ERROR_MESSAGES[error.hint] : undefined;
    if (!knownMessage) {
      console.error("WEEKLY_ACTION_UPDATE_ERROR", error);
    }
    return errorState(knownMessage ?? "No pudimos guardar el resultado. Tus respuestas siguen aquí; inténtalo de nuevo.");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/actions/${actionId}`);

  redirect(
    "/dashboard?message=" +
      encodeURIComponent(
        "Acción completada. Resultado guardado para el aprendizaje de esta semana.",
      ),
  );
}
