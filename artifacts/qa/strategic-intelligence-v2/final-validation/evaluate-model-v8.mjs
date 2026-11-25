/**
 * Evaluador v8 — Final Release Validation
 *
 * Cambios respecto a v7:
 * - crypto.randomUUID() para todos los IDs (no IDs predecibles)
 * - Escenarios semana 2 y semana 4
 * - Historial acumulado (3 semanas × 2-3 acciones)
 * - Evidencias válidas e "unknown" mezcladas
 * - Acciones pendientes y completadas en historial
 * - Restricciones vigentes
 * - Dependencias históricas (prior_action_id requerido)
 *
 * Budget: controla llamadas acumuladas y detiene cuando API_CALL_LIMIT se alcanza.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import module from "node:module";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const folder = path.dirname(fileURLToPath(import.meta.url));
const dist = (file) => path.join(root, ".test-dist", "src", file + ".js");

// Resolve @/ alias used by test-dist compiled modules
const compiledSourceRoot = path.join(root, ".test-dist", "src");
const originalResolve = module._resolveFilename;
module._resolveFilename = function resolveWithAlias(request, ...rest) {
  const target = request.startsWith("@/")
    ? path.join(compiledSourceRoot, request.slice(2))
    : request;
  return originalResolve.call(this, target, ...rest);
};

const load = createRequire(import.meta.url);
const { generateCEOPlan } = load(dist("lib/ai/generate-ceo-plan"));
const { buildStrategicContext } = load(dist("lib/strategic-context"));
const { assessFeasibility, sameWork } = load(dist("lib/strategic-action"));
const { buildBusinessAssessment } = load(dist("lib/business-assessment-adapter"));

assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, "127.0.0.1");
assert.ok(process.env.OPENAI_API_KEY, "Falta OPENAI_API_KEY para la evaluación real.");

// ── Budget control ─────────────────────────────────────────────────────────
const API_CALL_LIMIT = parseInt(process.env.API_CALL_LIMIT ?? "40", 10);
let apiCallsUsed = 0;

function trackAttempt(attempt) {
  apiCallsUsed += 1;
  if (apiCallsUsed > API_CALL_LIMIT) {
    throw new Error(`BUDGET_EXCEEDED: ${apiCallsUsed} calls used, limit is ${API_CALL_LIMIT}`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const common = {
  businessStage: "starting", teamSize: 3, ownerHoursPerWeek: 25,
  monthlyRevenue: null, currencyCode: "USD",
};

function uid() { return crypto.randomUUID(); }

function action(text, objective, state, result = null) {
  return { id: uid(), action: text, objective, state, result };
}

function memoryRow(key, availability, suffix = "") {
  return {
    id: uid(), memory_key: key,
    category: availability === "unavailable" ? "constraint" : "asset",
    content: { label: key, availability }, origin: "owner_input", source_id: null,
    confirmation: "declared", observed_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-01T12:00:00Z",
  };
}

function evidenceRow(summary, certainty) {
  return {
    id: uid(), certainty, summary,
    created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z",
  };
}

function weekHistory(actions) {
  return actions.map((a, i) => ({
    id: a.id, week: a.week ?? 1,
    action: a.action, objective: a.objective, status: a.state, strategy: null,
    result: a.result ? JSON.stringify(a.result) : null,
  }));
}

function buildPreviousWeek(weekNumber, actions, outcomeStatus, outcomeSummary, decision, focus) {
  return {
    weekNumber,
    executiveSummary: `Semana ${weekNumber} completada. ${outcomeSummary}`,
    diagnosis: "Continuación estratégica.",
    strategicDiagnosis: {
      critical_decision: {
        question: decision.question,
        recommended_direction: decision.direction,
        rationale: decision.rationale,
        expected_outcome: decision.expected,
        target_metric: decision.metric,
      },
    },
    priorities: [], weeklyPlan: [],
    actions: actions.map((a, i) => ({
      sequence: i + 1, action: a.action, objective: a.objective,
      reason: "Validar adquisición", successMetric: "Registro completado",
      expectedResult: "Avanzar en la prueba", roleRecommendation: "execute",
      roleReason: "Decisión directa", estimatedHours: 3,
      status: a.state, completionData: a.result,
    })),
    review: {
      outcomeStatus, outcomeSummary,
      whatWorked: "", whatDidntWork: "", businessChanges: "",
      completedActions: actions.filter((a) => a.state === "completed").length,
      totalActions: actions.length, nextWeekFocus: focus,
      decisionLearning: {
        decisionQuestion: decision.question,
        recommendedDirection: decision.direction,
        hypothesis: "La acción produce el resultado esperado",
        targetMetric: decision.metric, expectedOutcome: decision.expected,
        observedResult: outcomeSummary,
        evidence: ["Evidencia declarada por el propietario."],
        learning: "Continuar validando.",
        hypothesisStatus: "inconclusive",
      },
    },
  };
}

// ── Scenario definitions ──────────────────────────────────────────────────

/**
 * S1: Mantenimiento semana 2 — modelo debe referenciar UUID de acción previa
 * Causa a validar: C1 — fix inyecta IDs válidos en prompt de reparación
 */
function buildMantenimientoW2() {
  const w1Actions = [
    action("Definir una oferta principal centrada en un problema urgente del hogar", "Clarificar la oferta", "completed", { offer: "Reparaciones urgentes con diagnóstico y cotización por trabajo" }),
    action("Crear dos mensajes comerciales distintos para publicar o probar", "Preparar ejecución comercial", "pending"),
    action("Registrar respuestas y clasificar dudas e intereses", "Detectar interés real", "pending"),
  ].map((a, i) => ({ ...a, week: 1 }));

  const history = weekHistory(w1Actions);
  const memory = [memoryRow("social_media", "unavailable")];
  const previousWeek = buildPreviousWeek(1, w1Actions, "no_change",
    "No se obtuvieron resultados empresariales.",
    { question: "¿Necesitamos enfocar la oferta?", direction: "Oferta de reparaciones urgentes", rationale: "Validando captación.", expected: "Consultas iniciales", metric: "Consultas cualificadas" },
    "Captar clientes potenciales."
  );

  return {
    name: "mantenimiento_w2",
    targetWeek: 2,
    input: {
      business: { name: "Mantenimiento Hogares QA", revenueModel: "Servicios de reparación por encargo.", description: "Equipo de tres personas." },
      diagnostic: { ...common, mainChallenge: "Dar a conocer la empresa", primaryGoal: "36 clientes fijos", customersDescription: "Hogares con reparaciones urgentes.", salesProcess: "Publicidad en internet. No tengo redes sociales.", ownerResponsibilities: "El propietario cotiza y coordina." },
      previousWeek, businessKnowledge: { valueProposition: null },
    },
    history, memory,
  };
}

/**
 * S2: Limpieza semana 4 — historial acumulado 3 semanas, 7 acciones
 * Causa a validar: C3 — acumulación de historial + C1
 */
function buildLimpiezaW4() {
  const w1a = action("Definir la oferta de limpieza de muebles para los dos barrios", "Acotar la captación", "completed", { offer: "Limpieza a domicilio en dos barrios, precio por pieza y traslado." });
  const w2a = action("Publicar la oferta usando los contactos existentes en WhatsApp", "Probar captación por referidos", "completed", { result: "2 consultas, 1 reserva." });
  const w2b = action("Registrar las consultas recibidas y medir tiempo de traslado", "Validar eficiencia de zona", "completed", { result: "Traslado promedio 20 min. Ambos barrios son viables." });
  const w3a = action("Contactar directamente a 5 propietarios en el barrio norte con la oferta", "Captar primer cliente pagador", "completed", { result: "1 servicio completado. Cliente satisfecho." });
  const w3b = action("Preparar materiales para publicar en grupos del barrio por WhatsApp", "Ampliar alcance en zona", "pending");

  const allActions = [
    { ...w1a, week: 1 }, { ...w2a, week: 2 }, { ...w2b, week: 2 },
    { ...w3a, week: 3 }, { ...w3b, week: 3 },
  ];
  const history = weekHistory(allActions);

  const evidence = [
    evidenceRow("Dos consultas iniciales tras publicar por WhatsApp.", "likely"),
    evidenceRow("Un servicio completado con cliente satisfecho en barrio norte.", "confirmed"),
    evidenceRow("Traslado promedio 20 minutos dentro de los dos barrios.", "likely"),
    evidenceRow("Propietaria preguntó si limpiamos alfombras también.", "unknown"),
  ];
  const memory = [
    memoryRow("social_media", "unavailable"),
    memoryRow("whatsapp", "available"),
    memoryRow("existing_contacts", "available"),
  ];

  const previousWeek = buildPreviousWeek(3, [w3a, w3b], "mixed",
    "Un servicio completado. Captación parcial por referidos.",
    { question: "¿Usar WhatsApp y referidos como canal principal en los dos barrios?", direction: "Canal WhatsApp + referidos en zona", rationale: "Único canal disponible.", expected: "1-2 servicios semana 4", metric: "Servicios completados" },
    "Escalar captación usando clientes satisfechos."
  );

  return {
    name: "limpieza_w4",
    targetWeek: 4,
    input: {
      business: { name: "Limpieza Muebles QA", revenueModel: "Limpieza de sofás y colchones a domicilio.", description: "Dos personas, dos barrios contiguos." },
      diagnostic: { ...common, teamSize: 2, ownerHoursPerWeek: 4, mainChallenge: "Conseguir clientes en zonas concretas.", primaryGoal: "Crecer sin dispersar traslados.", customersDescription: "Hogares con muebles en los dos barrios.", salesProcess: "WhatsApp y contactos. No tengo redes sociales.", ownerResponsibilities: "Atienden y coordinan los propietarios." },
      previousWeek, businessKnowledge: { valueProposition: null },
    },
    history, memory, evidence,
  };
}

/**
 * S3: Mantenimiento semana 4 — 3 semanas acumuladas, pendientes sin completar
 * Causa a validar: C3 — pending actions in history → continuation vs new
 */
function buildMantenimientoW4() {
  const w1a = action("Definir la oferta principal", "Clarificar propuesta", "completed", { offer: "Reparaciones urgentes con diagnóstico." });
  const w1b = action("Crear dos mensajes comerciales", "Preparar ejecución", "completed", { result: "Dos mensajes listos." });
  const w2a = action("Publicar en grupos de vecinos por WhatsApp", "Conseguir primera respuesta", "completed", { result: "3 personas preguntaron. Sin reserva." });
  const w2b = action("Contactar por teléfono a las 3 personas que preguntaron", "Convertir consulta en trabajo", "pending");
  const w3a = action("Crear perfil básico en Google Maps sin redes sociales", "Visibilidad en búsquedas locales", "pending");

  const allActions = [
    { ...w1a, week: 1 }, { ...w1b, week: 1 },
    { ...w2a, week: 2 }, { ...w2b, week: 2 },
    { ...w3a, week: 3 },
  ];
  const history = weekHistory(allActions);
  const memory = [memoryRow("social_media", "unavailable"), memoryRow("whatsapp", "available")];

  const previousWeek = buildPreviousWeek(3, [w3a], "no_change",
    "Se creó perfil en Google Maps pero no hay contactos nuevos aún.",
    { question: "¿Cómo conseguir primeros clientes sin redes sociales?", direction: "Visibilidad local y seguimiento de consultas", rationale: "Sin redes, el canal es búsquedas locales y referidos.", expected: "Primeras consultas orgánicas", metric: "Consultas recibidas" },
    "Seguir acciones de visibilidad y captar pendientes."
  );

  return {
    name: "mantenimiento_w4",
    targetWeek: 4,
    input: {
      business: { name: "Mantenimiento Hogares QA", revenueModel: "Servicios de reparación por encargo.", description: "Equipo de tres personas." },
      diagnostic: { ...common, mainChallenge: "Conseguir clientes sin redes sociales", primaryGoal: "36 clientes fijos", customersDescription: "Hogares con reparaciones urgentes.", salesProcess: "No tengo redes sociales. Busco visibilidad local.", ownerResponsibilities: "El propietario cotiza y coordina." },
      previousWeek, businessKnowledge: { valueProposition: null },
    },
    history, memory,
  };
}

/**
 * S4: Café Horizonte semana 2 — restricción: solo pedidos en mostrador, sin delivery
 * Causa a validar: C1 con restricciones vigentes
 */
function buildCafeW2() {
  const w1a = action("Definir la oferta de café de especialidad para clientes del barrio", "Clarificar propuesta de valor", "completed", { offer: "Café de especialidad con preparación visible y sin delivery." });
  const w1b = action("Preparar dos mensajes para publicar en grupos locales", "Probar canal WhatsApp", "pending");

  const allActions = [{ ...w1a, week: 1 }, { ...w1b, week: 1 }];
  const history = weekHistory(allActions);
  const memory = [
    memoryRow("social_media", "unavailable"),
    memoryRow("delivery_service", "unavailable"),
    memoryRow("whatsapp", "available"),
  ];

  const previousWeek = buildPreviousWeek(1, [w1a, w1b], "mixed",
    "Oferta definida. Mensaje pendiente de enviar.",
    { question: "¿Cómo captar clientes sin delivery ni redes sociales?", direction: "Captar barrio con canal WhatsApp y presencia física", rationale: "Sin delivery ni redes, el foco es tráfico local.", expected: "Primeras visitas de barrio", metric: "Visitas al mostrador" },
    "Enviar mensajes a grupos locales y medir respuesta."
  );

  return {
    name: "cafe_horizonte_w2",
    targetWeek: 2,
    input: {
      business: { name: "Café Horizonte QA", revenueModel: "Venta de café de especialidad en mostrador.", description: "Local pequeño en barrio residencial." },
      diagnostic: { ...common, teamSize: 2, ownerHoursPerWeek: 20, mainChallenge: "Atraer clientes del barrio", primaryGoal: "50 clientes recurrentes", customersDescription: "Residentes del barrio que toman café.", salesProcess: "Sin redes sociales. Sin delivery. Solo WhatsApp.", ownerResponsibilities: "El propietario atiende y prepara." },
      previousWeek, businessKnowledge: { valueProposition: null },
    },
    history, memory,
  };
}

/**
 * S5: Taller Andino semana 2 — historial con acción completada y dependencia esperada
 * Causa a validar: C1 con completed_prerequisite_id
 */
function buildTallerW2() {
  const w1a = action("Definir catálogo mínimo de piezas artesanales con precio por pieza", "Clarificar la oferta", "completed", { offer: "Catálogo de 5 piezas artesanales, precio 15-45 USD por pieza." });
  const w1b = action("Fotografiar las 5 piezas del catálogo para usarlas en ventas", "Preparar material visual", "completed", { result: "5 fotos de buena calidad disponibles." });
  const w1c = action("Contactar a 3 compradores conocidos con el catálogo y fotos", "Conseguir primera venta", "pending");

  const allActions = [{ ...w1a, week: 1 }, { ...w1b, week: 1 }, { ...w1c, week: 1 }];
  const history = weekHistory(allActions);
  const memory = [
    memoryRow("social_media", "unavailable"),
    memoryRow("existing_buyers", "available"),
  ];

  const previousWeek = buildPreviousWeek(1, [w1a, w1b, w1c], "mixed",
    "Catálogo y fotos listos. Contacto pendiente.",
    { question: "¿Cómo conseguir primera venta con catálogo listo?", direction: "Usar compradores conocidos con catálogo y fotos", rationale: "Canal disponible con material preparado.", expected: "Primera venta concretada", metric: "Ventas realizadas" },
    "Contactar compradores conocidos y cerrar primera venta."
  );

  return {
    name: "taller_andino_w2",
    targetWeek: 2,
    input: {
      business: { name: "Taller Andino QA", revenueModel: "Venta de artesanías por encargo y catálogo.", description: "Taller familiar, piezas únicas." },
      diagnostic: { ...common, teamSize: 2, ownerHoursPerWeek: 15, mainChallenge: "Conseguir primeras ventas", primaryGoal: "Ventas mensuales sostenibles", customersDescription: "Compradores de artesanías, turistas y coleccionistas.", salesProcess: "Sin redes sociales. Compradores conocidos disponibles.", ownerResponsibilities: "El propietario produce y vende." },
      previousWeek, businessKnowledge: { valueProposition: null },
    },
    history, memory,
  };
}

// ── Scenario registry ─────────────────────────────────────────────────────
const SAMPLES_PER_SCENARIO = 3;

const scenarios = [
  buildMantenimientoW2(),
  buildCafeW2(),
  buildTallerW2(),
  buildMantenimientoW4(),
  buildLimpiezaW4(),
];

const report = {
  version: "v8-final-validation",
  date: new Date().toISOString().slice(0, 10),
  model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  budget: { scenarios: scenarios.length, samplesPerScenario: SAMPLES_PER_SCENARIO, maxApiCallLimit: API_CALL_LIMIT },
  results: [],
  apiCallsUsed: 0,
};

const output = path.join(folder, "MODEL-EVALUATION.json");
const jobs = scenarios.flatMap((entry) =>
  Array.from({ length: SAMPLES_PER_SCENARIO }, (_, index) => ({ entry, sample: index + 1 }))
);

async function worker() {
  for (;;) {
    const job = jobs.shift();
    if (!job) return;
    const { entry, sample } = job;

    if (apiCallsUsed >= API_CALL_LIMIT) {
      report.results.push({ scenario: entry.name, sample, status: "SKIPPED_BUDGET", targetWeek: entry.targetWeek });
      continue;
    }

    const previousWeek = structuredClone(entry.input.previousWeek);
    if (previousWeek?.review?.decisionLearning) {
      previousWeek.review.decisionLearning.hypothesisStatus = "inconclusive";
    }

    const strategicContext = buildStrategicContext({
      targetWeek: entry.targetWeek,
      memory: entry.memory,
      history: entry.history,
      evidence: entry.evidence ?? [],
      knowledge: entry.input.businessKnowledge,
      declaredContext: entry.input.diagnostic.salesProcess,
    });

    const assessment = buildBusinessAssessment({
      diagnostic: entry.input.diagnostic,
      evidence: entry.evidence ?? [],
      completedActions: previousWeek?.review?.completedActions ?? 1,
      totalActions: previousWeek?.review?.totalActions ?? 3,
      latestReview: previousWeek ? { outcome_status: previousWeek.review.outcomeStatus } : null,
      reviewedWeeks: previousWeek ? entry.targetWeek - 1 : 0,
    });

    const started = Date.now();
    const attempts = [];
    const record = { scenario: entry.name, sample, targetWeek: entry.targetWeek, attempts };

    try {
      const plan = await generateCEOPlan(
        { ...entry.input, previousWeek, strategicContext, assessment },
        undefined,
        (attempt) => {
          trackAttempt(attempt);
          attempts.push({
            attempt: attempt.attempt,
            status: attempt.status,
            durationMs: attempt.durationMs,
            repairs: attempt.repairs,
            issueCategories: attempt.issues.map((i) => i.category),
            rejectedFields: attempt.issues.map((i) => i.path),
            errorCode: attempt.errorCode,
          });
        },
      );
      record.status = "PASS";
      record.decision = plan.strategic_diagnosis.critical_decision;
      record.continuity = plan.strategic_continuity;
      record.actions = plan.weekly_plan.map((item) => ({
        sequence: item.sequence, title: item.action, strategy: item.strategy,
        feasibility: assessFeasibility(item, strategicContext.resources, entry.history).status,
        matchingPrior: entry.history.find((p) => sameWork(p, item))?.id ?? null,
      }));
    } catch (error) {
      record.status = "FAIL";
      record.code = error.code ?? error.name;
      record.message = error.message?.slice(0, 200);
    }

    record.durationMs = Date.now() - started;
    report.results.push(record);
    report.apiCallsUsed = apiCallsUsed;
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    console.log(record.scenario, `S${sample}`, record.status, `${attempts.length} intentos`, `${record.durationMs}ms`, `API: ${apiCallsUsed}/${API_CALL_LIMIT}`);
  }
}

await Promise.all([worker(), worker()]);
report.apiCallsUsed = apiCallsUsed;
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(`\n=== EVALUACIÓN COMPLETADA === ${report.results.filter((r) => r.status === "PASS").length}/${report.results.filter((r) => r.status !== "SKIPPED_BUDGET").length} PASS | API calls: ${apiCallsUsed}/${API_CALL_LIMIT}`);
