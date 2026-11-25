import type {
  AssessmentEvidence,
  BusinessAssessment,
  BusinessStage,
  NormalizedBusinessAssessmentInput,
} from "@/lib/business-assessment";
import { evaluateBusinessAssessment } from "@/lib/business-assessment";
import type { BusinessEvidence } from "@/lib/business-evidence";

type CurrentDiagnostic = {
  business_stage?: string | null;
  team_size?: number | null;
  owner_hours_per_week?: number | null;
  owner_responsibilities?: string | null;
  customers_description?: string | null;
  sales_process?: string | null;
  monthly_revenue?: number | string | null;
};

type CurrentReview = {
  outcome_status?: "positive" | "mixed" | "no_change" | "negative" | null;
};

export type CurrentAssessmentData = {
  diagnostic: CurrentDiagnostic | null;
  evidence: Array<Pick<
    BusinessEvidence,
    "id" | "evidence_type" | "certainty" | "observed_at"
  >>;
  completedActions?: number;
  totalActions?: number;
  latestReview?: CurrentReview | null;
  reviewedWeeks?: number;
};

function parseBusinessStage(value: string | null | undefined): BusinessStage | null {
  return value === "starting" ||
    value === "operating" ||
    value === "growing" ||
    value === "stalled"
    ? value
    : null;
}

function parseNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeEvidence(
  evidence: CurrentAssessmentData["evidence"],
): AssessmentEvidence[] {
  return evidence.map((item) => ({
    id: item.id,
    evidenceType: item.evidence_type,
    certainty: item.certainty,
    // Persistence proves that a user record exists; it does not independently
    // verify the observation or make it documentary evidence.
    source: "declared",
    observedAt: item.observed_at,
  }));
}

export function normalizeBusinessAssessmentInput(
  data: CurrentAssessmentData,
): NormalizedBusinessAssessmentInput {
  return {
    businessStage: parseBusinessStage(data.diagnostic?.business_stage),
    teamSize: data.diagnostic?.team_size ?? null,
    ownerHoursPerWeek: data.diagnostic?.owner_hours_per_week ?? null,
    ownerResponsibilities: data.diagnostic?.owner_responsibilities ?? null,
    customersDescription: data.diagnostic?.customers_description ?? null,
    salesProcess: data.diagnostic?.sales_process ?? null,
    monthlyRevenue: parseNumber(data.diagnostic?.monthly_revenue),
    evidence: normalizeEvidence(data.evidence),
    completedActions: data.completedActions ?? 0,
    totalActions: data.totalActions ?? 0,
    latestOutcome: data.latestReview?.outcome_status ?? null,
    reviewedWeeks: data.reviewedWeeks ?? (data.latestReview ? 1 : 0),
  };
}

export function buildBusinessAssessment(
  data: CurrentAssessmentData,
): BusinessAssessment {
  return evaluateBusinessAssessment(normalizeBusinessAssessmentInput(data));
}
