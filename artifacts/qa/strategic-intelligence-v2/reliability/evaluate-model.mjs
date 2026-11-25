import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const folder = path.dirname(fileURLToPath(import.meta.url));
const dist = (file) => path.join(root, ".test-dist", "src", file + ".js");
const load = createRequire(import.meta.url);
const { generateCEOPlan } = load(dist("lib/ai/generate-ceo-plan"));
const { buildStrategicContext } = load(dist("lib/strategic-context"));
const { assessFeasibility, sameWork } = load(dist("lib/strategic-action"));
const { buildBusinessAssessment } = load(dist("lib/business-assessment-adapter"));

assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, "127.0.0.1");
assert.ok(process.env.OPENAI_API_KEY, "Falta el proveedor para la evaluación real.");

const common = {
  businessStage: "starting", teamSize: 3, ownerHoursPerWeek: 25,
  monthlyRevenue: null, currencyCode: "USD",
};
const actionRows = [
  { action: "Definir una oferta principal centrada en un problema urgente del hogar",
    objective: "Clarificar la oferta", state: "completed", result: { offer: "Reparaciones urgentes en el hogar con diagnóstico inicial y cotización por trabajo" } },
  { action: "Crear dos mensajes comerciales distintos para publicar o probar",
    objective: "Preparar la ejecución comercial", state: "pending" },
  { action: "Registrar respuestas y clasificar dudas e intereses",
    objective: "Detectar interés real", state: "pending" },
];
// Use UUID-like IDs to replicate real pipeline conditions (not predictable synthetic IDs)
const historyIds = [
  "a1b2c3d4-e5f6-7001-8abc-def012345671",
  "a1b2c3d4-e5f6-7001-8abc-def012345672",
  "a1b2c3d4-e5f6-7001-8abc-def012345673",
];
const history = actionRows.map((row, i) => ({
  id: historyIds[i], week: 1,
  action: row.action, objective: row.objective, status: row.state, strategy: null,
  result: row.result ? JSON.stringify(row.result) : null,
}));
const previousDecision = {
  question: "¿Necesitamos enfocar la oferta para obtener primeros contactos?",
  recommended_direction: "Definir una oferta de reparaciones urgentes y probar interés",
  rationale: "El servicio aún está validando cómo conseguir clientes.",
  expected_outcome: "Consultas iniciales sobre reparaciones urgentes",
  target_metric: "Consultas cualificadas",
};
const priorReview = {
  outcomeStatus: "no_change", outcomeSummary: "No se obtuvieron resultados empresariales.",
  completedActions: 1, totalActions: 3, nextWeekFocus: "Captar clientes potenciales.",
  whatWorked: "", whatDidntWork: "", businessChanges: "",
  decisionLearning: {
    decisionQuestion: previousDecision.question,
    recommendedDirection: previousDecision.recommended_direction,
    hypothesis: "La oferta enfocada producirá consultas",
    targetMetric: previousDecision.target_metric, expectedOutcome: previousDecision.expected_outcome,
    observedResult: "No se obtuvieron resultados empresariales.",
    evidence: ["No disponemos de evidencia de mercado."], learning: "Generar marketing más enfocado.",
    hypothesisStatus: "validated",
  },
};
const previousWeek = {
  weekNumber: 1, executiveSummary: "Oferta lista, prueba pendiente.", diagnosis: "Falta validar adquisición.",
  strategicDiagnosis: { critical_decision: previousDecision }, priorities: [], weeklyPlan: [],
  actions: actionRows.map((row, i) => ({
    sequence: i + 1, action: row.action, objective: row.objective, reason: "Validar adquisición",
    successMetric: "Registro completado", expectedResult: "Avanzar en la prueba", roleRecommendation: "execute",
    roleReason: "Requiere una decisión directa", estimatedHours: 2, status: row.state, completionData: row.result,
  })),
  review: priorReview,
};
function memory(key, availability, suffix) {
  return {
    id: "00000000-0000-4000-8000-00000000001" + suffix, memory_key: key,
    category: availability === "unavailable" ? "constraint" : "asset",
    content: { label: key, availability }, origin: "owner_input", source_id: null,
    confirmation: "declared", observed_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-01T12:00:00Z",
  };
}
const cases = [
  {
    name: "mantenimiento",
    input: {
      business: { name: "Mantenimiento QA", revenueModel: "Servicios de pintura, electricidad, instalaciones y reparaciones por encargo.", description: "Equipo de tres personas para trabajos en el hogar." },
      diagnostic: {
        ...common, mainChallenge: "Dar a conocer la empresa", primaryGoal: "Conseguir 36 clientes fijos a largo plazo",
        customersDescription: "Hogares con una reparación urgente o mantenimiento pendiente.",
        salesProcess: "Publicidad en internet. No tengo redes sociales ni otro canal digital confirmado.",
        ownerResponsibilities: "El propietario cotiza y coordina al equipo.",
      },
      previousWeek, businessKnowledge: { valueProposition: null },
    },
    history, memory: [memory("social_media", "unavailable", "1")],
  },
  {
    name: "limpieza",
    input: {
      business: { name: "Limpieza QA", revenueModel: "Limpieza de sofás y colchones a domicilio según pieza, zona y traslado.", description: "Dos personas, operación en dos barrios contiguos." },
      diagnostic: {
        ...common, teamSize: 2, ownerHoursPerWeek: 4, mainChallenge: "Conseguir clientes en zonas geográficas concretas.",
        primaryGoal: "Crecer comercialmente sin dispersar traslados.", customersDescription: "Hogares con muebles o colchones en los dos barrios.",
        salesProcess: "Recomendaciones de contactos existentes y WhatsApp disponible. No tengo redes sociales.",
        ownerResponsibilities: "Atienden clientes y coordinan agenda los propietarios.",
      },
      previousWeek: null, businessKnowledge: { valueProposition: null },
    },
    history: [], memory: [memory("social_media", "unavailable", "1"), memory("whatsapp", "available", "2"), memory("existing_contacts", "available", "3")],
  },
];

const cleaning = cases[1];
const preparedOffer = {
  id: "b2c3d4e5-f601-7002-8bcd-ef1234567801", week: 1,
  action: "Definir la oferta principal para limpieza de muebles en dos barrios",
  objective: "Acotar la captación a los barrios que podemos atender", status: "completed", strategy: null,
  result: "Limpieza de sofás y colchones a domicilio en dos barrios contiguos, precio por pieza y traslado local.",
};
cleaning.history = [preparedOffer];
cleaning.input.previousWeek = { ...previousWeek,
  executiveSummary: "Oferta local lista. Ya se conocen dos contactos de la zona que pidieron información.",
  diagnosis: "Captación por barrio y capacidad limitada a cuatro horas.",
  actions: [{ ...previousWeek.actions[0], action: preparedOffer.action, objective: preparedOffer.objective, completionData: preparedOffer.result }],
  review: { ...priorReview, outcomeStatus: "mixed", outcomeSummary: "Dos propietarios preguntaron por limpieza. Aún no hay reserva.",
    totalActions: 1, nextWeekFocus: "Probar el servicio usando WhatsApp y contactos en los dos barrios.",
    decisionLearning: { ...priorReview.decisionLearning,
      decisionQuestion: "¿Conviene acotar la oferta y la prueba a dos barrios próximos?",
      hypothesis: "Una oferta local produce consultas de la zona", recommendedDirection: "Usar la oferta local",
      observedResult: "Dos propietarios preguntaron por limpieza. Aún no hay reserva.",
      evidence: ["Dos consultas de propietarios en los barrios objetivo."],
      learning: "La disponibilidad por barrio condiciona la captación y el costo de traslado.", hypothesisStatus: "inconclusive" },
  },
};

const report = {
  version: "v7-strategic-reliability",
  model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  budget: { scenarios: 2, generationsPerScenario: 5, maxAgentCallsPerGeneration: 2, maxAgentCalls: 20 },
  results: [],
};
const output = path.join(folder, "MODEL-EVALUATION.json");
const jobs = cases.flatMap((entry) => Array.from({ length: 5 }, (_, index) => ({ entry, sample: index + 1 })));
async function worker() {
  for (;;) {
    const job = jobs.shift();
    if (!job) return;
    const { entry, sample } = job;
    const history = entry.history;
    const previousWeek = structuredClone(entry.input.previousWeek);
    previousWeek.review.decisionLearning.hypothesisStatus = "inconclusive";
    const strategicContext = buildStrategicContext({ targetWeek: 2, memory: entry.memory, history,
      evidence: [], knowledge: entry.input.businessKnowledge, declaredContext: entry.input.diagnostic.salesProcess });
    // Build assessment to match real pipeline conditions
    const assessment = buildBusinessAssessment({
      diagnostic: entry.input.diagnostic,
      evidence: [],
      completedActions: previousWeek?.review?.completedActions ?? 1,
      totalActions: previousWeek?.review?.totalActions ?? 3,
      latestReview: previousWeek ? { outcome_status: previousWeek.review.outcomeStatus } : null,
      reviewedWeeks: previousWeek ? 1 : 0,
    });
    const started = Date.now();
    const attempts = [];
    const record = { scenario: entry.name, sample, targetWeek: 2, attempts };
    try {
      const plan = await generateCEOPlan({ ...entry.input, previousWeek, strategicContext, assessment }, undefined, (attempt) => attempts.push(attempt));
      record.status = "PASS";
      record.decision = plan.strategic_diagnosis.critical_decision;
      record.continuity = plan.strategic_continuity;
      record.time = plan.time_allocation;
      record.actions = plan.weekly_plan.map((item) => {
        const dependency = plan.weekly_plan.find((step) => step.sequence === item.strategy?.depends_on_sequence);
        const buildsOffer = dependency?.strategy?.work_key === "offer_definition" && dependency.strategy.intent === "build";
        const resources = buildsOffer ? { ...strategicContext.resources, value_proposition: "available" } : strategicContext.resources;
        return { title: item.action, reason: item.reason, expectedResult: item.expected_result, successMetric: item.success_metric,
          strategy: item.strategy, feasibility: assessFeasibility(item, resources, history).status,
          matchingPrior: history.find((previous) => sameWork(previous, item))?.id ?? null };
      });
    } catch (error) {
      record.status = "FAIL";
      record.code = error.code ?? error.name;
    }
    record.durationMs = Date.now() - started;
    report.results.push(record);
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    console.log(record.scenario, sample, record.status, attempts.length, record.durationMs);
  }
}
await Promise.all([worker(), worker()]);
