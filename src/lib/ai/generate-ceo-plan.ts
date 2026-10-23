import { run } from "@openai/agents";
import { ZodError } from "zod";

import {
  ceoAgent,
  CEOPlanSchema,
  validateCEOPlanBusinessRules,
  type CEOPlan,
} from "./ceo-agent";
import type { BusinessKnowledge } from "../business-knowledge-types";
import {
  CEOPlanError,
  isRetryableCEOPlanError,
  toSafeCEOPlanError,
} from "./ceo-plan-errors";

const MAX_GENERATION_ATTEMPTS = 2;

type CEOPlanRunResult = {
  finalOutput?: unknown;
};

export type CEOPlanRunner = (
  agent: typeof ceoAgent,
  prompt: string,
) => Promise<CEOPlanRunResult>;

const defaultCEOPlanRunner: CEOPlanRunner = (
  agent,
  prompt,
) => run(agent, prompt) as Promise<CEOPlanRunResult>;

export type GenerateCEOPlanInput = {
  business: {
    name: string;
    revenueModel: string;
    description: string | null;
  };

  diagnostic: {
    businessStage: string;
    teamSize: number;
    ownerHoursPerWeek: number;
    mainChallenge: string;
    primaryGoal: string;
    customersDescription: string;
    salesProcess: string;
    ownerResponsibilities: string;
    monthlyRevenue: number;
    currencyCode: string;
  };

  previousWeek: {
    weekNumber: number;

    executiveSummary: string | null;
    diagnosis: string | null;
    strategicDiagnosis: unknown;

    priorities: unknown;
    weeklyPlan: unknown;

    actions: Array<{
      day: number;
      action: string;
      objective: string;
      successMetric: string;
      status: string;
    }>;

    review: {
      whatWorked: string;
      whatDidntWork: string;
      businessChanges: string;
      nextWeekFocus: string | null;
      completedActions: number;
      totalActions: number;
      outcomeStatus: "positive" | "mixed" | "no_change" | "negative";
      outcomeSummary: string;
    };
  } | null;
  businessKnowledge: BusinessKnowledge;
};

export async function generateCEOPlan(
  input: GenerateCEOPlanInput,
  runner: CEOPlanRunner = defaultCEOPlanRunner,
): Promise<CEOPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new CEOPlanError(
      "configuration",
      "CEO_PLAN_CONFIGURATION_ERROR",
      "OPENAI_API_KEY no está configurada.",
    );
  }

  for (
    let attempt = 1;
    attempt <= MAX_GENERATION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const retryInstructions =
        attempt === 1
          ? ""
          : `
La respuesta anterior no cumplió el contrato. Corrige únicamente su
estructura y coherencia de clasificación. Devuelve un plan completo,
no una explicación del error.
`;

      const result = await runner(
        ceoAgent,
        `
Analiza el siguiente negocio y prepara su próximo plan semanal.

DATOS DISPONIBLES:

${JSON.stringify(input, null, 2)}

Si previousWeek es null, estás preparando la primera semana.

Si previousWeek contiene información, estás preparando una nueva
semana y debes utilizar el resultado real y los aprendizajes de la
semana anterior para adaptar tus decisiones. Distingue siempre la
ejecución del resultado: completar acciones no equivale a éxito.

Un esfuerzo alto con no_change exige reevaluar la estrategia y no
repetir mecánicamente el plan. Un resultado positive con pocas
acciones exige identificar qué produjo el impacto. Si hubo negative,
adapta las prioridades sin dramatizar.

businessKnowledge contiene únicamente conocimiento canónico aprobado
por el usuario. Reutilízalo cuando siga siendo válido y considera
revisarlo solo si el contexto actual indica que quedó obsoleto.

Genera:

- diagnóstico ejecutivo actualizado
- razonamiento estratégico explícito con business_understanding, diagnosis,
  bottleneck, evidence, uncertainty, alternative_hypothesis y
  critical_decision
- exactamente 3 prioridades
- exactamente 7 acciones, una para cada día del 1 al 7

La decisión crítica es la unidad central del plan. No saltes directamente
del contexto a las prioridades: explica primero el entendimiento del negocio,
el diagnóstico, el cuello de botella, la evidencia, la incertidumbre y una
hipótesis alternativa. El diagnóstico ejecutivo debe resumir ese razonamiento.

Para cada acción, decide explícitamente execution_mode y action_type
siguiendo estas reglas:

- Como máximo una acción puede ser ai_assisted.
- Usa value_proposition solo cuando sea relevante para el diagnóstico
  y las prioridades del negocio.
- Usa commercial_messages cuando la acción solicite varios mensajes,
  variantes, versiones o copies comerciales.
- Si no es relevante, todas deben ser manual/generic.
- value_proposition y commercial_messages siempre implican ai_assisted.
- generic siempre implica manual.
${retryInstructions}
`,
      );

      if (!result.finalOutput) {
        throw new CEOPlanError(
          "structural",
          "CEO_PLAN_STRUCTURAL_OUTPUT_INVALID",
          "El CEO IA no produjo un output estructurado.",
        );
      }

      const structuralOutput = CEOPlanSchema.safeParse(
        result.finalOutput,
      );

      if (!structuralOutput.success) {
        throw new CEOPlanError(
          "structural",
          "CEO_PLAN_STRUCTURAL_OUTPUT_INVALID",
          "El output del CEO IA no coincide con el contrato estructural.",
          getIssuePaths(structuralOutput.error),
        );
      }

      const businessRules = validateCEOPlanBusinessRules(
        structuralOutput.data,
      );

      if (!businessRules.success) {
        throw new CEOPlanError(
          "semantic",
          "CEO_PLAN_SEMANTIC_OUTPUT_INVALID",
          "El output del CEO IA incumple reglas de coherencia del plan.",
          getIssuePaths(businessRules.error),
        );
      }

      return businessRules.data;
    } catch (error) {
      const normalized = toSafeCEOPlanError(error);

      if (
        attempt < MAX_GENERATION_ATTEMPTS &&
        isRetryableCEOPlanError(normalized)
      ) {
        continue;
      }

      throw normalized;
    }
  }

  throw new CEOPlanError(
    "structural",
    "CEO_PLAN_OUTPUT_RETRY_EXHAUSTED",
    "No fue posible obtener un plan válido.",
  );
}

function getIssuePaths(error: ZodError): string[] {
  return error.issues.map((issue) =>
    issue.path.join("."),
  );
}