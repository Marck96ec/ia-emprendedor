import assert from "node:assert/strict";
import test from "node:test";

import {
  AIActionDefinitionSchema,
  CommercialOffersSchema,
  CommercialMessagesSchema,
  parseActionDeliverable,
  parseStoredActionResult,
  validateActionResultForApproval,
} from "../src/lib/ai/action-deliverables";
import { buildCommercialOffersPrompt } from "../src/lib/ai/generate-commercial-offers";
import { buildCommercialMessagesPrompt } from "../src/lib/ai/generate-commercial-messages";

const validCommercialMessages = {
  deliverable_type: "commercial_messages" as const,
  messages: [
    {
      label: "Enfoque en rapidez",
      changing_factor: "Rapidez de implementación",
      message: "Activa tu primera mejora comercial esta semana, sin frenar tu operación.",
    },
    {
      label: "Enfoque en claridad",
      changing_factor: "Claridad del proceso",
      message: "Convierte una oferta difícil de explicar en una propuesta que tus clientes entiendan.",
    },
    {
      label: "Enfoque en confianza",
      changing_factor: "Confianza del cliente",
      message: "Presenta una solución concreta para que tus clientes sepan qué obtienen antes de decidir.",
    },
  ],
  explanation: "Cada variante prueba un motivo de decisión diferente.",
};

const actionContext = {
  action: "Definir y probar una oferta corta para dos combinaciones",
  objective: "Comparar dos alternativas comerciales con clientes",
  success_metric: "Registrar el uso real de las dos ofertas y sus respuestas",
};

const validCommercialOffers = {
  deliverable_type: "commercial_offers" as const,
  offers: [
    {
      offer_name: "Diagnóstico express",
      target_customer: "Comercios con una necesidad urgente",
      promise: "Entender el siguiente ajuste prioritario en una sesión breve",
      what_is_included: "Revisión inicial y recomendación concreta",
      call_to_action: "Escríbeme para coordinar la sesión",
    },
    {
      offer_name: "Acompañamiento práctico",
      target_customer: "Comercios que necesitan implementar el ajuste",
      promise: "Aplicar el cambio con seguimiento cercano",
      what_is_included: "Implementación guiada y revisión del primer resultado",
      call_to_action: "Cuéntame tu caso para revisar si encaja",
    },
  ],
  explanation: "Las ofertas cambian el nivel de acompañamiento sin inventar precios.",
};

test("acepta exactamente tres mensajes con factores diferentes", () => {
  const parsed = CommercialMessagesSchema.safeParse(validCommercialMessages);

  assert.equal(parsed.success, true);
});

test("rechaza mensajes incompletos o factores duplicados", () => {
  const incomplete = {
    ...validCommercialMessages,
    messages: validCommercialMessages.messages.slice(0, 2),
  };
  const duplicated = {
    ...validCommercialMessages,
    messages: validCommercialMessages.messages.map((message) => ({
      ...message,
      changing_factor: "Precio",
    })),
  };

  assert.equal(CommercialMessagesSchema.safeParse(incomplete).success, false);
  assert.equal(CommercialMessagesSchema.safeParse(duplicated).success, false);
});

test("acepta exactamente dos ofertas distinguibles y rechaza duplicadas", () => {
  assert.equal(CommercialOffersSchema.safeParse(validCommercialOffers).success, true);
  assert.equal(
    CommercialOffersSchema.safeParse({
      ...validCommercialOffers,
      offers: validCommercialOffers.offers.map((offer) => ({
        ...offer,
        offer_name: "Misma oferta",
      })),
    }).success,
    false,
  );
});

test("relaciona el tipo de acción con el entregable correcto", () => {
  const commercialAction = AIActionDefinitionSchema.safeParse({
    execution_mode: "ai_assisted",
    action_type: "commercial_messages",
    ...actionContext,
  });
  const actionWithDifferentWording = AIActionDefinitionSchema.safeParse({
    execution_mode: "ai_assisted",
    action_type: "commercial_messages",
    action: "Comparar dos alternativas",
    objective: "Observar qué propuesta es más clara",
    success_metric: "Registrar lo observado",
  });

  assert.equal(commercialAction.success, true);
  assert.equal(actionWithDifferentWording.success, true);
  assert.equal(
    AIActionDefinitionSchema.safeParse({
      execution_mode: "manual",
      action_type: "commercial_messages",
      ...actionContext,
    }).success,
    false,
  );
  assert.equal(
    parseActionDeliverable("commercial_messages", validCommercialMessages).success,
    true,
  );
  assert.equal(
    parseActionDeliverable("commercial_messages", validCommercialOffers).success,
    true,
  );
  assert.equal(
    parseActionDeliverable("value_proposition", validCommercialMessages).success,
    false,
  );
});

test("conserva borrador, feedback y contexto en una revisión", () => {
  const prompt = buildCommercialMessagesPrompt({
    business: {
      name: "Taller Norte",
      revenue_model: "Cobro por reparaciones a pequeños comercios.",
      description: "Reparaciones para pequeños comercios.",
    },
    diagnostic: {
      business_stage: "validating",
      team_size: 2,
      owner_hours_per_week: 5,
      main_challenge: "Pocas conversaciones comerciales",
      primary_goal: "Aumentar solicitudes",
      customers_description: "Comercios de barrio",
      sales_process: "Referidos y WhatsApp",
      owner_responsibilities: "Vendo, coordino el trabajo y reviso las finanzas.",
      monthly_revenue: 1200,
      currency_code: "USD",
    },
    action: {
      ...actionContext,
      sequence: 2,
      action_type: "commercial_messages",
    },
    plan: {
      executive_summary: "Priorizar conversaciones",
      diagnosis: "La oferta se entiende tarde",
      priorities: ["Claridad comercial"],
    },
    currentDraft: validCommercialMessages,
    currentKnowledge: null,
    feedback: "Haz la variante de confianza más concreta.",
  });

  assert.match(prompt, /Taller Norte/);
  assert.match(prompt, /currentDraft/);
  assert.match(prompt, /Haz la variante de confianza más concreta/);
  assert.match(prompt, /exactamente tres mensajes/);
});

test("el prompt de ofertas exige dos entregables distinguibles", () => {
  const prompt = buildCommercialOffersPrompt({
    business: {
      name: "Taller Norte",
      revenue_model: "Cobro por reparaciones a pequeños comercios.",
      description: "Reparaciones para pequeños comercios.",
    },
    diagnostic: {
      business_stage: "validating",
      team_size: 2,
      owner_hours_per_week: 5,
      main_challenge: "Pocas conversaciones comerciales",
      primary_goal: "Aumentar solicitudes",
      customers_description: "Comercios de barrio",
      sales_process: "Referidos y WhatsApp",
      owner_responsibilities: "Vendo, coordino el trabajo y reviso las finanzas.",
      monthly_revenue: 1200,
      currency_code: "USD",
    },
    action: {
      ...actionContext,
      sequence: 2,
      action_type: "commercial_messages",
    },
    plan: {
      executive_summary: "Priorizar conversaciones",
      diagnosis: "La oferta se entiende tarde",
      priorities: ["Claridad comercial"],
    },
    currentDraft: validCommercialOffers,
    currentKnowledge: null,
    feedback: "Haz la segunda oferta más concreta.",
  });

  assert.match(prompt, /exactamente dos ofertas/);
  assert.match(prompt, /offer_name/);
  assert.match(prompt, /Haz la segunda oferta más concreta/);
});

test("recupera el contenido aprobado y mantiene compatibilidad histórica", () => {
  const approved = parseStoredActionResult(
    "commercial_messages",
    "approved",
    null,
    validCommercialMessages,
  );
  const legacyValueProposition = {
    value_proposition: "Ayudamos a comercios locales a reparar su operación.",
    target_customer: "Pequeños comercios",
    problem_solved: "Paradas operativas",
    differentiator: "Respuesta rápida",
    benefits: ["Menos interrupciones", "Más claridad", "Más confianza"],
    rationale: "Se apoya en el proceso de ventas descrito.",
  };

  assert.equal(approved.success, true);
  assert.equal(
    parseStoredActionResult(
      "value_proposition",
      "approved",
      null,
      legacyValueProposition,
    ).success,
    true,
  );
});

test("valida el resultado y el tipo de acción antes de aprobar", () => {
  const validApproval = validateActionResultForApproval(
    {
      ...actionContext,
      execution_mode: "ai_assisted",
      action_type: "commercial_messages",
    },
    {
      status: "draft",
      draft_content: validCommercialOffers,
    },
  );
  const invalidApproval = validateActionResultForApproval(
    {
      ...actionContext,
      execution_mode: "ai_assisted",
      action_type: "commercial_messages",
    },
    {
      status: "draft",
      draft_content: {
        ...validCommercialOffers,
        offers: validCommercialOffers.offers.slice(0, 1),
      },
    },
  );

  assert.equal(validApproval.success, true);
  assert.equal(invalidApproval.success, false);
});