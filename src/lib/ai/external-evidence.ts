import { z } from "zod";

export const ExternalEvidenceItemSchema = z.object({
  title: z.string().trim().min(1),
  source_name: z.string().trim().min(1),
  source_url: z.string().url(),
  published_at: z.string().nullable(),
  evidence_type: z.enum([
    "case_study",
    "research",
    "report",
    "news",
    "official_source",
    "company_statement",
  ]),
  claim: z.string().trim().min(1),
  relevance: z.string().trim().min(1),
  support_level: z.enum(["supports", "mixed", "challenges"]),
  limitations: z.string().trim().min(1),
});

const ExternalEvidenceModelItemSchema = ExternalEvidenceItemSchema.extend({
  source_url: z.string().trim().min(1),
});

export const CounterEvidenceSchema = z.object({
  searched: z.boolean(),
  found: z.boolean(),
  summary: z.string().trim().min(1),
});

function validateEvidenceConsistency(
  evidence: {
    status: "found" | "insufficient";
    items: unknown[];
    counter_evidence: { searched: boolean };
  },
  context: z.RefinementCtx,
) {
  if (evidence.status === "found" && evidence.items.length === 0) {
    context.addIssue({
      code: "custom",
      message: "La evidencia encontrada debe incluir al menos una fuente",
      path: ["items"],
    });
  }

  if (evidence.status === "found" && !evidence.counter_evidence.searched) {
    context.addIssue({
      code: "custom",
      message: "La evidencia encontrada debe haber buscado evidencia contraria",
      path: ["counter_evidence", "searched"],
    });
  }
}

export const ExternalEvidenceSchema = z
  .object({
    research_question: z.string().trim().min(1),
    status: z.enum(["found", "insufficient"]),
    items: z.array(ExternalEvidenceItemSchema).max(3),
    synthesis: z.string().trim().min(1),
    confidence: z.enum(["low", "medium", "high"]),
    counter_evidence: CounterEvidenceSchema,
  })
  .superRefine(validateEvidenceConsistency);

export const ExternalEvidenceModelSchema = z
  .object({
    research_question: z.string().trim().min(1),
    status: z.enum(["found", "insufficient"]),
    items: z.array(ExternalEvidenceModelItemSchema).max(3),
    synthesis: z.string().trim().min(1),
    confidence: z.enum(["low", "medium", "high"]),
    counter_evidence: CounterEvidenceSchema,
  })
  .superRefine(validateEvidenceConsistency);

export type CounterEvidence = z.infer<typeof CounterEvidenceSchema>;

export type ExternalEvidence = z.infer<typeof ExternalEvidenceSchema>;
export type ExternalEvidenceItem = z.infer<
  typeof ExternalEvidenceItemSchema
>;