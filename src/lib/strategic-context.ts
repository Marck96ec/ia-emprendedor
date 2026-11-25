import type { BusinessKnowledge } from "./business-knowledge-types";
import { declaredSocialMedia, resourceAvailability, type MemoryRecord } from "./business-memory";
import { inferWorkKey, type HistoricalAction } from "./strategic-action";

export type StrategicContext = ReturnType<typeof buildStrategicContext>;

export function buildStrategicContext(input: {
  targetWeek: number;
  memory: MemoryRecord[];
  history: HistoricalAction[];
  knowledge: BusinessKnowledge;
  evidence: Array<{ id: string; evidence_type: string; certainty: string; observed_at: string }>;
  declaredContext: string;
}) {
  const manualOffer = input.history.find((action) =>
    action.status === "completed" && Boolean(action.result) &&
    (action.strategy?.work_key === "offer_definition" || inferWorkKey(action.action) === "offer_definition"));
  const hasValueProposition = Boolean(input.knowledge.valueProposition || manualOffer);
  const resources = resourceAvailability(input.memory, hasValueProposition);
  const hasSocialDeclaration = input.memory.some((item) => item.memory_key === "social_media" && item.confirmation !== "inferred");
  const declaredConstraint = hasSocialDeclaration ? "unknown" : declaredSocialMedia(input.declaredContext);
  if (declaredConstraint !== "unknown") resources.social_media = declaredConstraint;

  return {
    targetWeek: input.targetWeek,
    resources,
    socialMediaOrigin: hasSocialDeclaration ? "business_memory" : declaredConstraint === "unknown" ? "unknown" : "explicit_diagnostic",
    memory: input.memory.slice(0, 20).map(({ id, memory_key, category, content, origin, confirmation, observed_at }) => ({
      id, memory_key, category, origin, confirmation, observed_at,
      label: content.label.slice(0, 120), detail: content.detail?.slice(0, 400) ?? null,
      availability: content.availability ?? null,
    })),
    reusableOffer: input.knowledge.valueProposition
      ? { source: "approved_asset" as const, detail: JSON.stringify(input.knowledge.valueProposition).slice(0, 1500) }
      : manualOffer ? { source: "declared_action_result" as const, priorActionId: manualOffer.id, detail: manualOffer.result } : null,
    recentEvidence: input.evidence.slice(0, 24),
    history: input.history.map((item) => ({
      ...item,
      result: item.result?.slice(0, 420) ?? null,
    })),
  };
}

