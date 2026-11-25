import type { NormalizedBusinessAssessmentInput } from "../../src/lib/business-assessment";

const documented = (
  evidenceType: "sale" | "metric" | "product" | "cost" | "opportunity",
  id: string,
) => ({
  id,
  evidenceType,
  certainty: "real" as const,
  source: "documented" as const,
  observedAt: "2026-11-20T12:00:00.000Z",
});

const common = {
  teamSize: 1,
  ownerHoursPerWeek: 40,
  ownerResponsibilities: "Ventas y operaciones",
  customersDescription: "Pequeñas empresas con necesidad de control",
  salesProcess: "Contacto, propuesta y seguimiento",
  monthlyRevenue: 5000,
  completedActions: 2,
  totalActions: 3,
  latestOutcome: "positive" as const,
  reviewedWeeks: 1,
};

export const businessAssessmentScenarios: Record<
  string,
  NormalizedBusinessAssessmentInput
> = {
  recentlyStarted: {
    ...common,
    businessStage: "starting",
    evidence: [],
    completedActions: 0,
    latestOutcome: null,
    reviewedWeeks: 0,
  },
  salesAndLosses: {
    ...common,
    businessStage: "operating",
    evidence: [documented("sale", "sale-1"), documented("cost", "cost-1")],
    latestOutcome: "negative",
  },
  profitableWithLiquidityRisk: {
    ...common,
    businessStage: "operating",
    evidence: [
      documented("sale", "sale-1"),
      documented("cost", "cost-1"),
      documented("metric", "metric-1"),
    ],
  },
  stableWithoutGrowthIntent: {
    ...common,
    businessStage: "operating",
    evidence: [documented("sale", "sale-1"), documented("metric", "metric-1")],
  },
  expanding: {
    ...common,
    businessStage: "growing",
    evidence: [
      documented("opportunity", "opportunity-1"),
      documented("sale", "sale-1"),
      documented("metric", "metric-1"),
    ],
  },
  consolidated: {
    ...common,
    businessStage: "operating",
    evidence: [
      documented("product", "product-1"),
      documented("sale", "sale-1"),
      documented("metric", "metric-1"),
      documented("cost", "cost-1"),
    ],
  },
  insufficientInformation: {
    ...common,
    businessStage: null,
    evidence: [],
    latestOutcome: null,
    reviewedWeeks: 0,
  },
  seasonal: {
    ...common,
    businessStage: "operating",
    evidence: [documented("sale", "sale-1")],
    latestOutcome: "no_change",
    reviewedWeeks: 1,
  },
  contradictoryEvidence: {
    ...common,
    businessStage: "growing",
    evidence: [
      documented("sale", "sale-1"),
      documented("cost", "cost-1"),
    ],
    latestOutcome: "negative",
  },
  soloBusiness: {
    ...common,
    businessStage: "operating",
    teamSize: 1,
    evidence: [documented("sale", "sale-1"), documented("metric", "metric-1")],
  },
  growthIntentWithoutCapacity: {
    ...common,
    businessStage: "growing",
    evidence: [],
    latestOutcome: null,
    reviewedWeeks: 0,
  },
};
