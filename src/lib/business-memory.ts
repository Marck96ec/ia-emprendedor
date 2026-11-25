import { z } from "zod";

export const resourceLabels = {
  social_media: "Redes sociales",
  whatsapp: "WhatsApp",
  existing_contacts: "Contactos propios",
  delegate: "Responsable disponible para delegar",
} as const;

export const OperationalResourceSchema = z.enum(["social_media", "whatsapp", "existing_contacts", "delegate"]);
export const ResourceSchema = z.enum(["social_media", "whatsapp", "existing_contacts", "delegate", "value_proposition"]);
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
    value_proposition: hasValueProposition ? "available" : "unknown",
  };
  for (const item of memory) {
    const resource = OperationalResourceSchema.safeParse(item.memory_key);
    if (resource.success && item.confirmation !== "inferred" && item.content.availability) {
      states[resource.data] = item.content.availability;
    }
  }
  return states;
}

export function operationalAvailability(memory: MemoryRecord[], declaration: string) {
  const states = resourceAvailability(memory, false);
  if (!memory.some((item) => item.memory_key === "social_media" && item.confirmation !== "inferred")) {
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
