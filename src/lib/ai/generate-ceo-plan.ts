import { run } from "@openai/agents";
import { ZodError } from "zod";

import {
  ceoAgent,
  CEOPlanSchema,
  type StrategicDiagnosis,
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
    strategicDiagnosis: StrategicDiagnosis;

    priorities: unknown;
    weeklyPlan: unknown;

    actions: Array<{
      sequence: number;
      action: string;
      objective: string;
      reason: string;
      successMetric: string;
      expectedResult: string;
      roleRecommendation: "execute" | "delegate" | "automate" | "defer";
      roleReason: string;
      estimatedHours: number;
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
      decisionLearning: {
        decisionQuestion: string;
        recommendedDirection: string;
        hypothesis: string;
        targetMetric: string;
        expectedOutcome: string;
        observedResult: string;
        evidence: string[];
        learning: string;
        hypothesisStatus: "validated" | "rejected" | "inconclusive";
      } | null;
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

  let previousIssuePaths: string[] = [];

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
no una explicación del error. Si excediste la capacidad semanal, reduce,
delega, automatiza o difiere acciones hasta respetar las horas disponibles.

Si el error anterior fue causado por confidence high con múltiples unknowns,
conserva los unknowns relevantes y reduce confidence a medium o low.
No borres incertidumbre real solo para pasar la validación.
${
  previousIssuePaths.length > 0
    ? `\nCampos que fallaron validación:\n${previousIssuePaths.join("\n")}\n`
    : ""
}`;

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

Antes de recomendar la siguiente decisión, revisa explícitamente
previousWeek.review.decisionLearning cuando exista. Si la hipótesis fue
validated, escala, profundiza o pasa al siguiente bottleneck en lugar de
repetir la misma prueba. Si fue rejected, cuestiona la dirección anterior y
considera una hipótesis alternativa o un nuevo bottleneck. Si fue
inconclusive, decide si hace falta mejor evidencia, una prueba más fuerte o
si la decisión ya no merece más tiempo. No trates una hipótesis como verdad:
la evidencia puede sostenerla, contradecirla o seguir siendo insuficiente.

Un esfuerzo alto con no_change exige reevaluar la estrategia y no
repetir mecánicamente el plan. Un resultado positive con pocas
acciones exige identificar qué produjo el impacto. Si hubo negative,
adapta las prioridades sin dramatizar.

businessKnowledge contiene únicamente conocimiento canónico aprobado
por el usuario. Reutilízalo cuando siga siendo válido y considera
revisarlo solo si el contexto actual indica que quedó obsoleto.

Genera:

- diagnóstico ejecutivo actualizado
- razonamiento estratégico explícito, en este orden:
  business_understanding, diagnosis, bottleneck, evidence, confidence,
  unknowns, alternative_hypothesis, critical_decision y decision_hypothesis
  - exactamente 3 prioridades después de la hipótesis
  - entre 1 y 5 acciones después de las prioridades, únicamente las necesarias
    para ejecutar o validar la decisión crítica

La decisión crítica es la unidad central del plan. No saltes directamente
del contexto a las prioridades: explica primero el entendimiento del negocio,
el diagnóstico, el cuello de botella, la evidencia, la confianza, los
desconocidos relevantes y una hipótesis alternativa. El diagnóstico textual
legacy debe resumir strategic_diagnosis.diagnosis.summary.

Mantén coherencia entre confidence y unknowns:

- high: máximo 1 unknown relevante.
- medium/low: puede contener múltiples unknowns cuando la información
  disponible no permite mayor certeza.
- Nunca elimines unknowns reales para aparentar mayor confianza.

Después de critical_decision formula decision_hypothesis directamente a
partir de esa decisión. statement responde qué creemos que ocurrirá si
seguimos recommended_direction; validation_signal describe la señal que
permitiría saber si estábamos en lo correcto. Puede ser cualitativa o
cuantitativa, pero no inventes objetivos numéricos sin evidencia.

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
- Todas las acciones deben derivarse explícitamente de strategic_diagnosis.critical_decision
  y del bottleneck; deben ejecutar la dirección recomendada, validar una hipótesis,
  reducir incertidumbre o medir la variable objetivo.
- Genera únicamente las acciones necesarias. No agregues tareas para completar una cuota.
- Considera diagnostic.ownerHoursPerWeek, la capacidad real mostrada en previousWeek,
  la confianza, los unknowns y la complejidad del experimento al decidir la cantidad.
- Clasifica también role_recommendation, role_reason y estimated_hours. La suma
  de estimated_hours no puede superar diagnostic.ownerHoursPerWeek.
- Cada acción debe incluir reason, success_metric y expected_result. reason debe relacionarla
  con la decisión crítica, el bottleneck y el diagnóstico; expected_result debe describir
  el aprendizaje o cambio empresarial esperado, no repetir la tarea.
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
        input.diagnostic.ownerHoursPerWeek,
      );

      if (!businessRules.success) {
        throw new CEOPlanError(
          "semantic",
          "CEO_PLAN_SEMANTIC_OUTPUT_INVALID",
          "El output del CEO IA incumple reglas de coherencia del plan.",
          getIssuePaths(businessRules.error),
        );
      }

      const allocatedHours = businessRules.data.weekly_plan.reduce(
        (total, item) => total + item.estimated_hours,
        0,
      );

      return {
        ...businessRules.data,
        time_allocation: {
          ...businessRules.data.time_allocation,
          available_hours: input.diagnostic.ownerHoursPerWeek,
          allocated_hours: allocatedHours,
          reserved_hours:
            input.diagnostic.ownerHoursPerWeek - allocatedHours,
        },
        diagnosis:
          businessRules.data.strategic_diagnosis.diagnosis.summary,
      };
    } catch (error) {
      const normalized = toSafeCEOPlanError(error);

      if (
        attempt < MAX_GENERATION_ATTEMPTS &&
        isRetryableCEOPlanError(normalized)
      ) {
        previousIssuePaths = normalized.issuePaths;
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