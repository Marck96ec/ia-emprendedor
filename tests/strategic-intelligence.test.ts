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

