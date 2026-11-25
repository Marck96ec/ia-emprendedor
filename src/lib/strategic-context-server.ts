import type { SupabaseClient } from "@supabase/supabase-js";

import { MemoryRecordSchema, operationalAvailability, resourceLabels, type MemoryRecord } from "./business-memory";
import { loadBusinessKnowledge } from "./business-knowledge";
import { inferWorkKey, strategyForSequence, type ActionStrategy, type HistoricalAction } from "./strategic-action";
import { buildStrategicContext } from "./strategic-context";
import { extractFeedback } from "./business-feedback";

export async function loadBusinessMemory(supabase: SupabaseClient, businessId: string) {
  const args = { p_business_id: businessId, p_as_of: new Date().toISOString() };
  const [active, recent] = await Promise.all([
    (async () => {
      const rows: unknown[] = [];
      const size = 100;
      for (let offset = 0; ; offset += size) {
        const { data, error } = await supabase.rpc("business_memory_as_of", args)
          .neq("category", "learning").order("updated_at", { ascending: false }).order("id").range(offset, offset + size - 1);
        if (error) throw error;
        rows.push(...data);
        if (data.length < size) return rows;
      }
    })(),
    supabase.rpc("business_memory_as_of", args).eq("category", "learning")
      .order("updated_at", { ascending: false }).limit(10),
  ]);
  if (recent.error) throw recent.error;
  return MemoryRecordSchema.array().parse([...active, ...recent.data]);
}

export async function rememberBusinessFeedback(
  supabase: SupabaseClient, businessId: string,
  source: FeedbackSource,
) {
  const candidates = extractFeedback(source.fields);
  const results = await Promise.all(candidates.map(({ key, availability, certainty, quote, field }) =>
    supabase.rpc("record_business_memory", {
      p_business_id: businessId, p_memory_key: "feedback." + key,
      p_category: availability === "unavailable" ? "constraint" : availability === "available" ? "asset" : "fact",
      p_content: {
        label: key === "value_proposition" ? "Oferta comercial" : resourceLabels[key],
        availability, detail: quote,
        feedback: { sourceId: source.id, sourceType: source.type, field, certainty, quote },
      },
    })));
  if (results.some(({ error }) => error)) console.error("BUSINESS_FEEDBACK_RECORD_FAILED");
}

type FeedbackSource = {
  id: string;
  type: "weekly_review" | "action_result";
  fields: Record<string, unknown>;
  observedAt?: string;
};

function restoreReviewFeedback(memory: MemoryRecord[], source?: FeedbackSource) {
  const observed = source?.observedAt;
  if (!source || !observed) return memory;
  const byKey = new Map(memory.map((row) => [row.memory_key, row]));
  for (const entry of extractFeedback(source.fields)) {
    const memory_key = "feedback." + entry.key;
    const existing = byKey.get(memory_key);
    if (existing && Date.parse(existing.updated_at) >= Date.parse(observed)) continue;
    byKey.set(memory_key, {
      id: source.id, memory_key,
      category: entry.availability === "unavailable" ? "constraint" : entry.availability === "available" ? "asset" : "fact",
      content: {
        label: entry.key === "value_proposition" ? "Oferta comercial" : resourceLabels[entry.key],
        availability: entry.availability, detail: entry.quote,
        feedback: { sourceId: source.id, sourceType: source.type, field: entry.field, certainty: entry.certainty, quote: entry.quote },
      },
      origin: "weekly_review", source_id: source.id, confirmation: "declared",
      observed_at: observed, updated_at: observed,
    });
  }
  return [...byKey.values()];
}

export async function loadOperationalAvailability(supabase: SupabaseClient, businessId: string, description: string | null) {
  const [memory, diagnostic] = await Promise.all([
    loadBusinessMemory(supabase, businessId),
    supabase.from("business_diagnostics").select("main_challenge,sales_process").eq("business_id", businessId).maybeSingle(),
  ]);
  if (diagnostic.error) throw diagnostic.error;
  return operationalAvailability(memory, [description, diagnostic.data?.main_challenge, diagnostic.data?.sales_process].filter(Boolean).join(". "));
}

export async function isActionDependencyCompleted(supabase: SupabaseClient, planId: string, strategy?: ActionStrategy) {
  if (!strategy?.depends_on_sequence) return true;
  const { data, error } = await supabase.from("weekly_actions").select("status")
    .eq("ceo_plan_id", planId).eq("sequence", strategy.depends_on_sequence).maybeSingle();
  if (error) throw error;
  return data?.status === "completed";
}

export async function loadStrategicContext(
  supabase: SupabaseClient, businessId: string, targetWeek: number,
  evidence: Parameters<typeof buildStrategicContext>[0]["evidence"], declaredContext: string,
  previousFeedback?: FeedbackSource,
) {
  const [memory, knowledge, plans] = await Promise.all([
    loadBusinessMemory(supabase, businessId),
    loadBusinessKnowledge(businessId, supabase),
    supabase.from("ceo_plans")
      .select("week_number,weekly_plan,weekly_actions(id,sequence,action,objective,status,completion_data)")
      .eq("business_id", businessId)
      .eq("status", "ready")
      .lt("week_number", targetWeek)
      .order("week_number", { ascending: false })
      .limit(12),
  ]);
  if (plans.error) throw plans.error;

  const history: HistoricalAction[] = (plans.data ?? []).flatMap((plan) => {
    return plan.weekly_actions.flatMap((action) => {
      if (action.status !== "pending" && action.status !== "completed") return [];
      return [{
        id: action.id, week: plan.week_number, status: action.status,
        action: action.action, objective: action.objective,
        result: action.completion_data ? JSON.stringify(action.completion_data).slice(0, 420) : null,
        strategy: strategyForSequence(plan.weekly_plan, action.sequence) ?? null,
      }];
    });
  });
  const lastWeek = plans.data?.at(-1)?.week_number;
  const hasRecentOffer = history.some(isReusableOffer);
  if (!knowledge.valueProposition && !hasRecentOffer && lastWeek && plans.data?.length === 12) {
    const oldOffer = await loadOlderOffer(supabase, businessId, lastWeek);
    if (oldOffer) history.push(oldOffer);
  }
  return { knowledge, context: buildStrategicContext({
    targetWeek, memory: restoreReviewFeedback(memory, previousFeedback), history, evidence, knowledge, declaredContext,
  }) };
}

function isReusableOffer(action: HistoricalAction) {
  return action.status === "completed" && Boolean(action.result)
    && (action.strategy?.work_key === "offer_definition" || inferWorkKey(action.action) === "offer_definition");
}

async function loadOlderOffer(supabase: SupabaseClient, businessId: string, beforeWeek: number) {
  const size = 60;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase.from("weekly_actions")
      .select("id,sequence,action,objective,completion_data,ceo_plans!inner(week_number,weekly_plan)")
      .eq("ceo_plans.business_id", businessId).eq("ceo_plans.status", "ready")
      .lt("ceo_plans.week_number", beforeWeek)
      .eq("status", "completed").not("completion_data", "is", null)
      .order("created_at", { ascending: false }).order("id").range(offset, offset + size - 1);
    if (error) throw error;
    for (const row of data) {
      const plan = Array.isArray(row.ceo_plans) ? row.ceo_plans[0] : row.ceo_plans;
      if (!plan) continue;
      const action: HistoricalAction = {
        id: row.id, week: plan.week_number, action: row.action, objective: row.objective,
        status: "completed", result: JSON.stringify(row.completion_data).slice(0, 420),
        strategy: strategyForSequence(plan.weekly_plan, row.sequence) ?? null,
      };
      if (isReusableOffer(action)) return action;
    }
    if (data.length < size) return null;
  }
}
