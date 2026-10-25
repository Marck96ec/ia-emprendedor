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
  isRetryableCEOPlanError,
  isInvalidCEOPlanOutputError,
  toSafeCEOPlanError,
} from "../src/lib/ai/ceo-plan-errors";

const validPlan: CEOPlan = {
  executive_summary: "Resumen semanal",
  diagnosis: "El negocio necesita más conversaciones cualificadas.",
  strategic_diagnosis: {
    business_understanding: {
      business_model: "Servicios de reparación para comercios.",
      revenue_engine: "Cobro por servicios de reparación.",
      primary_customer: "Comercios locales.",
      current_goal: "Aumentar solicitudes.",
      owner_involvement: "Vende, coordina el equipo y revisa las finanzas.",
      current_context: "Dos personas y seis horas semanales del empresario.",
    },
    diagnosis: {
      summary: "La captación de conversaciones cualificadas es insuficiente.",
      affected_area: "demand",
      why_it_matters: "Sin conversaciones nuevas no hay oportunidades suficientes.",
    },
    bottleneck: {
      area: "Demanda",
      description: "La entrada de oportunidades comerciales es insuficiente.",
      affected_metric: "conversaciones cualificadas",
    },
    evidence: [
      {
        fact: "Pocas conversaciones.",
        source_field: "diagnostic.mainChallenge",
        interpretation: "La entrada comercial parece ser la restricción actual.",
      },
      {
        fact: "Las ventas llegan por referidos.",
        source_field: "diagnostic.salesProcess",
        interpretation: "El canal comercial depende de una fuente poco controlada.",
      },
    ],
    confidence: "medium",
    unknowns: ["Qué segmento responde mejor."],
    alternative_hypothesis: {
      hypothesis: "El problema podría ser la conversión del seguimiento y no la captación.",
      what_would_confirm_it: "Comparar conversaciones recibidas con propuestas y cierres.",
    },
    critical_decision: {
      question: "¿Debemos priorizar un segmento concreto antes de ampliar la captación?",
      recommended_direction: "Validar un segmento prioritario esta semana.",
      rationale: "La evidencia disponible apunta a una demanda poco enfocada.",
      expected_outcome: "Aprender qué segmento genera conversaciones cualificadas.",
      target_metric: "conversaciones cualificadas",
    },
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
  time_allocation: {
    available_hours: 6,
    allocated_hours: 3,
    reserved_hours: 3,
    rationale: "Se reserva capacidad para responder a hallazgos del experimento.",
  },
  weekly_plan: Array.from({ length: 3 }, (_, index) => ({
    sequence: index + 1,
    action: `Acción ${index + 1}`,
    objective: `Objetivo ${index + 1}`,
    reason: `Razón vinculada a la decisión ${index + 1}`,
    success_metric: `Métrica ${index + 1}`,
    expected_result: `Aprendizaje esperado ${index + 1}`,
    role_recommendation: "execute" as const,
    role_reason: "Requiere criterio directo del empresario para validar la hipótesis.",
    estimated_hours: 1,
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

test("acepta un plan estructuralmente válido de tres acciones", () => {
  const parsed = CEOPlanSchema.safeParse(validPlan);

  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data.weekly_plan.length, 3);
});

test("acepta entre una y cinco acciones y rechaza cantidades fuera del rango", () => {
  for (const count of [1, 2, 3, 5]) {
    const weeklyPlan = Array.from({ length: count }, (_, index) => ({
      ...validPlan.weekly_plan[0],
      sequence: index + 1,
    }));
    assert.equal(CEOPlanSchema.safeParse({ ...validPlan, weekly_plan: weeklyPlan }).success, true, `${count} acciones`);
  }

  for (const count of [0, 6, 7]) {
    const weeklyPlan = Array.from({ length: count }, (_, index) => ({
      ...validPlan.weekly_plan[0],
      sequence: index + 1,
    }));
    assert.equal(CEOPlanSchema.safeParse({ ...validPlan, weekly_plan: weeklyPlan }).success, false, `${count} acciones`);
  }
});

test("exige secuencias positivas, únicas y consecutivas desde uno", () => {
  for (const sequences of [[1, 1], [1, 3], [2, 3]]) {
    const weeklyPlan = sequences.map((sequence, index) => ({
      ...validPlan.weekly_plan[0],
      sequence,
      action: `Acción ${index + 1}`,
    }));
    assert.equal(CEOPlanSchema.safeParse({ ...validPlan, weekly_plan: weeklyPlan }).success, false, sequences.join(","));
  }
  assert.equal(CEOPlanSchema.safeParse({ ...validPlan, weekly_plan: validPlan.weekly_plan.slice(0, 2) }).success, true);
});

test("rechaza el contrato estratégico antiguo basado únicamente en strings", () => {
  const legacyStrategicDiagnosis = {
    business_understanding: "Contexto",
    diagnosis: "Diagnóstico",
    bottleneck: "Cuello de botella",
    evidence: "Evidencia",
    uncertainty: "Incertidumbre",
    alternative_hypothesis: "Hipótesis alternativa",
    critical_decision: "Decisión crítica",
  };

  const parsed = CEOPlanSchema.safeParse({
    ...validPlan,
    strategic_diagnosis: legacyStrategicDiagnosis,
  });

  assert.equal(parsed.success, false);
});

test("acepta diagnósticos de recurrencia, capacidad y dependencia del empresario", () => {
  const recurringPlan = CEOPlanSchema.safeParse({
    ...validPlan,
    strategic_diagnosis: {
      ...validPlan.strategic_diagnosis,
      diagnosis: {
        ...validPlan.strategic_diagnosis.diagnosis,
        affected_area: "retention",
      },
    },
  });
  const agencyPlan = CEOPlanSchema.safeParse({
    ...validPlan,
    strategic_diagnosis: {
      ...validPlan.strategic_diagnosis,
      diagnosis: {
        ...validPlan.strategic_diagnosis.diagnosis,
        affected_area: "capacity",
      },
      bottleneck: {
        ...validPlan.strategic_diagnosis.bottleneck,
        area: "owner_dependency",
      },
    },
  });

  assert.equal(recurringPlan.success, true);
  assert.equal(agencyPlan.success, true);
});

test("no inventa variables de ecommerce no proporcionadas", () => {
  const ecommercePlan = CEOPlanSchema.safeParse({
    ...validPlan,
    strategic_diagnosis: {
      ...validPlan.strategic_diagnosis,
      business_understanding: {
        ...validPlan.strategic_diagnosis.business_understanding,
        business_model: "Venta de productos por comercio electrónico.",
        revenue_engine: "No determinado con la información disponible.",
      },
      unknowns: ["CAC, margen e inventario no fueron proporcionados."],
      evidence: validPlan.strategic_diagnosis.evidence.filter(
        (item) => item.source_field !== "diagnostic.salesProcess",
      ),
    },
  });

  assert.equal(ecommercePlan.success, true);
  assert.equal(
    ecommercePlan.success && ecommercePlan.data.strategic_diagnosis.unknowns.length,
    1,
  );
});

test("permite confianza baja y unknowns relevantes con información insuficiente", () => {
  const sparsePlan = CEOPlanSchema.safeParse({
    ...validPlan,
    strategic_diagnosis: {
      ...validPlan.strategic_diagnosis,
      confidence: "low",
      unknowns: [
        "No se conoce el volumen de clientes ni el proceso comercial completo.",
      ],
      alternative_hypothesis: null,
    },
  });

  assert.equal(sparsePlan.success, true);
});

test("exige evidencia trazable y permite target_metric sin cifra", () => {
  const invalidEvidence = CEOPlanSchema.safeParse({
    ...validPlan,
    strategic_diagnosis: {
      ...validPlan.strategic_diagnosis,
      evidence: [
        {
          fact: "Dato",
          source_field: "invented.field",
          interpretation: "Interpretación",
        },
      ],
    },
  });
  const validDecision = CEOPlanSchema.safeParse(validPlan);

  assert.equal(invalidEvidence.success, false);
  assert.equal(
    validDecision.success &&
      validDecision.data.strategic_diagnosis.critical_decision.target_metric,
    "conversaciones cualificadas",
  );

  assert.equal(
    CEOPlanSchema.safeParse({
      ...validPlan,
      strategic_diagnosis: {
        ...validPlan.strategic_diagnosis,
        confidence: "certain",
      },
    }).success,
    false,
  );
});

test("acepta únicamente rutas de evidencia presentes en los contratos actuales", () => {
  const validSourceFields = [
    "business.name",
    "business.revenueModel",
    "business.description",
    "diagnostic.businessStage",
    "diagnostic.teamSize",
    "diagnostic.ownerHoursPerWeek",
    "diagnostic.mainChallenge",
    "diagnostic.primaryGoal",
    "diagnostic.customersDescription",
    "diagnostic.salesProcess",
    "diagnostic.ownerResponsibilities",
    "diagnostic.monthlyRevenue",
    "diagnostic.currencyCode",
  ];

  for (const sourceField of validSourceFields) {
    const parsed = CEOPlanSchema.safeParse({
      ...validPlan,
      strategic_diagnosis: {
        ...validPlan.strategic_diagnosis,
        evidence: [
          {
            fact: "Dato proporcionado",
            source_field: sourceField,
            interpretation: "Interpretación verificable",
          },
        ],
      },
    });

    assert.equal(parsed.success, true, sourceField);
  }

  assert.equal(
    CEOPlanSchema.safeParse({
      ...validPlan,
      strategic_diagnosis: {
        ...validPlan.strategic_diagnosis,
        evidence: [
          {
            fact: "Dato inventado",
            source_field: "diagnostic.profitMargin",
            interpretation: "No debe aceptarse",
          },
        ],
      },
    }).success,
    false,
  );
});

test("rechaza confidence high cuando hay múltiples unknowns", () => {
  const highWithManyUnknowns = {
    ...validPlan,
    strategic_diagnosis: {
      ...validPlan.strategic_diagnosis,
      confidence: "high" as const,
      unknowns: ["Falta A", "Falta B"],
    },
  };

  assert.equal(CEOPlanSchema.safeParse(highWithManyUnknowns).success, true);
  assert.equal(
    validateCEOPlanBusinessRules(highWithManyUnknowns).success,
    false,
  );
  assert.equal(
    validateCEOPlanBusinessRules({
      ...highWithManyUnknowns,
      strategic_diagnosis: {
        ...highWithManyUnknowns.strategic_diagnosis,
        unknowns: ["Una ausencia no crítica"],
      },
    }).success,
    true,
  );
});

test("documenta que la validez semántica de una decisión requiere evaluación del modelo", () => {
  const taskLikeDecision = {
    ...validPlan,
    strategic_diagnosis: {
      ...validPlan.strategic_diagnosis,
      critical_decision: {
        question: "¿Debemos enviar mensajes?",
        recommended_direction: "Enviar mensajes.",
        rationale: "Es una opción para aprender.",
        expected_outcome: "Observar respuestas.",
        target_metric: "respuestas",
      },
    },
  };

  assert.equal(
    validateCEOPlanBusinessRules(taskLikeDecision).success,
    true,
  );
});

test("deriva el diagnóstico textual legacy del resumen estratégico", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  const result = await generateCEOPlan(input, async () => ({
    finalOutput: {
      ...validPlan,
      diagnosis: "Texto legacy divergente",
    },
  }));

  assert.equal(
    result.diagnosis,
    result.strategic_diagnosis.diagnosis.summary,
  );
});

test("mantiene los tres tipos y detecta más de una acción asistida", () => {
  const plan: CEOPlan = {
    ...validPlan,
    weekly_plan: [
      ...validPlan.weekly_plan.slice(0, 5),
      {
        sequence: 4,
        action: "Mejorar la propuesta",
        objective: "Aclarar el valor",
        reason: "Reduce una incertidumbre comercial.",
        success_metric: "La propuesta se entiende en una prueba",
        expected_result: "Saber si el valor se entiende mejor.",
        role_recommendation: "execute",
        role_reason: "La validación requiere aprendizaje directo del empresario.",
        estimated_hours: 1,
        execution_mode: "ai_assisted",
        action_type: "value_proposition",
      },
      {
        sequence: 5,
        action: "Escribir mensajes comerciales",
        objective: "Probar tres ángulos",
        reason: "Valida la dirección comercial recomendada.",
        success_metric: "Registrar respuestas",
        expected_result: "Identificar el ángulo con mayor respuesta.",
        role_recommendation: "execute",
        role_reason: "La selección del ángulo requiere criterio comercial directo.",
        estimated_hours: 1,
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
  assert.deepEqual(result, {
    ...validPlan,
    diagnosis: validPlan.strategic_diagnosis.diagnosis.summary,
  });
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

test("valida las cuatro recomendaciones de rol y sus horas", () => {
  const roleCases = [
    ["execute", 1],
    ["delegate", 1.5],
    ["automate", 0.5],
    ["defer", 0],
  ] as const;

  for (const [role, hours] of roleCases) {
    const plan = {
      ...validPlan,
      weekly_plan: [{
        ...validPlan.weekly_plan[0],
        role_recommendation: role,
        estimated_hours: hours,
      }],
    };

    assert.equal(CEOPlanSchema.safeParse(plan).success, true, role);
    assert.equal(validateCEOPlanBusinessRules(plan).success, true, role);
  }

  for (const [role, hours] of [["execute", 0], ["delegate", 0], ["automate", 0], ["defer", 1]] as const) {
    const plan = {
      ...validPlan,
      weekly_plan: [{
        ...validPlan.weekly_plan[0],
        role_recommendation: role,
        estimated_hours: hours,
      }],
    };

    assert.equal(validateCEOPlanBusinessRules(plan).success, false, `${role}:${hours}`);
  }

  assert.equal(
    CEOPlanSchema.safeParse({
      ...validPlan,
      weekly_plan: [{ ...validPlan.weekly_plan[0], role_recommendation: "unknown" }],
    }).success,
    false,
  );
});

test("rechaza capacidad excedida y la generación la trata como error retryable", async () => {
  const withinCapacity = {
    ...validPlan,
    weekly_plan: validPlan.weekly_plan.map((item) => ({ ...item, estimated_hours: 1 })),
  };
  const overCapacity = {
    ...validPlan,
    weekly_plan: validPlan.weekly_plan.map((item) => ({ ...item, estimated_hours: 2 })),
  };

  assert.equal(validateCEOPlanBusinessRules(withinCapacity, 5).success, true);
  assert.equal(validateCEOPlanBusinessRules(overCapacity, 5).success, false);

  process.env.OPENAI_API_KEY = "test-key";
  let attempts = 0;
  await assert.rejects(
    generateCEOPlan({
      ...input,
      diagnostic: { ...input.diagnostic, ownerHoursPerWeek: 5 },
    }, async () => {
      attempts += 1;
      return { finalOutput: overCapacity };
    }),
    (error: unknown) =>
      error instanceof CEOPlanError && isRetryableCEOPlanError(error),
  );
  assert.equal(attempts, 2);
});

test("calcula la reserva de tiempo en la aplicación y no prohíbe delegate con teamSize uno", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  const delegatedPlan = {
    ...validPlan,
    weekly_plan: [{
      ...validPlan.weekly_plan[0],
      role_recommendation: "delegate" as const,
      estimated_hours: 1,
    }, {
      ...validPlan.weekly_plan[1],
      role_recommendation: "automate" as const,
      estimated_hours: 1.5,
    }],
  };
  const result = await generateCEOPlan({
    ...input,
    diagnostic: { ...input.diagnostic, ownerHoursPerWeek: 8, teamSize: 1 },
  }, async () => ({ finalOutput: delegatedPlan }));

  assert.deepEqual(result.time_allocation, {
    available_hours: 8,
    allocated_hours: 2.5,
    reserved_hours: 5.5,
    rationale: validPlan.time_allocation.rationale,
  });
  // teamSize = 1 se evalúa por prompt/model evaluation, no por una prohibición determinista.
  assert.equal(result.weekly_plan[0].role_recommendation, "delegate");
});

test("la migración de roles y tiempo mantiene la persistencia atómica", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261025000000_add_role_time_allocation.sql",
    ),
    "utf8",
  );

  assert.match(migration, /add column if not exists time_allocation jsonb/);
  assert.match(migration, /add column if not exists role_recommendation/);
  assert.match(migration, /add column if not exists role_reason/);
  assert.match(migration, /add column if not exists estimated_hours/);
  assert.match(migration, /p_time_allocation jsonb/);
  assert.match(migration, /CEO_PLAN_ROLE_PAYLOAD_MISMATCH/);
  assert.match(migration, /role_recommendation = 'defer' and estimated_hours = 0/);
  assert.match(migration, /set time_allocation = p_time_allocation/);
});