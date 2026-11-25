import { z } from "zod";

import { normalizeWorkText, resourceLabels, ResourceSchema, type Availability, type Resource } from "./business-memory";

export const WorkKeySchema = z.enum([
  "offer_definition", "commercial_messages", "commercial_outreach", "lead_follow_up", "collections",
  "cashflow_update", "owner_delegation", "operations_measure", "channel_setup", "customer_research", "other",
]);

export const ActionStrategySchema = z.object({
  work_key: WorkKeySchema,
  intent: z.enum(["discover", "build", "execute", "validate", "optimize", "maintain", "resolve_blocker"]),
  requires: z.array(ResourceSchema).max(5),
  completed_prerequisite_id: z.uuid().nullable(),
  depends_on_sequence: z.number().int().min(1).max(5).nullable().optional(),
  progression: z.enum(["new", "advance", "continuation", "recurrence", "rework"]),
  prior_action_id: z.uuid().nullable(),
  justification: z.string().trim().min(12).max(400),
  prior_barrier: z.enum(["unreported", "resolved", "unchanged"]).nullable(),
  new_evidence_id: z.uuid().nullable(),
  period_week: z.number().int().positive().nullable(),
  deliverable: z.enum(["value_proposition", "commercial_offers", "commercial_messages"]).nullable(),
});

export const ActionStrategyModelSchema = ActionStrategySchema.extend({
  depends_on_sequence: z.number().int().min(1).max(5).nullable(),
});

export type ActionStrategy = z.infer<typeof ActionStrategySchema>;
export type WorkKey = z.infer<typeof WorkKeySchema>;
export type ActionFeasibility = "feasible" | "requires_prerequisite" | "blocked" | "unknown";

export function strategyForSequence(plan: unknown, sequence: number): ActionStrategy | undefined {
  if (!Array.isArray(plan)) return undefined;
  const result = ActionStrategySchema.safeParse(plan.find((item) => item?.sequence === sequence)?.strategy);
  return result.success ? result.data : undefined;
}

export type HistoricalAction = {
  id: string;
  week: number;
  action: string;
  objective: string;
  status: "pending" | "completed";
  result: string | null;
  strategy: ActionStrategy | null;
};
type Candidate = {
  action: string;
  objective: string;
  role_recommendation: string;
  action_type: string;
  execution_mode: string;
  strategy?: ActionStrategy;
};

const responseTracking = /\b(?:registrar(?: y clasificar)?|clasificar) (?:(?:cada|las|los|el|la) )?respuestas?\b/;

export function inferWorkKey(action: string): WorkKey {
  const title = normalizeWorkText(action);
  if (/\b(cobros?|cobrar|saldo pendiente|cuentas? por cobrar)\b/.test(title)) return "collections";
  if (/\b(flujo de caja|mapa de caja|flujo de efectivo|proyeccion de caja)\b/.test(title)) return "cashflow_update";
  if (responseTracking.test(title) || /\b(seguimiento|clasificar dudas|registrar interes)\b/.test(title)) {
    return "lead_follow_up";
  }
  if (/\b(mensajes? comerciales|guiones? comerciales|redactar mensajes|crear mensajes)\b/.test(title)) return "commercial_messages";
  if (/\b(validar|probar|contactar|enviar|publicar|difundir|prospectar)\b/.test(title)
    && /\b(ofertas?|prospectos?|mensajes?|clientes?|canales?|redes sociales)\b/.test(title)) return "commercial_outreach";
  if (/\b(propuesta de valor|oferta principal|oferta de valor|oferta comercial principal|oferta base)\b/.test(title)
    || /^(crear|definir|redactar|formular|disenar|estructurar) (?:una |la )?oferta comercial\b/.test(title)) {
    return "offer_definition";
  }
  if (/\b(delegar|delegacion|responsable disponible)\b/.test(title)) return "owner_delegation";
  return "other";
}

export function inferredIntent(title: string): ActionStrategy["intent"] | null {
  const text = normalizeWorkText(title);
  if (/^(definir|redactar|crear|formular|disenar|preparar|desarrollar)\b/.test(text)) return "build";
  if (/^(medir|validar|probar|verificar|contrastar)\b/.test(text)) return "validate";
  if (responseTracking.exec(text)?.index === 0 || /^(clasificar dudas|detectar interes)\b/.test(text)) return "validate";
  if (/^(actualizar|mantener|revisar)\b/.test(text) && inferWorkKey(title) === "cashflow_update") return "maintain";
  if (/^(ajustar|optimizar|mejorar|refinar)\b/.test(text)) return "optimize";
  return null;
}

function workKeyFor(action: string, strategy?: ActionStrategy | null) {
  const inferred = inferWorkKey(action);
  // Recognizable legacy work cannot be relabeled as "other" to skip history.
  return inferred !== "other" ? inferred : strategy?.work_key ?? "other";
}

const workWords = new Set(["para", "sobre", "segun", "entre", "cada", "este", "esta", "estas", "estos", "desde",
  "hacer", "medir", "revisar", "validar", "registrar", "probar", "definir", "preparar", "crear", "clasificar",
  "identificar", "enviar", "contactar", "separar", "arreglar", "nuevo", "nueva", "semanal", "semana"]);

function targetWords(title: string) {
  return new Set(title.split(" ").filter((word) => word.length > 3 && !workWords.has(word))
    .map((word) => word.length > 4 ? word.replace(/(?:as|os|es|s)$/, "") : word));
}

export function sameWork(a: Pick<HistoricalAction, "action" | "strategy">, b: Pick<Candidate, "action" | "strategy">) {
  const title = normalizeWorkText(a.action);
  const nextTitle = normalizeWorkText(b.action);
  if (title && title === nextTitle) return true;
  const key = workKeyFor(a.action, a.strategy);
  if (key === "other" || key !== workKeyFor(b.action, b.strategy)) return false;
  const firstIntent = inferredIntent(a.action) ?? a.strategy?.intent;
  const nextIntent = inferredIntent(b.action) ?? b.strategy?.intent;
  if ((key === "offer_definition" || key === "commercial_messages") &&
    firstIntent && nextIntent && ["build", "optimize"].includes(firstIntent) && ["build", "optimize"].includes(nextIntent)) {
    return true;
  }
  if (!firstIntent || firstIntent !== nextIntent) return false;
  if (key === "cashflow_update" || (key === "lead_follow_up" && responseTracking.test(title) && responseTracking.test(nextTitle))) {
    return true;
  }
  // General work families contain different tests. A shared category or
  // phase alone says nothing about whether their target is the same.
  const first = targetWords(title);
  const next = targetWords(nextTitle);
  const common = [...first].filter((word) => next.has(word)).length;
  return common >= 2 && common / Math.min(first.size, next.size) >= 0.67 && common / Math.max(first.size, next.size) >= 0.5;
}

export function requiredResources(item: Pick<Candidate, "action" | "role_recommendation" | "strategy">): Resource[] {
  const text = normalizeWorkText(item.action);
  const needed = new Set<Resource>(item.strategy?.requires ?? []);
  const usesChannel = /\b(publicar|publica|difundir|difunde|enviar|envia|contactar|contacta|lanzar|promocionar|hacer seguimiento)\b/.test(text);
  if (usesChannel && /\b(redes sociales|instagram|facebook|tiktok)\b/.test(text)) needed.add("social_media");
  if (usesChannel && /\bwhatsapp\b/.test(text)) needed.add("whatsapp");
  if (item.role_recommendation === "delegate") needed.add("delegate");
  return [...needed];
}

export function describeResourceCheck(item: Parameters<typeof requiredResources>[0], resources: Record<Resource, Availability>,
  dependencyCompleted = true) {
  if (!dependencyCompleted && item.strategy?.depends_on_sequence) {
    return { blocked: true, detail: `Completa primero la acción ${item.strategy.depends_on_sequence} de esta semana.` };
  }
  const required = requiredResources(item).filter((resource) => resource !== "value_proposition");
  const blocked = required.filter((resource) => resources[resource] === "unavailable");
  const unknown = required.filter((resource) => resources[resource] === "unknown");
  if (blocked.length) return { blocked: true, detail: "Recurso no disponible: " + blocked.map((resource) => resourceLabels[resource]).join(", ") };
  if (unknown.length) return { blocked: false, detail: "Confirma antes de ejecutar: " + unknown.map((resource) => resourceLabels[resource]).join(", ") };
  return undefined;
}

export function assessFeasibility(
  item: Candidate,
  resources: Record<Resource, Availability>,
  history: HistoricalAction[],
): { status: ActionFeasibility; reason?: string } {
  const requirements = requiredResources(item);
  const unavailable = requirements.find((resource) => resources[resource] === "unavailable");
  if (unavailable) return { status: "blocked", reason: `El recurso ${unavailable} está declarado como no disponible.` };
  const reference = item.strategy?.completed_prerequisite_id;
  if (reference && history.find((record) => record.id === reference)?.status !== "completed") {
    return { status: "requires_prerequisite", reason: "La acción requiere un trabajo previo que aún no está completado." };
  }
  if (requirements.includes("value_proposition") && resources.value_proposition !== "available") {
    return { status: "requires_prerequisite", reason: "Hace falta una propuesta de valor disponible para esta acción." };
  }
  if (requirements.some((resource) => resources[resource] === "unknown")) {
    return { status: "unknown", reason: "Confirma la disponibilidad de los recursos antes de ejecutar." };
  }
  return { status: "feasible" };
}

export function validateActionDeliverable(item: Candidate): string | null {
  const deliverable = item.strategy?.deliverable;
  if (item.execution_mode === "manual") return deliverable ? "Una acción manual no invoca un especialista." : null;
  if (item.action_type === "value_proposition") {
    return deliverable === "value_proposition" ? null : "El especialista de propuesta de valor requiere su entregable correspondiente.";
  }
  if (item.action_type === "commercial_messages") {
    if (deliverable !== "commercial_offers" && deliverable !== "commercial_messages") {
      return "Identifica un entregable comercial que el especialista pueda producir.";
    }
    if (deliverable === "commercial_offers" && (inferWorkKey(item.action) === "collections" || item.strategy?.work_key === "collections")) {
      return "El seguimiento de cobros requiere mensajes de cobro o una acción manual, sin fichas de ofertas.";
    }
    if (item.strategy?.intent !== "build" && item.strategy?.intent !== "optimize") {
      return "El especialista prepara materiales. El dueño ejecuta el contacto o verifica el resultado.";
    }
    return null;
  }
  return "La acción asistida no tiene una capacidad disponible.";
}

export function normalizeActionStrategy<T extends Candidate>(item: T, history: HistoricalAction[]): T {
  const current = item.strategy;
  if (!current) return item;
  const strategy = { ...current };
  if (item.execution_mode === "manual") strategy.deliverable = null;
  if (item.execution_mode === "ai_assisted" && inferredIntent(item.action) === "build") strategy.intent = "build";
  const overlaps = history.filter((old) => sameWork(old, { ...item, strategy }));
  const pending = overlaps.find((old) => old.status === "pending" && old.id === strategy.prior_action_id)
    ?? (overlaps.length === 1 && overlaps[0].status === "pending" ? overlaps[0] : undefined);
  const canCorrectLink = !strategy.prior_action_id || strategy.prior_action_id === pending?.id
    || normalizeWorkText(pending?.action ?? "") === normalizeWorkText(item.action);
  if (pending && !overlaps.some((old) => old.status === "completed") && canCorrectLink
    && ["new", "continuation", "advance"].includes(strategy.progression)) {
    if (strategy.prior_action_id !== pending.id && strategy.prior_barrier === "resolved") {
      strategy.prior_barrier = "unreported";
    }
    strategy.progression = "continuation";
    strategy.prior_action_id = pending.id;
    strategy.prior_barrier ??= "unreported";
  }
  return { ...item, strategy };
}

export function commercialDeliverableFor(action: string, strategy?: ActionStrategy, legacyHasMessages = false) {
  if (inferWorkKey(action) === "collections") return "commercial_messages";
  if (strategy?.deliverable === "commercial_messages" || strategy?.deliverable === "commercial_offers") return strategy.deliverable;
  const declaredMessages = /\b(?:mensajes?|textos?) (?:de cobro|comerciales|para enviar|para probar)\b/.test(normalizeWorkText(action));
  return legacyHasMessages || declaredMessages ? "commercial_messages" : "commercial_offers";
}

const RECURRENT_ACTIVITY_KEYS = new Set<WorkKey>([
  "cashflow_update", "collections", "commercial_messages", "commercial_outreach", "lead_follow_up", "operations_measure",
]);

// Periodic tracking keys allow recurrence with the same title (e.g. "Actualizar flujo de caja").
// Activity keys (collections, commercial_messages, etc.) must have a different title to prove a new scope/group.
const PERIODIC_TRACKING_KEYS = new Set<WorkKey>(["cashflow_update", "operations_measure"]);

export function validateProgression(
  item: Candidate,
  history: HistoricalAction[],
  evidenceIds: string[],
  targetWeek: number,
  hasValueProposition: boolean,
): string | null {
  const strategy = item.strategy;
  if (!strategy) return "Incluye la intención, los recursos y la relación con acciones anteriores.";
  const related = strategy.prior_action_id ? history.find((action) => action.id === strategy.prior_action_id) : undefined;
  if (strategy.prior_action_id && !related) return "La acción anterior referenciada no existe en el contexto.";
  if ((strategy.progression === "new") === Boolean(related) && !(strategy.progression === "rework" && hasValueProposition)) {
    return "La relación con el trabajo anterior debe coincidir con el tipo de progresión.";
  }
  const matches = history.filter((before) => sameWork(before, item));
  const completed = matches.find((before) => before.status === "completed");
  const evidenceValid = strategy.new_evidence_id && evidenceIds.includes(strategy.new_evidence_id);
  if (strategy.new_evidence_id && !evidenceValid) return "La evidencia de revisión referenciada no existe.";
  const key = workKeyFor(item.action, strategy);
  const availableOffer = hasValueProposition && key === "offer_definition" &&
    ["build", "optimize"].includes(strategy.intent);

  if (strategy.progression === "recurrence") {
    if (RECURRENT_ACTIVITY_KEYS.has(key) && related?.status === "completed"
      && workKeyFor(related.action, related.strategy) === key
      && strategy.period_week === targetWeek
      && (related.strategy?.period_week ?? related.week) < targetWeek) {
      if (!PERIODIC_TRACKING_KEYS.has(key) && normalizeWorkText(item.action) === normalizeWorkText(related.action)) {
        return "La recurrencia requiere un alcance o grupo nuevo. Adapta el título para reflejar la nueva ronda.";
      }
      return null;
    }
    return "La recurrencia necesita una actividad periódica registrada y un período posterior distinto.";
  }
  if (strategy.progression === "rework") {
    if (!evidenceValid || (!availableOffer && (!related || related.status !== "completed"
      || !matches.some((action) => action.id === related.id)))) {
      return "El retrabajo requiere trabajo completado relacionado y evidencia específica para revisarlo.";
    }
    return null;
  }
  if (completed || availableOffer) {
    return "El trabajo ya existe. Reutilízalo en una acción de intención distinta o justifica su revisión con evidencia específica.";
  }
  if (matches.length) {
    if (strategy.progression === "continuation" && related?.status === "pending"
      && matches.some((action) => action.id === related.id) && strategy.prior_barrier
      && strategy.prior_barrier !== "unchanged") return null;
    return "Para continuar un pendiente, enlaza el registro e indica el motivo conocido o que aún no se ha informado.";
  }
  if (strategy.progression === "continuation") {
    return "No hay un pendiente equivalente a esta acción. Si es un trabajo independiente, usa progression=new y prior_action_id=null.";
  }
  if (strategy.progression === "advance" && (!related || related.status !== "completed")) {
    return "La progresión debe partir de un trabajo completado.";
  }
  return null;
}

