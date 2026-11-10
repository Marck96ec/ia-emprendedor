import { z } from "zod";

import {
  ValuePropositionSchema,
  type ValueProposition,
} from "./value-proposition-agent";

export const AI_ASSISTED_ACTION_TYPES = [
  "value_proposition",
  "commercial_messages",
] as const;

export type AIAssistedActionType =
  (typeof AI_ASSISTED_ACTION_TYPES)[number];

const commercialMessageText = z.string().trim().min(1);

export const CommercialMessageSchema = z.object({
  label: commercialMessageText,
  changing_factor: commercialMessageText,
  message: commercialMessageText,
});

export const CommercialMessagesSchema = z.object({
  deliverable_type: z.literal("commercial_messages"),
  messages: z.array(CommercialMessageSchema).length(3),
  explanation: z.string().trim().min(1),
}).superRefine((deliverable, context) => {
  const factors = deliverable.messages.map((message) =>
    message.changing_factor
      .trim()
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  );

  if (new Set(factors).size !== factors.length) {
    context.addIssue({
      code: "custom",
      message: "Cada mensaje debe cambiar un factor diferente",
      path: ["messages"],
    });
  }
});

export type CommercialMessages = z.infer<
  typeof CommercialMessagesSchema
>;

const CommercialOfferSchema = z.object({
  offer_name: commercialMessageText,
  target_customer: commercialMessageText,
  promise: commercialMessageText,
  what_is_included: commercialMessageText,
  call_to_action: commercialMessageText,
});

export const CommercialOffersSchema = z.object({
  deliverable_type: z.literal("commercial_offers"),
  offers: z.array(CommercialOfferSchema).length(2),
  explanation: z.string().trim().min(1),
}).superRefine((deliverable, context) => {
  const offerNames = deliverable.offers.map((offer) =>
    offer.offer_name
      .trim()
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  );

  if (new Set(offerNames).size !== offerNames.length) {
    context.addIssue({
      code: "custom",
      message: "Cada oferta debe ser distinguible por su nombre",
      path: ["offers"],
    });
  }
});

export type CommercialOffers = z.infer<
  typeof CommercialOffersSchema
>;

export type ActionDeliverable =
  | ValueProposition
  | CommercialMessages
  | CommercialOffers;

export type AIAssistedActionDefinition = {
  execution_mode: "ai_assisted";
  action_type: AIAssistedActionType;
  action: string;
  objective: string;
  success_metric: string;
};

export const AI_ACTION_CAPABILITIES = {
  value_proposition: {
    action_type: "value_proposition",
    deliverable_types: ["value_proposition"] as const,
  },
  commercial_messages: {
    action_type: "commercial_messages",
    deliverable_types: ["commercial_offers", "commercial_messages"] as const,
  },
} as const;

export function getAIAssistedActionCapability(actionType: string) {
  if (actionType === "value_proposition") {
    return AI_ACTION_CAPABILITIES.value_proposition;
  }

  if (actionType === "commercial_messages") {
    return AI_ACTION_CAPABILITIES.commercial_messages;
  }

  return null;
}

export const AIActionDefinitionSchema = z.object({
  execution_mode: z.enum(["manual", "ai_assisted"]),
  action_type: z.enum([
    "generic",
    "value_proposition",
    "commercial_messages",
  ]),
  action: z.string().trim().min(2),
  objective: z.string().trim().min(2),
  success_metric: z.string().trim().min(2),
}).superRefine((action, context) => {
  if (
    action.execution_mode === "manual" &&
    action.action_type !== "generic"
  ) {
    context.addIssue({
      code: "custom",
      message: "Una acción asistida por IA no puede ser manual",
      path: ["execution_mode"],
    });
  }

  if (
    action.execution_mode === "ai_assisted" &&
    action.action_type === "generic"
  ) {
    context.addIssue({
      code: "custom",
      message: "Una acción asistida por IA debe tener un entregable",
      path: ["action_type"],
    });
  }

  if (
    action.execution_mode === "ai_assisted" &&
    !getAIAssistedActionCapability(action.action_type)
  ) {
    context.addIssue({
      code: "custom",
      message: "La acción asistida no tiene una capacidad ejecutable",
      path: ["action_type"],
    });
  }
});

export type AIActionDefinition = z.infer<
  typeof AIActionDefinitionSchema
>;

export function parseActionDeliverable(
  actionType: string,
  content: unknown,
) {
  if (actionType === "commercial_messages") {
    return z.union([
      CommercialOffersSchema,
      CommercialMessagesSchema,
    ]).safeParse(content);
  }

  if (actionType === "value_proposition") {
    return ValuePropositionSchema.safeParse(content);
  }

  return z.never().safeParse(content);
}

export function parseStoredActionResult(
  actionType: string,
  status: string,
  draftContent: unknown,
  approvedContent: unknown,
) {
  return parseActionDeliverable(
    actionType,
    status === "approved" ? approvedContent : draftContent,
  );
}

export function validateActionResultForApproval(
  action: unknown,
  result: {
    status: string;
    draft_content: unknown;
  },
) {
  const actionDefinition = AIActionDefinitionSchema.safeParse(action);

  if (
    !actionDefinition.success ||
    actionDefinition.data.execution_mode !== "ai_assisted" ||
    actionDefinition.data.action_type === "generic"
  ) {
    return {
      success: false as const,
      error: "La acción no tiene un entregable asistido válido",
    };
  }

  if (result.status !== "draft") {
    return {
      success: false as const,
      error: "Solo se pueden aprobar borradores",
    };
  }

  const content = parseActionDeliverable(
    actionDefinition.data.action_type,
    result.draft_content,
  );

  if (!content.success) {
    return {
      success: false as const,
      error: "El contenido del entregable no es válido",
    };
  }

  return {
    success: true as const,
    action: actionDefinition.data,
    content: content.data,
  };
}