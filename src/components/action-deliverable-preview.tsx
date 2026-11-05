"use client";

import type {
  ActionDeliverable,
  CommercialMessages,
  CommercialOffers,
} from "@/lib/ai/action-deliverables";
import { CopyMessageButton } from "@/components/copy-message-button";

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

function ResultSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-200 pb-5 last:border-0 last:pb-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-2 text-lg leading-8 text-slate-900">{children}</div>
    </div>
  );
}

export function ActionDeliverablePreview({
  content,
}: {
  content: ActionDeliverable;
}) {
  if (isCommercialOffers(content)) {
    return (
      <div className="grid gap-4">
        {content.offers.map((offer, index) => (
          <article key={offer.offer_name} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Oferta {index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">{offer.offer_name}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ResultSection label="Cliente objetivo">{offer.target_customer}</ResultSection>
              <ResultSection label="Promesa">{offer.promise}</ResultSection>
              <ResultSection label="Qué incluye">{offer.what_is_included}</ResultSection>
              <ResultSection label="Llamado a la acción">{offer.call_to_action}</ResultSection>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (isCommercialMessages(content)) {
    return (
      <div className="grid gap-4">
        {content.messages.map((message, index) => (
          <article key={`${message.changing_factor}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Variante {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{message.label}</h3>
              </div>
              <CopyMessageButton message={message.message} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">Factor que cambia: {message.changing_factor}</p>
            <p className="mt-3 text-lg leading-8 text-slate-900">{message.message}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResultSection label="Propuesta de valor">{content.value_proposition}</ResultSection>
      <ResultSection label="Cliente objetivo">{content.target_customer}</ResultSection>
      <ResultSection label="Problema que resuelve">{content.problem_solved}</ResultSection>
      <ResultSection label="Diferenciador">{content.differentiator}</ResultSection>
      <ResultSection label="3 beneficios">
        <ul className="list-disc space-y-2 pl-5">
          {content.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
        </ul>
      </ResultSection>
    </div>
  );
}

export function getActionDeliverableTitle(content: ActionDeliverable): string {
  if (isCommercialOffers(content)) return "Ofertas comerciales";
  if (isCommercialMessages(content)) return "Mensajes comerciales";
  return "Propuesta de valor";
}

export function getActionDeliverableExplanation(content: ActionDeliverable): string {
  return "explanation" in content ? content.explanation : content.rationale;
}
