import { z } from "zod";

import type { ActionCapture, ActionCaptureField } from "@/lib/action-capture";

export const BusinessEvidenceTypeSchema = z.enum([
  "action_result",
  "product",
  "price",
  "cost",
  "opportunity",
  "follow_up",
  "sale",
  "metric",
]);

export const EvidenceCertaintySchema = z.enum([
  "real",
  "estimated",
  "unknown",
]);

export const BusinessEvidenceSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  evidence_type: BusinessEvidenceTypeSchema,
  canonical_key: z.string().trim().min(1).max(200),
  data: z.record(z.string(), z.unknown()),
  source_weekly_action_id: z.string().uuid(),
  source_action_result_id: z.string().uuid().nullable().optional(),
  certainty: EvidenceCertaintySchema,
  observed_at: z.string().datetime().optional(),
  period_start: z.string().date().nullable().optional(),
  period_end: z.string().date().nullable().optional(),
});

export type BusinessEvidence = z.infer<typeof BusinessEvidenceSchema>;
export type BusinessEvidenceInsert = Omit<
  BusinessEvidence,
  "id" | "observed_at"
> & {
  observed_at?: string;
  relatedCanonicalKey?: string;
};

type EvidenceExtractionInput = {
  businessId: string;
  actionId: string;
  actionResultId?: string | null;
  captureSchema: ActionCapture;
  completionData: Record<string, unknown>;
  observedAt?: string;
};

function inferEvidenceType(captureType: string, fieldId?: string): BusinessEvidence["evidence_type"] {
  const value = `${captureType} ${fieldId ?? ""}`.toLowerCase();
  if (value.includes("product") || value.includes("producto")) return "product";
  if (value.includes("price") || value.includes("pricing") || value.includes("precio")) return "price";
  if (value.includes("cost") || value.includes("costo")) return "cost";
  if (value.includes("opportun") || value.includes("oportun")) return "opportunity";
  if (value.includes("follow") || value.includes("seguimiento")) return "follow_up";
  if (value.includes("sale") || value.includes("venta")) return "sale";
  if (value.includes("metric") || value.includes("métrica") || value.includes("metrica")) return "metric";
  return "action_result";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stableLabel(value: Record<string, unknown>, fallback: string): string {
  for (const key of ["id", "name", "nombre", "title", "titulo", "label", "etiqueta"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }

  return fallback;
}

function relatedOpportunityKey(value: Record<string, unknown>): string | undefined {
  for (const key of ["opportunity_id", "opportunityId", "opportunity_key", "opportunity"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return `opportunity:${candidate.trim().toLowerCase()}`;
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return `opportunity:${candidate}`;
    }
  }
  return undefined;
}

function collectRepeatableEvidence(
  fields: ActionCaptureField[],
  data: Record<string, unknown>,
  captureType: string,
  prefix = "",
): Array<{ type: BusinessEvidence["evidence_type"]; key: string; data: Record<string, unknown> }> {
  const extracted: Array<{ type: BusinessEvidence["evidence_type"]; key: string; data: Record<string, unknown> }> = [];

  for (const field of fields) {
    const value = data[field.id];
    if (field.type !== "repeatable_group" || !Array.isArray(value)) continue;

    value.forEach((item, index) => {
      const record = asRecord(item);
      if (!record) return;
      const label = stableLabel(record, `${field.id}-${index + 1}`);
      const type = inferEvidenceType(captureType, field.id);
      extracted.push({
        type,
        key: type === "opportunity"
          ? `opportunity:${label.toLowerCase()}`
          : `${prefix}${field.id}:${label}`,
        data: record,
      });
    });
  }

  return extracted;
}

export function extractBusinessEvidence({
  businessId,
  actionId,
  actionResultId = null,
  captureSchema,
  completionData,
  observedAt = new Date().toISOString(),
}: EvidenceExtractionInput): BusinessEvidenceInsert[] {
  const baseType = inferEvidenceType(captureSchema.capture_type);
  const repeatable = collectRepeatableEvidence(captureSchema.fields, completionData, captureSchema.capture_type);
  const rows: BusinessEvidenceInsert[] = [
    {
      business_id: businessId,
      evidence_type: baseType,
      canonical_key: `action:${actionId}`,
      data: completionData,
      source_weekly_action_id: actionId,
      source_action_result_id: actionResultId,
      certainty: "real",
    },
  ];

  for (const item of repeatable) {
    rows.push({
      business_id: businessId,
      evidence_type: item.type,
      canonical_key: `${actionId}:${item.key}`,
      data: item.data,
      source_weekly_action_id: actionId,
      source_action_result_id: actionResultId,
      certainty: "real",
      relatedCanonicalKey: item.type === "follow_up"
        ? relatedOpportunityKey(item.data)
        : undefined,
    });
  }

  return rows.map((row) => ({ ...row, observed_at: observedAt }));
}

export function summarizeEvidence(
  evidence: Array<Pick<BusinessEvidence, "evidence_type">>,
): string {
  const counts = new Map<BusinessEvidence["evidence_type"], number>();
  for (const item of evidence) {
    counts.set(item.evidence_type, (counts.get(item.evidence_type) ?? 0) + 1);
  }

  const labels: Partial<Record<BusinessEvidence["evidence_type"], [string, string]>> = {
    action_result: ["resultado registrado", "resultados registrados"],
    product: ["producto", "productos"],
    price: ["precio", "precios"],
    cost: ["costo", "costos"],
    opportunity: ["oportunidad", "oportunidades"],
    follow_up: ["seguimiento", "seguimientos"],
    sale: ["venta", "ventas"],
    metric: ["métrica", "métricas"],
  };

  return [...counts.entries()]
    .map(([type, count]) => {
      const label = labels[type] ?? ["evidencia", "evidencias"];
      return `${count} ${count === 1 ? label[0] : label[1]}`;
    })
    .join(" y ");
}
