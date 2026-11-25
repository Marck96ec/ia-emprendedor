import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { run } from "@openai/agents";

const root = process.cwd();
const folder = path.dirname(fileURLToPath(import.meta.url));
const dist = (file) => path.join(root, ".test-dist", "src", file + ".js");
const load = createRequire(import.meta.url);
const { generateCEOPlan } = load(dist("lib/ai/generate-ceo-plan"));
const { buildStrategicContext } = load(dist("lib/strategic-context"));
const { assessFeasibility, sameWork } = load(dist("lib/strategic-action"));

assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, "127.0.0.1");
assert.ok(process.env.OPENAI_API_KEY, "Falta el proveedor para la evaluación real.");

const originalSources = new Set([
  "lib/ai/generate-ceo-plan", "lib/ai/ceo-agent", "lib/strategic-continuity", "lib/decision-learning",
]);
const originals = new Map();
function original(file) {
  if (originals.has(file)) return originals.get(file).exports;
  const source = execFileSync("git", [
    "show", "a43187b8583f281ebdd701e3ae6499cd3084f8b5:src/" + file + ".ts",
  ], { encoding: "utf8" });
  const filename = dist(file);
  const entry = new Module(filename);
  entry.filename = filename;
  entry.paths = Module._nodeModulePaths(path.dirname(filename));
  const loadDependency = createRequire(filename);
  entry.require = (specifier) => {
    if (specifier.startsWith(".")) {
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
      if (originalSources.has(relative)) return original(relative);
    }
    return loadDependency(specifier);
  };
  originals.set(file, entry);
  entry._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return entry.exports;
}

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
const history = actionRows.map((row, i) => ({
  id: "00000000-0000-4000-8000-00000000000" + (i + 1), week: 1,
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

async function compare(entry, version, sample) {
  const started = Date.now();
  const attempts = [];
  const targetWeek = entry.name === "mantenimiento" ? 2 : 1;
  const strategicContext = buildStrategicContext({
    targetWeek, memory: entry.memory, history: entry.history,
    knowledge: entry.input.businessKnowledge, evidence: [], declaredContext: entry.input.diagnostic.salesProcess,
  });
  const baseline = version === "baseline";
  const generate = baseline ? original("lib/ai/generate-ceo-plan").generateCEOPlan : generateCEOPlan;
  const input = baseline ? entry.input : {
    ...entry.input, strategicContext,
    previousWeek: entry.input.previousWeek ? {
      ...entry.input.previousWeek, review: {
        ...entry.input.previousWeek.review,
        decisionLearning: { ...entry.input.previousWeek.review.decisionLearning, hypothesisStatus: "inconclusive" },
      },
    } : null,
  };
  let record;
  try {
    const plan = await generate(input, async (agent, prompt) => {
      const time = Date.now();
      const result = await run(agent, prompt);
      attempts.push({
        seconds: (Date.now() - time) / 1000, promptChars: prompt.length,
        inputTokens: result.rawResponses.reduce((sum, r) => sum + (r.usage?.inputTokens ?? 0), 0),
        outputTokens: result.rawResponses.reduce((sum, r) => sum + (r.usage?.outputTokens ?? 0), 0),
      });
      return result;
    });
    const actions = plan.weekly_plan.map((item) => {
      const feasibility = assessFeasibility(item, strategicContext.resources, entry.history);
      const prior = entry.history.find((previous) => sameWork(previous, item));
      return { ...item, feasibility, matchingPrior: prior ? { id: prior.id, status: prior.status } : null };
    });
    record = {
      status: "PASS", decision: plan.strategic_diagnosis.critical_decision,
      diagnosis: plan.strategic_diagnosis.diagnosis, hours: plan.time_allocation,
      continuity: plan.strategic_continuity, actions,
      blocked: actions.filter((item) => ["blocked", "requires_prerequisite"].includes(item.feasibility.status)).length,
      undocumentedOverlap: actions.filter((item) => item.matchingPrior && !item.strategy?.prior_action_id).length,
    };
  } catch (error) {
    record = { status: "FAIL", code: error.code ?? error.name, messages: error.issueMessages ?? [] };
  }
  return { case: entry.name, version, sample, seconds: (Date.now() - started) / 1000, attempts, ...record };
}

const output = [];
const versions = process.env.QA_COMPARE_V2_ONLY ? ["v2"] : ["baseline", "v2"];
const reportName = process.env.QA_COMPARE_FINAL ? "model-evaluations-final.json"
  : process.env.QA_COMPARE_V2_ONLY ? "model-evaluations-adjusted.json" : "model-evaluations.json";
const jobs = cases.flatMap((entry) => [1, 2, 3].flatMap((sample) =>
  versions.map((version) => ({ entry, version, sample }))));
async function worker() {
  for (;;) {
    const job = jobs.shift();
    if (!job) return;
    const result = await compare(job.entry, job.version, job.sample);
    output.push(result);
    fs.writeFileSync(path.join(folder, reportName), JSON.stringify(output, null, 2) + "\n");
    console.log(result.case, result.version, result.sample, result.status, result.code ?? result.blocked, result.seconds);
  }
}
await Promise.all([worker(), worker()]);

