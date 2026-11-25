import type { SupabaseClient } from "@supabase/supabase-js";

import { MemoryRecordSchema, operationalAvailability } from "./business-memory";
import { loadBusinessKnowledge } from "./business-knowledge";
import { strategyForSequence, type ActionStrategy, type HistoricalAction } from "./strategic-action";
import { buildStrategicContext } from "./strategic-context";

export async function loadBusinessMemory(supabase: SupabaseClient, businessId: string) {
  const { data, error } = await supabase.rpc("business_memory_as_of", { p_business_id: businessId }).limit(24);
  if (error) throw error;
  return MemoryRecordSchema.array().parse(data);
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
) {
  const [memory, knowledge, plans] = await Promise.all([
    loadBusinessMemory(supabase, businessId),
    loadBusinessKnowledge(businessId),
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
  return { knowledge, context: buildStrategicContext({ targetWeek, memory, history, evidence, knowledge, declaredContext }) };
}

