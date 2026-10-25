import { run } from "@openai/agents";

import type { DecisionHypothesis } from "../decision-learning";
import type { StrategicDiagnosis } from "./ceo-agent";
import { evidenceAgent } from "./evidence-agent";
import {
  ExternalEvidenceSchema,
  type ExternalEvidence,
} from "./external-evidence";

const MAX_GENERATION_ATTEMPTS = 2;

export type GenerateExternalEvidenceInput = {
  business: {
    name: string;
    revenueModel: string;
    description: string | null;
  };
  strategicDiagnosis: StrategicDiagnosis;
  decisionHypothesis: DecisionHypothesis;
};

type EvidenceRunItem = {
  type?: unknown;
  rawItem?: {
    type?: unknown;
    providerData?: {
      type?: unknown;
    };
  };
};

type EvidenceRunResult = {
  finalOutput?: unknown;
  newItems?: EvidenceRunItem[];
};

export type EvidenceAgentRunner = (
  prompt: string,
) => Promise<EvidenceRunResult>;

const defaultEvidenceAgentRunner: EvidenceAgentRunner = (prompt) =>
  run(evidenceAgent, prompt) as Promise<EvidenceRunResult>;

export async function generateExternalEvidence(
  input: GenerateExternalEvidenceInput,
  runner: EvidenceAgentRunner = defaultEvidenceAgentRunner,
): Promise<ExternalEvidence> {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const result = await runner(buildEvidencePrompt(input));

    if (!hasWebSearchCall(result.newItems)) {
      return insufficientEvidence(
        "No se pudo demostrar que la búsqueda web se ejecutó.",
      );
    }

    const parsed = ExternalEvidenceSchema.safeParse(result.finalOutput);
    if (parsed.success) {
      return parsed.data;
    }

    if (attempt === MAX_GENERATION_ATTEMPTS) {
      throw new Error("External evidence output did not match its schema");
    }
  }

  throw new Error("External evidence generation exhausted retries");
}

function buildEvidencePrompt(input: GenerateExternalEvidenceInput): string {
  const decision = input.strategicDiagnosis.critical_decision;
  const bottleneck = input.strategicDiagnosis.bottleneck;

  return `
Investiga la decisión interna ya tomada. No generes una segunda decisión ni cambies
critical_decision o decision_hypothesis.

Business model: ${input.business.revenueModel}
Business description: ${input.business.description ?? "No disponible"}
Current bottleneck: ${bottleneck.description}
Bottleneck metric: ${bottleneck.affected_metric}
Critical decision question: ${decision.question}
Recommended direction: ${decision.recommended_direction}
Target metric: ${decision.target_metric}
Decision hypothesis: ${input.decisionHypothesis.statement}
Validation signal: ${input.decisionHypothesis.validation_signal}

Construye una pregunta investigable que traduzca esta decisión a evidencia sobre
estrategias y negocios comparables, no una búsqueda literal de la oración. Busca
señales que apoyen la dirección y señales que la cuestionen. Devuelve entre cero y
tres fuentes de calidad, sin rellenar una cuota. La síntesis debe explicar si la
evidencia es favorable, mixta, contradictoria o insuficiente.
`;
}

function hasWebSearchCall(items: EvidenceRunItem[] | undefined): boolean {
  return (items ?? []).some((item) => {
    const providerType = item.rawItem?.providerData?.type;
    return (
      item.type === "hosted_tool_call" &&
      (providerType === "web_search_call" || providerType === "web_search")
    );
  });
}

function insufficientEvidence(reason: string): ExternalEvidence {
  return {
    research_question: "No se pudo completar la investigación externa.",
    status: "insufficient",
    items: [],
    synthesis: reason,
    confidence: "low",
  };
}