import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSINESS_ASSESSMENT_VERSION,
  evaluateBusinessAssessment,
  type NormalizedBusinessAssessmentInput,
} from "../src/lib/business-assessment";
import { businessAssessmentScenarios } from "./fixtures/business-assessment-scenarios";

function baseInput(
  overrides: Partial<NormalizedBusinessAssessmentInput> = {},
): NormalizedBusinessAssessmentInput {
  return {
    businessStage: "operating",
    teamSize: 1,
    ownerHoursPerWeek: 40,
    ownerResponsibilities: "Ventas y operaciones",
    customersDescription: "Pequeñas empresas con necesidad de control",
    salesProcess: "Contacto, propuesta y seguimiento",
    monthlyRevenue: 5000,
    evidence: [],
    completedActions: 0,
    totalActions: 3,
    latestOutcome: null,
    reviewedWeeks: 0,
    ...overrides,
  };
}

function evidence(
  evidenceType: "sale" | "metric" | "product" | "action_result",
  id: string,
) {
  return {
    id,
    evidenceType,
    certainty: "real" as const,
    source: "documented" as const,
    observedAt: "2026-11-20T12:00:00.000Z",
  };
}

test("assessment is deterministic and versioned", () => {
  const input = baseInput({
    evidence: [evidence("sale", "sale-1"), evidence("metric", "metric-1")],
    completedActions: 2,
    latestOutcome: "positive",
    reviewedWeeks: 1,
  });

  const first = evaluateBusinessAssessment(input);
  const second = evaluateBusinessAssessment(input);

  assert.deepEqual(first, second);
  assert.equal(first.version, BUSINESS_ASSESSMENT_VERSION);
  assert.equal(first.maturity.level, 3);
  assert.equal(first.maturity.stage, "stability");
  assert.equal(first.maturity.classification, "provisional");
  assert.equal(first.confidence, "low");
});

test("missing information does not default the business to level one", () => {
  const assessment = evaluateBusinessAssessment(
    baseInput({
      businessStage: null,
      evidence: [],
      latestOutcome: null,
      reviewedWeeks: 0,
    }),
  );

  assert.equal(assessment.maturity.level, null);
  assert.equal(assessment.maturity.classification, "indeterminate");
  assert.equal(assessment.maturity.stageLabel, null);
  assert.match(assessment.maturity.summary, /comprendiendo/i);
});

test("a declared stalled business is fragile without inventing financial facts", () => {
  const assessment = evaluateBusinessAssessment(
    baseInput({
      businessStage: "stalled",
      latestOutcome: null,
    }),
  );

  assert.equal(assessment.maturity.level, 2);
  assert.equal(assessment.maturity.stage, "survival");
  assert.equal(assessment.health.status, "fragile");
  assert.equal(assessment.dimensions.find((item) => item.key === "liquidity")?.status, "unknown");
});

test("a negative weekly outcome is a critical health signal independent of maturity", () => {
  const assessment = evaluateBusinessAssessment(
    baseInput({
      businessStage: "operating",
      evidence: [evidence("sale", "sale-1")],
      latestOutcome: "negative",
      reviewedWeeks: 1,
    }),
  );

  assert.equal(assessment.maturity.level, 2);
  assert.equal(assessment.health.status, "critical");
  assert.equal(assessment.health.classification, "provisional");
  assert.equal(assessment.dimensions.find((item) => item.key === "growth")?.status, "unknown");
});

test("growth intent is not inferred for a stable one-person business", () => {
  const assessment = evaluateBusinessAssessment(
    baseInput({
      businessStage: "operating",
      teamSize: 1,
      evidence: [evidence("sale", "sale-1"), evidence("metric", "metric-1")],
      latestOutcome: "positive",
      reviewedWeeks: 1,
    }),
  );

  const growth = assessment.dimensions.find((item) => item.key === "growth");
  const autonomy = assessment.dimensions.find((item) => item.key === "autonomy");

  assert.equal(growth?.status, "unknown");
  assert.equal(autonomy?.status, "unknown");
  assert.equal(assessment.health.status, "favorable");
});

test("declared evidence is never promoted to verified evidence", () => {
  const assessment = evaluateBusinessAssessment(
    baseInput({
      evidence: [
        {
          ...evidence("product", "product-1"),
          source: "declared",
        },
      ],
    }),
  );

  assert.deepEqual(assessment.evidenceSummary, {
    declared: 1,
    documented: 0,
    verified: 0,
  });
  assert.notEqual(assessment.dimensions.find((item) => item.key === "market")?.classification, "confirmed");
});

test("unknown-certainty evidence cannot support a favorable dimension", () => {
  const assessment = evaluateBusinessAssessment(
    baseInput({
      evidence: [
        {
          ...evidence("product", "product-unknown"),
          certainty: "unknown",
        },
      ],
    }),
  );

  assert.equal(assessment.dimensions.find((item) => item.key === "market")?.status, "unknown");
  assert.equal(assessment.evidenceSummary.documented, 1);
});

test("scenario fixtures preserve conservative distinctions", () => {
  const profitableWithLiquidityRisk = evaluateBusinessAssessment(
    businessAssessmentScenarios.profitableWithLiquidityRisk,
  );
  const expanding = evaluateBusinessAssessment(
    businessAssessmentScenarios.expanding,
  );
  const consolidated = evaluateBusinessAssessment(
    businessAssessmentScenarios.consolidated,
  );
  const contradictory = evaluateBusinessAssessment(
    businessAssessmentScenarios.contradictoryEvidence,
  );
  const growthIntentWithoutCapacity = evaluateBusinessAssessment(
    businessAssessmentScenarios.growthIntentWithoutCapacity,
  );

  assert.equal(
    profitableWithLiquidityRisk.dimensions.find((item) => item.key === "liquidity")?.status,
    "unknown",
  );
  assert.equal(expanding.maturity.stage, "expansion");
  assert.notEqual(consolidated.maturity.level, 5);
  assert.equal(contradictory.health.status, "critical");
  assert.equal(growthIntentWithoutCapacity.maturity.classification, "indeterminate");
  assert.equal(
    growthIntentWithoutCapacity.dimensions.find((item) => item.key === "growth")?.status,
    "unknown",
  );
});
