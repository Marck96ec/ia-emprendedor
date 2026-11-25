import type { BusinessKnowledge } from "./business-knowledge-types";
import { declaredSocialMedia, OperationalResourceSchema, resourceObservation, resourceAvailability, type MemoryRecord } from "./business-memory";
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
  const social = resourceObservation(input.memory, "social_media");
  const declaredConstraint = social.declared || social.feedback ? "unknown" : declaredSocialMedia(input.declaredContext);
  if (declaredConstraint !== "unknown") resources.social_media = declaredConstraint;
  const currentMemory = input.memory.filter((row) => {
    if (!row.content.feedback || !row.memory_key.startsWith("feedback.")) return true;
    const key = OperationalResourceSchema.safeParse(row.memory_key.slice("feedback.".length));
    return !key.success || resourceObservation(input.memory, key.data).feedback?.id === row.id;
  });

  return {
    targetWeek: input.targetWeek,
    resources,
    socialMediaOrigin: social.feedback ? "feedback" : social.declared ? "business_memory" : declaredConstraint === "unknown" ? "unknown" : "explicit_diagnostic",
    activeConstraints: currentMemory.filter((row) => row.category === "constraint" && row.confirmation !== "inferred")
      .map(({ memory_key, content }) => ({ key: memory_key, label: content.label.slice(0, 120), detail: content.detail?.slice(0, 180) ?? null })),
    activeAssets: currentMemory.filter((row) => (row.category === "asset" || row.category === "capability") && row.confirmation !== "inferred")
      .map(({ memory_key, content }) => ({ key: memory_key, label: content.label.slice(0, 100), detail: content.detail?.slice(0, 180) ?? null })),
    feedback: currentMemory.filter((row) => row.content.feedback).map((row) => ({
      key: row.memory_key,
      ...row.content.feedback,
    })),
    confirmationNeeded: OperationalResourceSchema.options.filter((key) => resourceObservation(input.memory, key).needsConfirmation),
    memory: [
      ...input.memory.filter((row) => row.category === "fact" && !row.content.feedback).slice(0, 10),
      ...input.memory.filter((row) => row.category === "learning").slice(0, 10),
    ].map(({ id, memory_key, category, content, origin, confirmation, observed_at }) => ({
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

