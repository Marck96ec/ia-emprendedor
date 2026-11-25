import assert from "node:assert/strict";
import test from "node:test";

import { findRepeatedActions } from "../src/lib/strategic-continuity";
import { assessHypothesis } from "../src/lib/decision-learning";

test("detecta un encargo de oferta equivalente aunque cambien el título y el indicador", () => {
  const previous = {
    action: "Definir una propuesta de valor para el servicio de mantenimiento",
    objective: "Concentrar la oferta en un problema urgente",
    successMetric: "Una propuesta lista",
  };
  const next = {
    action: "Redactar una oferta principal para el servicio de mantenimiento",
    objective: "Enfocar los servicios en una necesidad urgente",
    successMetric: "Una oferta redactada",
  };
  assert.deepEqual(findRepeatedActions([previous], [next]), [next]);
});

test("conserva la percepción histórica y evalúa como inconclusa una validación sin señales", () => {
  assert.deepEqual(assessHypothesis({
    reported: "validated",
    evidence: "No disponemos de evidencia de mercado.",
    observedResult: "No se obtuvieron resultados empresariales.",
  }), {
    reported: "validated",
    evaluated: "inconclusive",
    reason: "La revisión indica que aún faltan resultados o evidencia para validar la hipótesis.",
  });
});

test("una observación cualitativa concreta puede sostener una hipótesis", () => {
  const outcome = assessHypothesis({
    reported: "validated",
    evidence: "Dos clientes explicaron que les urgía reparar la instalación.",
    observedResult: "Solicitaron una visita para cotizar la reparación.",
  });
  assert.equal(outcome.evaluated, "validated");
});

import { buildStrategicContext } from "../src/lib/strategic-context";
import type { MemoryRecord } from "../src/lib/business-memory";
import {
  assessFeasibility, commercialDeliverableFor, normalizeActionStrategy, validateActionDeliverable, validateProgression,
  type ActionStrategy, type HistoricalAction,
} from "../src/lib/strategic-action";

const uuid = (n: number) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");

function resource(key: string, availability: "available" | "unavailable", inferred = false): MemoryRecord {
  return {
    id: uuid(1), memory_key: key,
    category: availability === "unavailable" ? "constraint" : "asset",
    content: { label: key, detail: null, availability },
    origin: inferred ? "inference" : "owner_input", source_id: uuid(2),
    confirmation: inferred ? "inferred" : "declared",
    observed_at: "2026-08-04T00:00:00Z", updated_at: "2026-08-04T00:00:00Z",
  };
}

function context(targetWeek: number, memory: MemoryRecord[], history: HistoricalAction[] = [],
  declaredContext = "Publicidad en internet") {
  return buildStrategicContext({
    targetWeek, memory, history, knowledge: { valueProposition: null }, evidence: [], declaredContext,
  });
}

function strategy(update: Partial<ActionStrategy> = {}): ActionStrategy {
  return {
    work_key: "commercial_outreach", intent: "execute", requires: [], completed_prerequisite_id: null,
    progression: "new", prior_action_id: null, justification: "Prueba acotada con un registro del aprendizaje.",
    prior_barrier: null, new_evidence_id: null, period_week: null, deliverable: null, ...update,
  };
}

function candidate(action: string, update: Partial<ActionStrategy> = {}) {
  return {
    action, objective: "Medir señales de interés", role_recommendation: "execute",
    execution_mode: "manual", action_type: "generic", strategy: strategy(update),
  };
}

function prior(action: string, state: HistoricalAction["status"], strategyValue: ActionStrategy | null = null): HistoricalAction {
  return { id: uuid(3), week: 1, action, objective: "Probar las señales", status: state, result: state === "completed" ? "Resultado registrado por el dueño" : null, strategy: strategyValue };
}

test("bloquea publicar en una cuenta inexistente aunque se omita el canal estructurado", () => {
  const ctx = context(2, [resource("social_media", "unavailable")]);
  const action = candidate("Publicar el anuncio en Instagram");
  assert.equal(assessFeasibility(action, ctx.resources, ctx.history).status, "blocked");
  assert.equal(assessFeasibility(candidate("Confirmar qué canal puede utilizar el propietario", {
    intent: "discover",
  }), ctx.resources, ctx.history).status, "feasible");
});

test("WhatsApp y contactos disponibles permiten la alternativa sin exigir redes", () => {
  const ctx = context(2, [
    resource("social_media", "unavailable"), resource("whatsapp", "available"), resource("existing_contacts", "available"),
  ]);
  assert.equal(assessFeasibility(candidate("Contactar clientes conocidos por WhatsApp", {
    requires: ["existing_contacts"],
  }), ctx.resources, []).status, "feasible");
});

test("publicidad en internet y una inferencia no prueban disponibilidad ni ausencia", () => {
  const ctx = context(1, [resource("social_media", "unavailable", true)]);
  assert.equal(ctx.resources.social_media, "unknown");
  assert.equal(assessFeasibility(candidate("Publicar una oferta en redes sociales"), ctx.resources, []).status, "unknown");
  assert.equal(context(1, [], [], "No tengo redes sociales. Hago publicidad en internet.").resources.social_media, "unavailable");
});

test("retiene una restricción de semana 1 para la 5 y la 8 y usa una corrección posterior explícita", () => {
  for (const week of [5, 8, 20]) {
    assert.equal(context(week, [resource("social_media", "unavailable")]).resources.social_media, "unavailable");
  }
  assert.equal(context(8, [resource("social_media", "available")], [], "No tengo redes sociales").resources.social_media, "available");
});

test("reutiliza el resultado de una oferta previa y evita reconstruirla por un cambio de vocabulario", () => {
  const offer = prior("Definir una propuesta de valor", "completed");
  const ctx = context(5, [], [offer]);
  assert.equal(ctx.reusableOffer?.source, "declared_action_result");
  const rewrite = candidate("Ajustar la oferta principal del negocio", { intent: "optimize" });
  assert.match(validateProgression(rewrite, [offer], [], 5, true) ?? "", /ya existe/);
  assert.equal(validateProgression(candidate("Probar la oferta con contactos", {
    intent: "validate", progression: "advance", prior_action_id: offer.id,
  }), [offer], [], 5, true), null);
});

test("una acción pendiente similar debe declarar continuación y motivo, sin tratarla como completada", () => {
  const pending = prior("Crear dos mensajes comerciales distintos", "pending");
  const next = candidate("Crear dos mensajes comerciales distintos");
  assert.match(validateProgression(next, [pending], [], 2, false) ?? "", /pendiente/);
  assert.equal(validateProgression(candidate(next.action, {
    intent: "build", progression: "continuation", prior_action_id: pending.id, prior_barrier: "unreported",
  }), [pending], [], 2, false), null);
  const mislabeled = candidate(next.action, {
    intent: "build", progression: "advance", prior_action_id: uuid(9), prior_barrier: "resolved",
  });
  const normalized = normalizeActionStrategy(mislabeled, [pending]);
  assert.equal(normalized.strategy.progression, "continuation");
  assert.equal(normalized.strategy.prior_action_id, pending.id);
  assert.equal(normalized.strategy.prior_barrier, "unreported");
  assert.equal(validateProgression(normalized, [pending], [], 2, false), null);
  const different = normalizeActionStrategy({ ...mislabeled, action: "Entrevistar a un cliente sobre urgencia" }, [pending]);
  assert.equal(different.strategy.progression, "advance");
  const responses = prior("Registrar respuestas y clasificar dudas e intereses", "pending");
  const renamed = candidate("Registrar y clasificar cada respuesta para separar interés, duda y rechazo");
  assert.match(validateProgression(renamed, [responses], [], 2, false) ?? "", /pendiente/);
  const resumed = normalizeActionStrategy(renamed, [responses]);
  assert.equal(resumed.strategy.prior_action_id, responses.id);
  assert.equal(validateProgression(resumed, [responses], [], 2, false), null);
});

test("una acción bloqueada continúa bloqueada y una referencia inexistente requiere prerrequisito", () => {
  const ctx = context(2, [resource("social_media", "unavailable")]);
  assert.equal(assessFeasibility(candidate("Difundir la oferta en redes sociales"), ctx.resources, []).status, "blocked");
  assert.equal(assessFeasibility(candidate("Validar el protocolo en un pedido", {
    completed_prerequisite_id: uuid(8),
  }), ctx.resources, []).status, "requires_prerequisite");
  assert.equal(assessFeasibility({ ...candidate("Delegar el seguimiento de pedidos"), role_recommendation: "delegate" },
    context(2, [resource("delegate", "unavailable")]).resources, []).status, "blocked");
});

test("la recurrencia exige un período posterior y el retrabajo una referencia a evidencia", () => {
  const row = prior("Actualizar el flujo de caja", "completed", strategy({ intent: "maintain", period_week: 1 }));
  assert.equal(validateProgression(candidate("Actualizar el flujo de caja", {
    intent: "maintain", progression: "recurrence", prior_action_id: row.id, period_week: 2,
  }), [row], [], 2, false), null);
  assert.match(validateProgression(candidate("Actualizar el flujo de caja", {
    intent: "maintain", progression: "recurrence", prior_action_id: row.id, period_week: 1,
  }), [row], [], 2, false) ?? "", /período/);
  const offer = prior("Definir una propuesta de valor", "completed");
  const refreshed = candidate("Ajustar la oferta principal", {
    intent: "optimize", progression: "rework", prior_action_id: offer.id, new_evidence_id: uuid(4),
  });
  assert.notEqual(validateProgression(refreshed, [offer], [], 2, true), null);
  assert.equal(validateProgression(refreshed, [offer], [uuid(4)], 2, true), null);
});

test("seguimiento de prospectos admite recurrencia en semana posterior con nueva ronda", () => {
  const prevFollow = {
    id: uuid(10), week: 3,
    action: "Registrar y clasificar cada respuesta para detectar interés real",
    objective: "Medir señales de interés", status: "completed" as const,
    result: "5 respuestas registradas",
    strategy: strategy({ work_key: "lead_follow_up", intent: "validate", period_week: 3 }),
  };
  assert.equal(validateProgression(candidate("Registrar y clasificar respuestas de nuevos contactos recibidas esta semana", {
    work_key: "lead_follow_up", intent: "validate", progression: "recurrence",
    prior_action_id: uuid(10), period_week: 4,
  }), [prevFollow], [], 4, false), null);
});

test("repetición injustificada sobre mismos prospectos bloquea la progresión", () => {
  const sent = prior(
    "Registrar y clasificar cada respuesta para separar interés, duda y rechazo",
    "completed", strategy({ work_key: "lead_follow_up", intent: "validate", period_week: 2 }),
  );
  assert.match(validateProgression(candidate(
    "Registrar y clasificar cada respuesta para separar interés, duda y rechazo",
    { work_key: "lead_follow_up", intent: "validate", progression: "new", prior_action_id: null },
  ), [sent], [], 3, false) ?? "", /ya existe/);
  // Same title + recurrence is blocked: lead_follow_up is not a tracking key
  assert.match(validateProgression(candidate(
    "Registrar y clasificar cada respuesta para separar interés, duda y rechazo",
    { work_key: "lead_follow_up", intent: "validate", progression: "recurrence", prior_action_id: sent.id, period_week: 3 },
  ), [sent], [], 3, false) ?? "", /recurrencia/);
  // Different title recurrence passes: new group contacted this week
  assert.equal(validateProgression(candidate(
    "Seguir y clasificar respuestas de nuevos contactos esta semana para detectar interés",
    { work_key: "lead_follow_up", intent: "validate", progression: "recurrence", prior_action_id: sent.id, period_week: 3 },
  ), [sent], [], 3, false), null);
});

test("seguimiento periódico de cobros admite recurrencia en período posterior", () => {
  const col = {
    id: uuid(20), week: 2,
    action: "Cobrar saldos pendientes del mes con mensaje de WhatsApp",
    objective: "Recuperar efectivo", status: "completed" as const,
    result: "USD 300 recuperados",
    strategy: strategy({ work_key: "collections", intent: "execute", period_week: 2 }),
  };
  // Different title recurrence passes: new debts this week, not the same group
  assert.equal(validateProgression(candidate("Cobrar nuevas deudas generadas esta semana con mensaje de WhatsApp", {
    work_key: "collections", intent: "execute", progression: "recurrence",
    prior_action_id: uuid(20), period_week: 5,
  }), [col], [], 5, false), null);
  // Same title recurrence is blocked: collections is not a tracking key
  assert.match(validateProgression(candidate("Cobrar saldos pendientes del mes con mensaje de WhatsApp", {
    work_key: "collections", intent: "execute", progression: "recurrence",
    prior_action_id: uuid(20), period_week: 5,
  }), [col], [], 5, false) ?? "", /recurrencia/);
  assert.match(validateProgression(candidate("Cobrar saldos pendientes del mes con mensaje de WhatsApp", {
    work_key: "collections", intent: "execute", progression: "new", prior_action_id: null,
  }), [col], [], 5, false) ?? "", /ya existe/);
});

test("control operativo recurrente en período distinto pasa la validación", () => {
  const measure = {
    id: uuid(21), week: 1,
    action: "Revisar calidad del servicio entregado esta semana",
    objective: "Medir calidad operativa", status: "completed" as const,
    result: "1 error detectado y corregido",
    strategy: strategy({ work_key: "operations_measure", intent: "validate", period_week: 1 }),
  };
  assert.equal(validateProgression(candidate("Revisar calidad del servicio entregado esta semana", {
    work_key: "operations_measure", intent: "validate", progression: "recurrence",
    prior_action_id: uuid(21), period_week: 4,
  }), [measure], [], 4, false), null);
});

test("recurrencia sin período posterior válido falla", () => {
  const col = {
    id: uuid(22), week: 2,
    action: "Cobrar saldos pendientes del mes con mensaje de WhatsApp",
    objective: "Recuperar efectivo", status: "completed" as const,
    result: "USD 200 recuperados",
    strategy: strategy({ work_key: "collections", intent: "execute", period_week: 2 }),
  };
  assert.match(validateProgression(candidate("Cobrar saldos pendientes del mes con mensaje de WhatsApp", {
    work_key: "collections", intent: "execute", progression: "recurrence",
    prior_action_id: uuid(22), period_week: 2,
  }), [col], [], 3, false) ?? "", /período/);
});

test("negocio con cuatro horas y cuatro semanas de historial puede recurrir con nueva ronda", () => {
  const makeHistItem = (n: number): HistoricalAction => ({
    id: uuid(30 + n), week: n,
    action: "Cobrar saldos pendientes del mes con mensaje de WhatsApp",
    objective: "Recuperar efectivo", status: "completed",
    result: "Resultado registrado",
    strategy: strategy({ work_key: "collections", intent: "execute", period_week: n }),
  });
  const history = [makeHistItem(1), makeHistItem(2), makeHistItem(3), makeHistItem(4)];
  // Different title recurrence passes: new obligations this week
  assert.equal(validateProgression(candidate("Cobrar nuevas obligaciones surgidas esta semana con mensaje de WhatsApp", {
    work_key: "collections", intent: "execute", progression: "recurrence",
    prior_action_id: uuid(34), period_week: 5,
  }), history, [], 5, false), null);
  // Same title recurrence is blocked even after 4 weeks
  assert.match(validateProgression(candidate("Cobrar saldos pendientes del mes con mensaje de WhatsApp", {
    work_key: "collections", intent: "execute", progression: "recurrence",
    prior_action_id: uuid(34), period_week: 5,
  }), history, [], 5, false) ?? "", /recurrencia/);
  assert.match(validateProgression(candidate("Cobrar saldos pendientes del mes con mensaje de WhatsApp", {
    work_key: "collections", intent: "execute", progression: "new", prior_action_id: null,
  }), history, [], 5, false) ?? "", /ya existe/);
});

test("mantenimiento: cuatro semanas de investigación de cliente no bloquean semana 5 con texto nuevo", () => {
  const makeResearch = (n: number, action: string): HistoricalAction => ({
    id: uuid(50 + n), week: n, action,
    objective: "Mejorar comprensión del cliente", status: "completed",
    result: "Patrón registrado",
    strategy: strategy({ work_key: "customer_research", intent: "discover", period_week: n }),
  });
  const history = [
    makeResearch(1, "Registrar las consultas recibidas esta semana y anotar de dónde vino cada una"),
    makeResearch(2, "Revisar conversaciones disponibles y anotar qué parte del servicio generó interés o dudas"),
    makeResearch(3, "Tomar una consulta real y registrar de forma breve origen, solicitud y punto en que se frenó"),
    makeResearch(4, "Registrar una consulta real y anotar origen, servicio pedido, duda principal y si avanzó"),
  ];
  assert.equal(validateProgression(candidate(
    "Revisar casos de esta semana y documentar qué duda concreta frenó la decisión de compra",
    { work_key: "customer_research", intent: "discover", progression: "new", prior_action_id: null },
  ), history, [], 5, false), null);
});

test("taller-andino: cadena de delegación operativa avanza progresión hacia validación sin bloqueo", () => {
  const w1: HistoricalAction = {
    id: uuid(60), week: 1,
    action: "Revisar pedidos recientes y clasificar qué decisión operativa frenó el avance en cada uno",
    objective: "Identificar decisión repetible", status: "completed", result: "3 pedidos revisados",
    strategy: strategy({ work_key: "owner_delegation", intent: "discover", period_week: 1 }),
  };
  const w2: HistoricalAction = {
    id: uuid(61), week: 2,
    action: "Aplicar en un pedido real una regla mínima para decisiones de compra de materiales",
    objective: "Validar regla de delegación", status: "completed", result: "Regla probada en un caso",
    strategy: strategy({ work_key: "owner_delegation", intent: "validate", period_week: 2 }),
  };
  const w3: HistoricalAction = {
    id: uuid(62), week: 3,
    action: "Observar un pedido real y registrar si una decisión operativa repetitiva puede delegarse",
    objective: "Validar criterio de delegación", status: "completed", result: "Caso documentado",
    strategy: strategy({ work_key: "owner_delegation", intent: "validate", prior_action_id: uuid(61), period_week: 3 }),
  };
  // W4 advance from W3: different target text, so sameWork is false
  assert.equal(validateProgression(candidate(
    "Registrar un caso real donde una decisión operativa repetitiva se delegó correctamente",
    { work_key: "owner_delegation", intent: "validate", progression: "advance", prior_action_id: uuid(62) },
  ), [w1, w2, w3], [], 4, false), null);
  // W5 new independent: distinct text from all prior
  assert.equal(validateProgression(candidate(
    "Documentar las reglas de delegación aprendidas y verificar cuáles el equipo puede aplicar solo",
    { work_key: "owner_delegation", intent: "build", progression: "new", prior_action_id: null },
  ), [w1, w2, w3], [], 5, false), null);
});

test("el seguimiento de cobros enruta textos de cobro y nunca fichas de oferta", () => {
  const title = "Crear dos mensajes de cobro para saldos pendientes";
  const scripted = {
    ...candidate(title, { intent: "build", work_key: "collections", deliverable: "commercial_offers" }),
    action_type: "commercial_messages", execution_mode: "ai_assisted",
  };
  assert.equal(commercialDeliverableFor(title), "commercial_messages");
  assert.equal(commercialDeliverableFor(title, scripted.strategy), "commercial_messages");
  assert.match(validateActionDeliverable(scripted) ?? "", /cobros/);
  assert.equal(validateActionDeliverable({ ...scripted, strategy: { ...scripted.strategy, deliverable: "commercial_messages" } }), null);
});

