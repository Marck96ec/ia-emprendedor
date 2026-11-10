import type {
  ActionDeliverable,
  CommercialMessages,
  CommercialOffers,
} from "@/lib/ai/action-deliverables";

function isCommercialOffers(
  content: ActionDeliverable,
): content is CommercialOffers {
  return "deliverable_type" in content && content.deliverable_type === "commercial_offers";
}

function isCommercialMessages(
  content: ActionDeliverable,
): content is CommercialMessages {
  return "deliverable_type" in content && content.deliverable_type === "commercial_messages";
}

export function getActionDeliverableTitle(content: ActionDeliverable): string {
  if (isCommercialOffers(content)) return "Ofertas comerciales";
  if (isCommercialMessages(content)) return "Mensajes comerciales";
  return "Propuesta de valor";
}

export function getActionDeliverableExplanation(content: ActionDeliverable): string {
  return "explanation" in content ? content.explanation : content.rationale;
}
