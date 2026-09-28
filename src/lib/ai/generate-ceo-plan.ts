import { run } from "@openai/agents";

import {
  ceoAgent,
  type CEOPlan,
} from "@/lib/ai/ceo-agent";
import type { BusinessKnowledge } from "@/lib/business-knowledge";

type GenerateCEOPlanInput = {
  business: {
    name: string;
    businessType: string | null;
    description: string | null;
  };

  diagnostic: {
    businessStage: string;
    teamSize: number;
    mainChallenge: string;
    primaryGoal: string;
    customersDescription: string;
    salesProcess: string;
    monthlyRevenue: number | null;
    currencyCode: string | null;
  };

  previousWeek: {
    weekNumber: number;

    executiveSummary: string | null;
    diagnosis: string | null;

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
    };
  } | null;
  businessKnowledge: BusinessKnowledge;
};

export async function generateCEOPlan(
  input: GenerateCEOPlanInput,
): Promise<CEOPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY no está configurada",
    );
  }

  const result = await run(
    ceoAgent,
    `
Analiza el siguiente negocio y prepara su próximo plan semanal.

DATOS DISPONIBLES:

${JSON.stringify(input, null, 2)}

Si previousWeek es null, estás preparando la primera semana.

Si previousWeek contiene información, estás preparando una nueva
semana y debes utilizar los resultados y aprendizajes de la semana
anterior para adaptar tus decisiones.

businessKnowledge contiene únicamente conocimiento canónico aprobado
por el usuario. Reutilízalo cuando siga siendo válido y considera
revisarlo solo si el contexto actual indica que quedó obsoleto.

Genera:

- diagnóstico ejecutivo actualizado
- exactamente 3 prioridades
- exactamente 7 acciones, una para cada día del 1 al 7

Para cada acción, decide explícitamente execution_mode y action_type
siguiendo estas reglas:

- Como máximo una acción puede ser ai_assisted/value_proposition.
- Usa value_proposition solo cuando sea relevante para el diagnóstico
  y las prioridades del negocio.
- Si no es relevante, todas deben ser manual/generic.
- value_proposition siempre implica ai_assisted.
- generic siempre implica manual.
`,
  );

  if (!result.finalOutput) {
    throw new Error(
      "El CEO IA no produjo una respuesta",
    );
  }

  return result.finalOutput;
}