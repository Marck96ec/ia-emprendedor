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

export type ActionDeliverable =
  | ValueProposition
  | CommercialMessages;

const COMMERCIAL_MESSAGE_PATTERN =
  /\b(mensaje|mensajes|variante|variantes|version|versiones|anuncio|anuncios|copy|whatsapp|correo|email|venta|ventas|vender|oferta|guion)\b/i;

const MULTIPLE_MESSAGE_PATTERN =
  /\b(2|3|dos|tres|varias|varios|multiples|múltiples)\s+(mensajes|variantes|versiones|anuncios|copies)\b/i;

export function isCommercialMessagesRequest(input: {
  action: string;
  objective: string;
  success_metric: string;
}): boolean {
  const text = [
    input.action,
    input.objective,
    input.success_metric,
  ].join(" ");

  return (
    COMMERCIAL_MESSAGE_PATTERN.test(text) &&
    (MULTIPLE_MESSAGE_PATTERN.test(text) ||
      /\b(mensaje|mensajes|variante|variantes|version|versiones)\b/i.test(text))
  );
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

  const requestsCommercialMessages = isCommercialMessagesRequest(action);

  if (
    action.action_type === "commercial_messages" &&
    !requestsCommercialMessages
  ) {
    context.addIssue({
      code: "custom",
      message:
        "La acción commercial_messages debe solicitar mensajes o variantes comerciales",
      path: ["action_type"],
    });
  }

  if (
    action.action_type === "value_proposition" &&
    requestsCommercialMessages
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Una acción que solicita mensajes o variantes debe usar commercial_messages",
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
    return CommercialMessagesSchema.safeParse(content);
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