import { z } from "zod";

export const resourceLabels = {
  social_media: "Redes sociales",
  whatsapp: "WhatsApp",
  existing_contacts: "Contactos propios",
  delegate: "Responsable disponible para delegar",
  advertising_budget: "Presupuesto para publicidad",
  website: "Página web",
} as const;

export const OperationalResourceSchema = z.enum(["social_media", "whatsapp", "existing_contacts", "delegate", "advertising_budget", "website"]);
export const ResourceSchema = z.enum([...OperationalResourceSchema.options, "value_proposition"]);
export const AvailabilitySchema = z.enum(["available", "unavailable", "unknown"]);

export type OperationalResource = z.infer<typeof OperationalResourceSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Availability = z.infer<typeof AvailabilitySchema>;

export const MemoryRecordSchema = z.object({
  id: z.uuid(),
  memory_key: z.string(),
  category: z.enum(["fact", "constraint", "capability", "asset", "learning"]),
  content: z.object({
    label: z.string(),
    detail: z.string().nullable().optional(),
    availability: AvailabilitySchema.optional(),
    feedback: z.object({
      sourceId: z.uuid(),
      sourceType: z.enum(["weekly_review", "action_result"]),
      field: z.string(),
      certainty: z.enum(["explicit", "ambiguous"]),
      quote: z.string(),
    }).optional(),
    acknowledged_feedback_id: z.uuid().optional(),
  }),
  origin: z.enum(["owner_input", "weekly_review", "business_evidence", "inference"]),
  source_id: z.uuid().nullable(),
  confirmation: z.enum(["declared", "confirmed", "inferred", "evidence_backed"]),
  observed_at: z.string(),
  updated_at: z.string(),
});
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>;

export function normalizeWorkText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function resourceAvailability(memory: MemoryRecord[], hasValueProposition: boolean) {
  const states: Record<Resource, Availability> = {
    social_media: "unknown", whatsapp: "unknown", existing_contacts: "unknown", delegate: "unknown",
    advertising_budget: "unknown", website: "unknown",
    value_proposition: hasValueProposition ? "available" : "unknown",
  };
  for (const key of OperationalResourceSchema.options) states[key] = resourceObservation(memory, key).availability;
  return states;
}

export function resourceObservation(memory: MemoryRecord[], key: OperationalResource) {
  const declared = memory.find((row) => row.memory_key === key && row.confirmation !== "inferred");
  const feedback = memory.find((row) => row.memory_key === "feedback." + key && row.content.feedback);
  const active = feedback && declared?.content.acknowledged_feedback_id !== feedback.id
    && (!declared || Date.parse(feedback.updated_at) > Date.parse(declared.updated_at)) ? feedback : undefined;
  const previous = declared?.content.availability ?? "unknown";
  const observation = active?.content.availability;
  const conflict = observation !== undefined && observation !== "unknown" && previous !== "unknown" && observation !== previous;
  const needsConfirmation = Boolean(active && (active.content.feedback?.certainty === "ambiguous" || conflict));
  const availability = active?.content.feedback?.certainty === "explicit" && observation
    ? conflict ? "unavailable" : observation
    : previous;
  return { availability, needsConfirmation, declared, feedback: active };
}

export function operationalAvailability(memory: MemoryRecord[], declaration: string) {
  const states = resourceAvailability(memory, false);
  const social = resourceObservation(memory, "social_media");
  if (!social.declared && !social.feedback) {
    states.social_media = declaredSocialMedia(declaration);
  }
  return states;
}

// Only explicit first-person declarations count. The generic channel
// "publicidad en internet" deliberately matches neither rule.
export function declaredSocialMedia(text: string): Availability {
  const value = normalizeWorkText(text);
  if (/\b(no tenemos|no tengo|no contamos con|no dispongo de|no disponemos de|sin cuentas en) redes sociales\b/.test(value)) {
    return "unavailable";
  }
  if (/\b(tenemos|tengo|contamos con|disponemos de) (cuentas activas en )?redes sociales\b/.test(value)) {
    return "available";
  }
  return "unknown";
}
