import { run } from "@openai/agents";
import { ZodError } from "zod";

import {
  ceoAgent,
  CEOPlanModelSchema,
  CEOPlanSchema,
  type StrategicDiagnosis,
  validateCEOPlanBusinessRules,
  type CEOPlan,
} from "./ceo-agent";
import type { BusinessKnowledge } from "../business-knowledge-types";
import {
  CEOPlanError,
  isInvalidCEOPlanOutputError,
  isRetryableCEOPlanError,
  toSafeCEOPlanError,
} from "./ceo-plan-errors";
import { parseActionCaptureModel } from "../action-capture";
import type { StrategicContinuity } from "../strategic-continuity";

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
      completionData?: unknown;
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
    strategicContinuity?: StrategicContinuity;
    historicalLearning?: Array<{
      weekNumber: number;
      outcomeStatus: "positive" | "mixed" | "no_change" | "negative";
      learning: string | null;
      hypothesisStatus: "validated" | "rejected" | "inconclusive" | null;
      decisionQuestion: string | null;
      targetMetric: string | null;
      actions: string[];
    }>;
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
  let previousIssueMessages: string[] = [];

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
    ? `\nCampos que fallaron validación:\n${previousIssuePaths.join("\n")}\n\nRazones de validación:\n${previousIssuePaths.map((path, index) => `- ${path}: ${previousIssueMessages[index] ?? "revisa este campo"}`).join("\n")}\n\nThe previous output failed structural validation. Regenerate the complete structured output. For every capture field, including child fields inside repeatable_group:\n- id is required;\n- id must match ^[a-z][a-z0-9_]*$;\n- ids must be unique within the same scope;\n- do not remove required evidence just to satisfy validation.\n`
    : ""
}`;

      const result = await runner(
        ceoAgent,
        `
Analiza el siguiente negocio y prepara su próximo plan semanal.

DATOS DISPONIBLES:

${JSON.stringify(input, null, 2)}

Si previousWeek es null, estás preparando la primera semana.
En la primera semana no existe continuidad estratégica previa: devuelve
strategic_continuity como null. No inventes una continuidad.

Si previousWeek contiene información, estás preparando una nueva
semana y debes utilizar el resultado real y los aprendizajes de la
semana anterior para adaptar tus decisiones. Distingue siempre la
ejecución del resultado: completar acciones no equivale a éxito.

Si existe previousWeek.historicalLearning, úsalo para reconocer patrones
acumulados entre semanas. No repitas una prueba solo porque el texto parezca
útil: explica qué cambió y qué evidencia sigue faltando.

Los resultados de acciones de la semana anterior son evidencia declarada por
el empresario. Úsalos para confirmar o cuestionar hipótesis, detectar patrones
e identificar datos faltantes. No necesitas el capture_schema en ese contexto:
usa solo la acción y su resultado real. Distingue observaciones, percepciones y
métricas, y no conviertas automáticamente completion_data en verdad absoluta.

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
- strategic_continuity con mode continuation, deepening, adjustment, change o
  repetition cuando exista previousWeek; en caso contrario debe ser null.
  Cuando exista, incluye siempre una justificación,
  una incertidumbre pendiente, una señal nueva verificable y la brecha de
  evidencia anterior.
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
- Usa commercial_messages cuando la acción necesite un entregable comercial
  asistido, especialmente dos ofertas distinguibles para revisión.
- Si no es relevante, todas deben ser manual/generic.
- value_proposition y commercial_messages siempre implican ai_assisted y
  tienen un camino de ejecución soportado por el workspace.
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
- Cada acción debe incluir un capture_schema específico, con preguntas sobre
  evidencia concreta para una decisión futura y no solo sobre ejecución.
  Cuando exista una meta cuantitativa, captura por separado la meta
  planificada y la cantidad realmente observada. Nunca uses min_items para
  exigir que el empresario alcance la meta: cero o un resultado inferior a la
  meta es válido si se registra con honestidad. Usa max_items solo para
  proteger el tamaño del formulario.
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

      const appOutput = CEOPlanSchema.safeParse(result.finalOutput);

      let normalizedOutput: CEOPlan;
      if (appOutput.success) {
        normalizedOutput = appOutput.data;
      } else {
        const modelOutput = normalizeCEOPlanModelOutput(result.finalOutput);
        if (!modelOutput.success) {
          const validationError = appOutput.success
            ? modelOutput.error
            : new ZodError([
                ...modelOutput.error.issues,
                ...appOutput.error.issues,
              ]);
          throw new CEOPlanError(
            "structural",
            "CEO_PLAN_STRUCTURAL_OUTPUT_INVALID",
            "El output del CEO IA no coincide con el contrato estructural.",
            getIssuePaths(validationError),
            getIssueMessages(validationError),
          );
        }
        normalizedOutput = modelOutput.data;
      }

      const structuralOutput = CEOPlanSchema.safeParse(normalizedOutput);
      if (!structuralOutput.success) {
        throw new CEOPlanError(
          "structural",
          "CEO_PLAN_STRUCTURAL_OUTPUT_INVALID",
          "El output del CEO IA no coincide con el contrato estructural.",
          getIssuePaths(structuralOutput.error),
          getIssueMessages(structuralOutput.error),
        );
      }

      const businessRules = validateCEOPlanBusinessRules(
        structuralOutput.data,
        input.diagnostic.ownerHoursPerWeek,
        input.previousWeek?.actions.map((action) => ({
          action: action.action,
          objective: action.objective,
          successMetric: action.successMetric,
        })),
      );

      if (!businessRules.success) {
        throw new CEOPlanError(
          "semantic",
          "CEO_PLAN_SEMANTIC_OUTPUT_INVALID",
          "El output del CEO IA incumple reglas de coherencia del plan.",
          getIssuePaths(businessRules.error),
          getIssueMessages(businessRules.error),
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
      logCEOPlanProviderError(error);
      const normalized = toSafeCEOPlanError(error);

      if (
        attempt < MAX_GENERATION_ATTEMPTS &&
        isRetryableCEOPlanError(normalized)
      ) {
        previousIssuePaths = normalized.issuePaths;
        previousIssueMessages = normalized.issueMessages;
        continue;
      }

      function logCEOPlanProviderError(error: unknown) {
        if (error instanceof CEOPlanError) {
          return;
        }

        const providerError = error as {
          name?: unknown;
          code?: unknown;
          type?: unknown;
          status?: unknown;
          statusCode?: unknown;
        };
        const safeProviderError = isInvalidCEOPlanOutputError(error)
          ? toSafeCEOPlanError(error)
          : undefined;

        console.error("CEO_PLAN_PROVIDER_ERROR", {
          error_name: typeof providerError.name === "string" ? providerError.name : undefined,
          error_code: typeof providerError.code === "string" ? providerError.code : undefined,
          error_type: typeof providerError.type === "string" ? providerError.type : undefined,
          status: typeof providerError.status === "number" || typeof providerError.status === "string"
            ? providerError.status
            : providerError.statusCode,
          safe_code: safeProviderError?.code,
          safe_kind: safeProviderError?.kind,
          issue_paths: safeProviderError?.issuePaths,
          issue_messages: safeProviderError?.issueMessages,
          prompt_version: "v5-strategic-learning",
          model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
        });
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

function getIssueMessages(error: ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}

function normalizeCEOPlanModelOutput(value: unknown) {
  const modelOutput = CEOPlanModelSchema.safeParse(value);
  if (!modelOutput.success) {
    return modelOutput;
  }

  const normalizedWeeklyPlan = [];
  const captureIssues = [];

  for (const [index, item] of modelOutput.data.weekly_plan.entries()) {
    const captureSchema = parseActionCaptureModel(item.capture_schema);
    if (!captureSchema.success) {
      captureIssues.push(
        ...captureSchema.error.issues.map((issue) => ({
          ...issue,
          path: [
            "weekly_plan",
            index,
            "capture_schema",
            ...issue.path,
          ],
        })),
      );
      continue;
    }

    normalizedWeeklyPlan.push({
      ...item,
      capture_schema: captureSchema.data,
    });
  }

  if (captureIssues.length > 0) {
    return {
      success: false as const,
      error: new ZodError(captureIssues),
    };
  }

  const {
    strategic_continuity: strategicContinuity,
    ...planWithoutContinuity
  } = modelOutput.data;

  return CEOPlanSchema.safeParse({
    ...planWithoutContinuity,
    ...(strategicContinuity === null
      ? {}
      : { strategic_continuity: strategicContinuity }),
    weekly_plan: normalizedWeeklyPlan,
  });
}