"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { generateValueProposition } from "@/lib/ai/generate-value-proposition";
import {
  ValuePropositionSchema,
  type ValueProposition,
} from "@/lib/ai/value-proposition-agent";
import { createClient } from "@/lib/supabase/server";

const ActionWorkSchema = z.object({
  action_id: z.string().uuid(),
  feedback: z.string().trim().max(500).optional(),
});

const ApproveActionSchema = z.object({
  action_result_id: z.string().uuid(),
});

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
const PROMPT_VERSION = "value-proposition-v1";

function actionError(actionId: string, message: string) {
  return `/actions/${actionId}?error=${encodeURIComponent(message)}`;
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  return { supabase, userId: data.claims.sub };
}

export async function workOnActionWithAI(formData: FormData) {
  const actionId = String(formData.get("action_id") ?? "");
  const parsed = ActionWorkSchema.safeParse({
    action_id: actionId,
    feedback: String(formData.get("feedback") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    redirect(actionError(actionId, "No pudimos procesar este ajuste."));
  }

  const { supabase, userId } = await getAuthenticatedUser();
  const { data: action, error: actionErrorResult } = await supabase
    .from("weekly_actions")
    .select("id, ceo_plan_id, day, action, objective, success_metric, status, execution_mode, action_type")
    .eq("id", parsed.data.action_id)
    .maybeSingle();

  if (actionErrorResult || !action) {
    redirect(actionError(parsed.data.action_id, "No encontramos esa acción."));
  }

  const { data: plan, error: planError } = await supabase
    .from("ceo_plans")
    .select("id, business_id, status, executive_summary, diagnosis, priorities")
    .eq("id", action.ceo_plan_id)
    .maybeSingle();
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, owner_id, name, business_type, description")
    .eq("id", plan?.business_id ?? "")
    .maybeSingle();

  if (planError || businessError || !plan || !business || business.owner_id !== userId) {
    redirect(actionError(parsed.data.action_id, "No encontramos esa acción."));
  }

  if (action.execution_mode !== "ai_assisted" || action.action_type !== "value_proposition") {
    redirect(actionError(action.id, "Esta acción no tiene un espacio de trabajo con IA."));
  }

  if (action.status !== "pending" || plan.status !== "ready") {
    redirect(actionError(action.id, "Esta acción ya no está disponible para editar."));
  }

  const { data: review, error: reviewError } = await supabase
    .from("weekly_reviews")
    .select("id")
    .eq("ceo_plan_id", plan.id)
    .maybeSingle();

  if (reviewError || review) {
    redirect(actionError(action.id, "La semana ya está cerrada."));
  }

  const { data: diagnostic, error: diagnosticError } = await supabase
    .from("business_diagnostics")
    .select("business_stage, team_size, main_challenge, primary_goal, customers_description, sales_process, monthly_revenue, currency_code")
    .eq("business_id", business.id)
    .maybeSingle();

  if (diagnosticError || !diagnostic) {
    redirect(actionError(action.id, "No pudimos cargar el contexto del negocio."));
  }

  const { data: existingResult, error: resultError } = await supabase
    .from("action_results")
    .select("id, status, draft_content, revision")
    .eq("weekly_action_id", action.id)
    .maybeSingle();

  if (resultError || existingResult?.status === "approved") {
    redirect(actionError(action.id, "Este resultado ya no puede modificarse."));
  }

  const draft = existingResult?.draft_content
    ? ValuePropositionSchema.safeParse(existingResult.draft_content)
    : null;

  try {
    const output = await generateValueProposition({
      business: {
        name: business.name,
        business_type: business.business_type,
        description: business.description,
      },
      diagnostic,
      action: {
        action: action.action,
        objective: action.objective,
        success_metric: action.success_metric,
        day: action.day,
        action_type: action.action_type,
      },
      plan: {
        executive_summary: plan.executive_summary,
        diagnosis: plan.diagnosis,
        priorities: plan.priorities,
      },
      draft: draft?.success ? draft.data : null,
      feedback: parsed.data.feedback ?? null,
    });

    const content: ValueProposition = ValuePropositionSchema.parse(output);
    const { data: savedResult, error: saveError } = existingResult
      ? await supabase
          .from("action_results")
          .update({
            draft_content: content,
            revision: existingResult.revision + 1,
            model: MODEL,
            prompt_version: PROMPT_VERSION,
          })
          .eq("id", existingResult.id)
          .eq("status", "draft")
          .eq("revision", existingResult.revision)
          .select("id")
          .maybeSingle()
      : await supabase.from("action_results").insert({
          weekly_action_id: action.id,
          status: "draft",
          draft_content: content,
          revision: 1,
          model: MODEL,
          prompt_version: PROMPT_VERSION,
        }).select("id").maybeSingle();

    if (saveError || !savedResult) {
      console.error("ACTION_RESULT_SAVE_ERROR", saveError);
      redirect(actionError(action.id, "No pudimos guardar la propuesta."));
    }
  } catch (error) {
    console.error("VALUE_PROPOSITION_GENERATION_ERROR", error);
    redirect(actionError(action.id, "No pudimos generar la propuesta. Puedes reintentarlo."));
  }

  revalidatePath(`/actions/${action.id}`);
  revalidatePath("/dashboard");
  redirect(`/actions/${action.id}`);
}

export async function approveActionResult(formData: FormData) {
  const parsed = ApproveActionSchema.safeParse({
    action_result_id: String(formData.get("action_result_id") ?? ""),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=No pudimos aprobar el resultado.");
  }

  const { supabase } = await getAuthenticatedUser();
  const { data, error } = await supabase.rpc("approve_action_result", {
    p_action_result_id: parsed.data.action_result_id,
  });

  if (error || !data?.[0]) {
    console.error("ACTION_RESULT_APPROVAL_ERROR", error);
    redirect("/dashboard?error=No pudimos aprobar el resultado.");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/actions/${data[0].weekly_action_id}`);
  redirect("/dashboard?message=Resultado aprobado y acción completada.");
}