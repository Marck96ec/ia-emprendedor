import { run } from "@openai/agents";

import {
  ceoAgent,
  type CEOPlan,
} from "@/lib/ai/ceo-agent";

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
Analiza el siguiente negocio.

DATOS DEL NEGOCIO:

${JSON.stringify(input, null, 2)}

Genera el diagnóstico ejecutivo, las 3 prioridades y el plan
de acción para los próximos 7 días.
`,
  );

  if (!result.finalOutput) {
    throw new Error(
      "El CEO IA no produjo una respuesta",
    );
  }

  return result.finalOutput;
}