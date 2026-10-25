"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { generateCommercialMessages } from "@/lib/ai/generate-commercial-messages";
import { generateValueProposition } from "@/lib/ai/generate-value-proposition";
import {
  AIActionDefinitionSchema,
  CommercialMessagesSchema,
  parseActionDeliverable,
  validateActionResultForApproval,
} from "@/lib/ai/action-deliverables";
import { loadBusinessKnowledge } from "@/lib/business-knowledge";
import {
  ValuePropositionSchema,
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
    .select("id, ceo_plan_id, sequence, action, objective, reason, success_metric, expected_result, status, execution_mode, action_type")
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
    .select("id, owner_id, name, revenue_model, description")
    .eq("id", plan?.business_id ?? "")
    .maybeSingle();

  if (planError || businessError || !plan || !business || business.owner_id !== userId) {
    redirect(actionError(parsed.data.action_id, "No encontramos esa acción."));
  }

  const actionDefinition = AIActionDefinitionSchema.safeParse(action);

  if (!actionDefinition.success || actionDefinition.data.execution_mode !== "ai_assisted") {
    redirect(actionError(action.id, "Esta acción no tiene un espacio de trabajo con IA."));
  }

  const actionType = actionDefinition.data.action_type;

  if (actionType === "generic") {
    redirect(actionError(action.id, "Esta acción no tiene un entregable definido."));
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
    .select("business_stage, team_size, owner_hours_per_week, main_challenge, primary_goal, customers_description, sales_process, owner_responsibilities, monthly_revenue, currency_code")
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
    ? parseActionDeliverable(actionType, existingResult.draft_content)
    : null;
  const currentDraft = draft?.success ? draft.data : null;
  const businessKnowledge = await loadBusinessKnowledge(business.id);

  try {
    const content = actionType === "commercial_messages"
      ? CommercialMessagesSchema.parse(
          await generateCommercialMessages({
            business: {
              name: business.name,
              revenue_model: business.revenue_model,
              description: business.description,
            },
            diagnostic,
            action: {
              action: action.action,
              objective: action.objective,
              success_metric: action.success_metric,
              sequence: action.sequence,
              action_type: "commercial_messages",
            },
            plan: {
              executive_summary: plan.executive_summary,
              diagnosis: plan.diagnosis,
              priorities: plan.priorities,
            },
            currentDraft:
              currentDraft && "deliverable_type" in currentDraft
                ? currentDraft
                : null,
            currentKnowledge: businessKnowledge.valueProposition,
            feedback: parsed.data.feedback ?? null,
          }),
        )
      : ValuePropositionSchema.parse(
          await generateValueProposition({
            business: {
              name: business.name,
              revenue_model: business.revenue_model,
              description: business.description,
            },
            diagnostic,
            action: {
              action: action.action,
              objective: action.objective,
              success_metric: action.success_metric,
              sequence: action.sequence,
              action_type: actionType,
            },
            plan: {
              executive_summary: plan.executive_summary,
              diagnosis: plan.diagnosis,
              priorities: plan.priorities,
            },
            currentDraft:
              currentDraft && !("deliverable_type" in currentDraft)
                ? currentDraft
                : null,
            currentKnowledge: businessKnowledge.valueProposition,
            feedback: parsed.data.feedback ?? null,
          }),
        );
    const promptVersion = actionType === "commercial_messages"
      ? "commercial-messages-v1"
      : PROMPT_VERSION;
    const { data: savedResult, error: saveError } = existingResult
      ? await supabase
          .from("action_results")
          .update({
            draft_content: content,
            revision: existingResult.revision + 1,
            model: MODEL,
            prompt_version: promptVersion,
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
          prompt_version: promptVersion,
        }).select("id").maybeSingle();

    if (saveError || !savedResult) {
      console.error("ACTION_RESULT_SAVE_ERROR", saveError);
      redirect(actionError(action.id, "No pudimos guardar el entregable."));
    }
  } catch (error) {
    console.error("ACTION_DELIVERABLE_GENERATION_ERROR", error);
    redirect(actionError(action.id, "No pudimos generar el entregable. Puedes reintentarlo."));
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

  const { data: result, error: resultError } = await supabase
    .from("action_results")
    .select("id, weekly_action_id, status, draft_content")
    .eq("id", parsed.data.action_result_id)
    .maybeSingle();

  if (resultError || !result) {
    redirect("/dashboard?error=No pudimos aprobar el resultado.");
  }

  if (result.status === "draft") {
    const { data: action, error: actionErrorResult } = await supabase
      .from("weekly_actions")
      .select("action, objective, success_metric, execution_mode, action_type")
      .eq("id", result.weekly_action_id)
      .maybeSingle();

    const approvalValidation = action
      ? validateActionResultForApproval(action, result)
      : null;

    if (
      actionErrorResult ||
      !approvalValidation?.success
    ) {
      console.error("ACTION_RESULT_INVALID_BEFORE_APPROVAL", {
        actionErrorResult,
        approvalValidation,
      });
      redirect("/dashboard?error=El entregable no es válido para aprobarlo.");
    }
  }

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