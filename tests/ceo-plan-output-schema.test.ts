import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { ModelBehaviorError } from "@openai/agents";

import {
  CEOPlanSchema,
  validateCEOPlanBusinessRules,
  type CEOPlan,
} from "../src/lib/ai/ceo-agent";
import {
  generateCEOPlan,
  type GenerateCEOPlanInput,
} from "../src/lib/ai/generate-ceo-plan";
import {
  CEOPlanError,
  isInvalidCEOPlanOutputError,
  toSafeCEOPlanError,
} from "../src/lib/ai/ceo-plan-errors";

const validPlan: CEOPlan = {
  executive_summary: "Resumen semanal",
  diagnosis: "El negocio necesita más conversaciones cualificadas.",
  strategic_diagnosis: {
    business_understanding: "Taller de servicios con dos personas y pocas horas del dueño.",
    diagnosis: "La captación de conversaciones cualificadas es insuficiente.",
    bottleneck: "La entrada de oportunidades comerciales.",
    evidence: "El reto principal declarado son las pocas conversaciones y las ventas llegan por referidos.",
    uncertainty: "No sabemos aún qué segmento responde mejor.",
    alternative_hypothesis: "El problema podría ser la conversión del seguimiento y no la captación.",
    critical_decision: "Elegir un segmento prioritario para validar conversaciones esta semana.",
  },
  priorities: [
    {
      rank: 1,
      title: "Conversaciones",
      reason: "Es el cuello de botella actual.",
      expected_impact: "Más oportunidades.",
    },
    {
      rank: 2,
      title: "Seguimiento",
      reason: "Hay contactos sin respuesta.",
      expected_impact: "Más cierres.",
    },
    {
      rank: 3,
      title: "Medición",
      reason: "Falta una referencia semanal.",
      expected_impact: "Decisiones más claras.",
    },
  ],
  weekly_plan: Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    action: `Acción ${index + 1}`,
    objective: `Objetivo ${index + 1}`,
    success_metric: `Métrica ${index + 1}`,
    execution_mode: "manual" as const,
    action_type: "generic" as const,
  })),
};

const input: GenerateCEOPlanInput = {
  business: {
    name: "Taller Norte",
    revenueModel: "Cobro por servicios de reparación.",
    description: "Reparaciones para comercios.",
  },
  diagnostic: {
    businessStage: "validating",
    teamSize: 2,
    ownerHoursPerWeek: 6,
    mainChallenge: "Pocas conversaciones",
    primaryGoal: "Aumentar solicitudes",
    customersDescription: "Comercios locales",
    salesProcess: "Referidos",
    ownerResponsibilities: "Vendo, coordino el equipo y reviso las finanzas.",
    monthlyRevenue: 1200,
    currencyCode: "USD",
  },
  previousWeek: null,
  businessKnowledge: { valueProposition: null },
};

test("acepta un plan estructuralmente válido de siete acciones", () => {
  const parsed = CEOPlanSchema.safeParse(validPlan);

  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data.weekly_plan.length, 7);
});

test("mantiene los tres tipos y detecta más de una acción asistida", () => {
  const plan: CEOPlan = {
    ...validPlan,
    weekly_plan: [
      ...validPlan.weekly_plan.slice(0, 5),
      {
        day: 6,
        action: "Mejorar la propuesta",
        objective: "Aclarar el valor",
        success_metric: "La propuesta se entiende en una prueba",
        execution_mode: "ai_assisted",
        action_type: "value_proposition",
      },
      {
        day: 7,
        action: "Escribir mensajes comerciales",
        objective: "Probar tres ángulos",
        success_metric: "Registrar respuestas",
        execution_mode: "ai_assisted",
        action_type: "commercial_messages",
      },
    ],
  };

  assert.equal(CEOPlanSchema.safeParse(plan).success, true);
  assert.equal(validateCEOPlanBusinessRules(plan).success, false);
});

test("rechaza incoherencia de modo y tipo sin depender de la redacción", () => {
  const invalidPlan = {
    ...validPlan,
    weekly_plan: validPlan.weekly_plan.map((item, index) =>
      index === 0
        ? {
            ...item,
            execution_mode: "manual" as const,
            action_type: "commercial_messages" as const,
          }
        : item,
    ),
  };

  assert.equal(CEOPlanSchema.safeParse(invalidPlan).success, true);
  assert.equal(
    validateCEOPlanBusinessRules(invalidPlan).success,
    false,
  );
});

test("reintenta una salida inválida una sola vez y acepta la corregida", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  let attempts = 0;

  const result = await generateCEOPlan(input, async () => {
    attempts += 1;

    if (attempts === 1) {
      throw new ModelBehaviorError(
        "Invalid output type: final assistant output did not match the expected schema.",
      );
    }

    return { finalOutput: validPlan };
  });

  assert.equal(attempts, 2);
  assert.deepEqual(result, validPlan);
});

test("no reintenta errores que no son de salida", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  let attempts = 0;

  await assert.rejects(
    generateCEOPlan(input, async () => {
      attempts += 1;
      throw new Error("permission denied");
    }),
    (error: unknown) =>
      error instanceof CEOPlanError &&
      error.kind === "transient",
  );

  assert.equal(attempts, 1);
});

test("clasifica solo la salida inválida reconocida por Agents SDK", () => {
  const invalidOutput = new ModelBehaviorError(
    "Invalid output type: final assistant output failed schema validation.",
  );
  const otherModelBehavior = new ModelBehaviorError(
    "Model returned no final output for the structured output type.",
  );

  assert.equal(isInvalidCEOPlanOutputError(invalidOutput), true);
  assert.equal(isInvalidCEOPlanOutputError(otherModelBehavior), false);
  assert.equal(
    toSafeCEOPlanError(invalidOutput).code,
    "CEO_PLAN_STRUCTURAL_OUTPUT_INVALID",
  );
  assert.equal(toSafeCEOPlanError(otherModelBehavior).kind, "transient");
  assert.equal(
    toSafeCEOPlanError(
      new Error("Invalid output type: unknown transport failure"),
    ).kind,
    "transient",
  );
});

test("usa una RPC transaccional y limpia acciones parciales", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261011010000_complete_ceo_plan_atomically.sql",
    ),
    "utf8",
  );

  assert.match(migration, /create or replace function public\.complete_ceo_plan/);
  assert.match(migration, /security definer/);
  assert.match(migration, /delete from public\.weekly_actions/);
  assert.match(migration, /insert into public\.weekly_actions/);
  assert.match(migration, /set status = 'ready'/);
  assert.match(migration, /create or replace function public\.fail_ceo_plan/);
});

test("persiste el razonamiento estratégico junto al plan", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261022010000_add_strategic_diagnosis_to_ceo_plans.sql",
    ),
    "utf8",
  );

  assert.match(migration, /add column strategic_diagnosis jsonb/);
  assert.match(
    migration,
    /p_strategic_diagnosis jsonb/,
  );
  assert.match(
    migration,
    /perform public\.complete_ceo_plan\(/,
  );
});