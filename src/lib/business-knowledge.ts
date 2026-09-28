import {
  ValuePropositionSchema,
  type ValueProposition,
} from "@/lib/ai/value-proposition-agent";
import { createClient } from "@/lib/supabase/server";

export type BusinessKnowledge = {
  valueProposition: ValueProposition | null;
};

export async function loadBusinessKnowledge(
  businessId: string,
): Promise<BusinessKnowledge> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_knowledge")
    .select("knowledge_type, content")
    .eq("business_id", businessId)
    .eq("knowledge_type", "value_proposition")
    .maybeSingle();

  if (error) {
    console.error("BUSINESS_KNOWLEDGE_LOAD_ERROR", error);
    return { valueProposition: null };
  }

  if (!data) return { valueProposition: null };

  const parsed = ValuePropositionSchema.safeParse(data.content);
  if (!parsed.success) {
    console.error("BUSINESS_KNOWLEDGE_INVALID_CONTENT", parsed.error);
    return { valueProposition: null };
  }

  return { valueProposition: parsed.data };
}