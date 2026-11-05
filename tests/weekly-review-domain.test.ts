import assert from "node:assert/strict";
import test from "node:test";

import {
  extractBusinessEvidence,
  summarizeEvidence,
} from "../src/lib/business-evidence";
import { buildCurrentMetricMessage } from "../src/lib/business-metrics";
import { calculateProfitability } from "../src/lib/profitability";
import {
  validateStrategicContinuity,
} from "../src/lib/strategic-continuity";
import { parseWeeklyReviewDraft } from "../src/lib/weekly-review-types";

const captureSchema = {
  version: 1 as const,
  capture_type: "opportunity_follow_up",
  title: "Seguimiento",
  fields: [{
    id: "opportunities",
    type: "repeatable_group" as const,
    label: "Oportunidades observadas",
    required: true,
    min_items: 0,
    max_items: 10,
    fields: [{
      id: "name",
      type: "text" as const,
      label: "Nombre",
      required: true,
    }],
  }],
  completion_rule: { type: "all_required_fields_valid" as const },
};

test("normaliza evidencia con origen y no inventa registros cuando el grupo está vacío", () => {
  const rows = extractBusinessEvidence({
    businessId: "00000000-0000-0000-0000-000000000001",
    actionId: "00000000-0000-0000-0000-000000000002",
    captureSchema,
    completionData: { opportunities: [] },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].evidence_type, "opportunity");
  assert.equal(rows[0].canonical_key, "action:00000000-0000-0000-0000-000000000002");
  assert.equal(summarizeEvidence(rows), "1 oportunidad");
});

test("calcula utilidad, margen y utilidad por hora sin confundir ingresos con beneficios", () => {
  const result = calculateProfitability({
    salePrice: 100,
    materialsCost: 20,
    laborCost: 30,
    indirectCost: 10,
    hours: 2.5,
    currencyCode: "USD",
    estimated: true,
  });

  assert.equal(result.totalCost, 60);
  assert.equal(result.estimatedProfit, 40);
  assert.equal(result.marginPercent, 40);
  assert.equal(result.profitPerHour, 16);
  assert.deepEqual(result.missing, []);
  assert.equal(result.certainty, "estimated");
});

test("marca información faltante en vez de convertirla en cero observado", () => {
  const result = calculateProfitability({
    salePrice: 100,
    materialsCost: 20,
  });

  assert.equal(result.totalCost, 20);
  assert.equal(result.estimatedProfit, 80);
  assert.deepEqual(result.missing, ["laborCost", "indirectCost", "hours"]);
});

test("la continuidad rechaza repetición sin una señal nueva", () => {
  const previous = [{
    action: "Registrar consultas",
    objective: "Conocer la demanda",
    successMetric: "Consultas recibidas",
  }];
  const next = [...previous];

  const result = validateStrategicContinuity({
    previousActions: previous,
    nextActions: next,
    continuity: {
      mode: "repetition",
      justification: "Lo repetimos porque sí.",
      unresolved_uncertainty: "Falta información.",
      new_verifiable_signal: "Consultas recibidas",
      prior_evidence_gap: "No hubo suficiente detalle.",
    },
  });

  assert.equal(result.success, false);
});

test("la continuidad acepta profundizar con señal verificable nueva", () => {
  const result = validateStrategicContinuity({
    previousActions: [{
      action: "Registrar consultas",
      objective: "Conocer la demanda",
      successMetric: "Consultas recibidas",
    }],
    nextActions: [{
      action: "Registrar consultas",
      objective: "Conocer la demanda",
      successMetric: "Consultas cualificadas por segmento",
    }],
    continuity: {
      mode: "deepening",
      justification: "La primera prueba mezcló segmentos.",
      unresolved_uncertainty: "Qué segmento responde mejor.",
      new_verifiable_signal: "Consultas cualificadas por segmento.",
      prior_evidence_gap: "No se separaron los resultados.",
    },
  });

  assert.deepEqual(result, { success: true, repeatedActions: 1 });
});

test("el borrador ignora datos no pertenecientes al contrato", () => {
  const draft = parseWeeklyReviewDraft({
    outcome_status: "mixed",
    learning: "Aprendí algo concreto.",
    injected: "no debe persistirse",
  });

  assert.deepEqual(draft, {});
});

test("la métrica de ejecución explica sus límites y no la presenta como ventas", () => {
  const message = buildCurrentMetricMessage({
    weekNumber: 3,
    totalActions: 3,
    completedActions: 1,
    recordedResults: 1,
    evidence: [{ evidence_type: "sale" }],
  });

  assert.match(message, /1 de 3 acciones/);
  assert.match(message, /no equivale por sí solo a ventas/);
});
