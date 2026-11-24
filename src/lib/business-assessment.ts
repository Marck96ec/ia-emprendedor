export const BUSINESS_ASSESSMENT_VERSION = "v1-existing-signals";

export const BUSINESS_DIMENSIONS = [
  "market",
  "finance",
  "liquidity",
  "operations",
  "autonomy",
  "growth",
] as const;

export type BusinessDimensionKey = (typeof BUSINESS_DIMENSIONS)[number];

export type BusinessAssessmentClassification =
  | "confirmed"
  | "provisional"
  | "indeterminate";

export type BusinessAssessmentConfidence = "low" | "medium" | "high";

export type BusinessHealthStatus =
  | "favorable"
  | "fragile"
  | "critical"
  | "mixed"
  | "unknown";

export type BusinessStage =
  | "starting"
  | "operating"
  | "growing"
  | "stalled";

export type BusinessMaturityLevel = 1 | 2 | 3 | 4 | 5;

export type BusinessMaturityStage =
  | "validation"
  | "survival"
  | "stability"
  | "expansion"
  | "consolidation";

export type AssessmentEvidenceSource =
  | "declared"
  | "documented"
  | "verified";

export type AssessmentEvidence = {
  id?: string;
  evidenceType:
    | "action_result"
    | "product"
    | "price"
    | "cost"
    | "opportunity"
    | "follow_up"
    | "sale"
    | "metric";
  certainty: "real" | "estimated" | "unknown";
  source: AssessmentEvidenceSource;
  observedAt?: string;
};

export type NormalizedBusinessAssessmentInput = {
  businessStage: BusinessStage | null;
  teamSize: number | null;
  ownerHoursPerWeek: number | null;
  ownerResponsibilities: string | null;
  customersDescription: string | null;
  salesProcess: string | null;
  monthlyRevenue: number | null;
  evidence: AssessmentEvidence[];
  completedActions: number;
  totalActions: number;
  latestOutcome: "positive" | "mixed" | "no_change" | "negative" | null;
  reviewedWeeks: number;
};

export type AssessmentDimension = {
  key: BusinessDimensionKey;
  label: string;
  status: BusinessHealthStatus;
  classification: BusinessAssessmentClassification;
  summary: string;
  explanation: string;
  risks: string[];
  missingInformation: string[];
  appliedRules: string[];
  evidenceIds: string[];
  lastEvaluatedAt: string | null;
};

export type AssessmentArea = {
  status: BusinessHealthStatus;
  classification: BusinessAssessmentClassification;
  confidence: BusinessAssessmentConfidence;
  summary: string;
  explanation: string;
  risks: string[];
  missingInformation: string[];
  appliedRules: string[];
  evidenceIds: string[];
  lastEvaluatedAt: string | null;
};

export type BusinessAssessment = {
  version: typeof BUSINESS_ASSESSMENT_VERSION;
  maturity: AssessmentArea & {
    level: BusinessMaturityLevel | null;
    stage: BusinessMaturityStage | null;
    stageLabel: string | null;
  };
  health: AssessmentArea;
  confidence: BusinessAssessmentConfidence;
  dimensions: AssessmentDimension[];
  criticalRisks: string[];
  missingInformation: string[];
  evidenceSummary: {
    declared: number;
    documented: number;
    verified: number;
  };
};

const dimensionLabels: Record<BusinessDimensionKey, string> = {
  market: "Mercado",
  finance: "Finanzas",
  liquidity: "Liquidez",
  operations: "Operaciones",
  autonomy: "Autonomía",
  growth: "Crecimiento",
};

const maturityStageLabels: Record<BusinessMaturityStage, string> = {
  validation: "Validación",
  survival: "Supervivencia",
  stability: "Estabilidad",
  expansion: "Expansión",
  consolidation: "Consolidación",
};

const maturityFromBusinessStage: Record<
  BusinessStage,
  { level: BusinessMaturityLevel; stage: BusinessMaturityStage }
> = {
  starting: { level: 1, stage: "validation" },
  operating: { level: 2, stage: "survival" },
  growing: { level: 4, stage: "expansion" },
  stalled: { level: 2, stage: "survival" },
};

function hasText(value: string | null): boolean {
  return Boolean(value?.trim());
}

function latestEvidenceDate(evidence: AssessmentEvidence[]): string | null {
  return evidence
    .map((item) => item.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

function evidenceFor(
  input: NormalizedBusinessAssessmentInput,
  ...types: AssessmentEvidence["evidenceType"][]
): AssessmentEvidence[] {
  return input.evidence.filter(
    (item) =>
      types.includes(item.evidenceType) &&
      item.certainty !== "unknown",
  );
}

function evidenceIds(evidence: AssessmentEvidence[]): string[] {
  return evidence
    .map((item) => item.id)
    .filter((value): value is string => Boolean(value));
}

function classificationFor(
  evidence: AssessmentEvidence[],
  missingInformation: string[],
): BusinessAssessmentClassification {
  if (missingInformation.length === 0 && evidence.some((item) => item.source === "verified")) {
    return "confirmed";
  }

  if (evidence.length === 0 && missingInformation.length > 0) {
    return "indeterminate";
  }

  return "provisional";
}

function confidenceFor(
  input: NormalizedBusinessAssessmentInput,
  missingInformation: string[],
): BusinessAssessmentConfidence {
  const documented = input.evidence.filter((item) => item.source === "documented").length;
  const verified = input.evidence.filter((item) => item.source === "verified").length;

  if (verified > 0 && missingInformation.length <= 1) return "high";
  if (documented >= 2 && missingInformation.length <= 3) return "medium";
  return "low";
}

function buildMaturity(
  input: NormalizedBusinessAssessmentInput,
): BusinessAssessment["maturity"] {
  const missingInformation: string[] = [];
  const appliedRules: string[] = [];
  const operationalEvidence = evidenceFor(input, "sale", "metric", "action_result");
  const stage = input.businessStage
    ? maturityFromBusinessStage[input.businessStage]
    : null;

  if (!input.businessStage) {
    missingInformation.push("La etapa declarada del negocio.");
  }

  if (operationalEvidence.length === 0) {
    missingInformation.push("Evidencia operativa documentada de ventas, métricas o resultados.");
  }

  let level = stage?.level ?? null;
  let maturityStage = stage?.stage ?? null;

  if (
    input.businessStage === "operating" &&
    operationalEvidence.length > 0 &&
    input.reviewedWeeks > 0 &&
    input.latestOutcome !== "negative"
  ) {
    level = 3;
    maturityStage = "stability";
    appliedRules.push(
      "Un negocio operativo con evidencia operativa y al menos una revisión no negativa se clasifica provisionalmente como Estabilidad.",
    );
  } else if (stage) {
    appliedRules.push(
      `La etapa ${input.businessStage} se mapea de forma provisional a ${maturityStageLabels[stage.stage]}; no se considera una certificación.`,
    );
  }

  if (!stage && operationalEvidence.length === 0) {
    appliedRules.push("Sin etapa ni evidencia operativa suficiente, no se asigna un nivel.");
  }

  const classification = classificationFor(
    operationalEvidence,
    missingInformation,
  );
  const confidence = confidenceFor(input, missingInformation);
  const status: BusinessHealthStatus = input.businessStage === "stalled"
    ? "fragile"
    : "unknown";
  const risks = input.businessStage === "stalled"
    ? ["El negocio se declara estancado; hace falta identificar la restricción concreta."]
    : [];

  return {
    level,
    stage: maturityStage,
    stageLabel: maturityStage ? maturityStageLabels[maturityStage] : null,
    status,
    classification,
    confidence,
    summary: maturityStage
      ? `${maturityStageLabels[maturityStage]} · evaluación ${classification === "provisional" ? "provisional" : classification === "confirmed" ? "confirmada" : "indeterminada"}`
      : "Estamos comprendiendo tu empresa.",
    explanation: level === null
      ? "No hay señales suficientes para asignar un nivel sin inventar una conclusión."
      : "El nivel combina la etapa declarada con señales operativas explícitas. Completar acciones no cambia el nivel automáticamente.",
    risks,
    missingInformation,
    appliedRules,
    evidenceIds: evidenceIds(operationalEvidence),
    lastEvaluatedAt: latestEvidenceDate(operationalEvidence),
  };
}

function buildHealth(
  input: NormalizedBusinessAssessmentInput,
): BusinessAssessment["health"] {
  const allEvidence = input.evidence;
  const operationalEvidence = evidenceFor(input, "sale", "metric", "action_result");
  const outcomes = input.latestOutcome ? [input.latestOutcome] : [];
  const missingInformation: string[] = [];
  const appliedRules: string[] = [];
  let status: BusinessHealthStatus = "unknown";
  let summary = "Salud sin evaluar";
  let explanation = "No hay información suficiente para evaluar la salud sin confundir ejecución con resultados empresariales.";
  let risks: string[] = [];

  if (input.latestOutcome === "negative") {
    status = "critical";
    summary = "Requiere atención crítica";
    explanation = "La última revisión registrada reporta un retroceso. Es una señal de atención temporal, no una sentencia permanente sobre la empresa.";
    risks = ["La última revisión registró un resultado negativo."];
    appliedRules.push("Un resultado semanal negativo registrado activa salud crítica temporal.");
  } else if (input.businessStage === "stalled" || input.latestOutcome === "mixed") {
    status = "fragile";
    summary = "Requiere atención";
    explanation = input.businessStage === "stalled"
      ? "El negocio se declara estancado y necesita identificar qué restricción impide avanzar."
      : "La última revisión registró un avance mixto; hace falta separar qué funcionó de lo que no.";
    risks = input.businessStage === "stalled"
      ? ["La etapa declarada es estancada."]
      : ["La última revisión registró un resultado mixto."];
    appliedRules.push(
      input.businessStage === "stalled"
        ? "La etapa estancada activa una alerta de fragilidad sin inferir un problema financiero."
        : "Un resultado semanal mixto activa una alerta de fragilidad.",
    );
  } else if (input.latestOutcome === "positive" && operationalEvidence.length > 0) {
    status = "favorable";
    summary = "Favorable con límites";
    explanation = "Existe un resultado semanal positivo junto con evidencia operativa documentada. Esto no prueba rentabilidad ni liquidez.";
    appliedRules.push("Resultado positivo y evidencia operativa documentada producen un estado favorable provisional.");
  } else {
    missingInformation.push("Resultados empresariales comparables y señales de liquidez.");
  }

  if (outcomes.length === 0) {
    missingInformation.push("Una revisión semanal con resultado observable.");
  }

  const classification = classificationFor(allEvidence, missingInformation);
  const confidence = confidenceFor(input, missingInformation);

  return {
    status,
    classification,
    confidence,
    summary,
    explanation,
    risks,
    missingInformation,
    appliedRules,
    evidenceIds: evidenceIds(allEvidence),
    lastEvaluatedAt: latestEvidenceDate(allEvidence),
  };
}

function buildDimension(
  input: NormalizedBusinessAssessmentInput,
  key: BusinessDimensionKey,
): AssessmentDimension {
  const evidence = (() => {
    switch (key) {
      case "market":
        return evidenceFor(input, "product", "opportunity", "sale");
      case "finance":
        return evidenceFor(input, "cost", "price", "metric");
      case "liquidity":
        return evidenceFor(input, "cost", "sale", "metric");
      case "operations":
        return evidenceFor(input, "action_result", "follow_up");
      case "autonomy":
        return [];
      case "growth":
        return evidenceFor(input, "opportunity", "sale", "metric");
    }
  })();

  const missingInformation: string[] = [];
  const appliedRules: string[] = [];
  let status: BusinessHealthStatus = "unknown";
  let summary = "Sin evaluar";
  let explanation = "";
  const risks: string[] = [];

  switch (key) {
    case "market":
      if (hasText(input.customersDescription) && evidence.length > 0) {
        status = "favorable";
        summary = "Favorable con límites";
        explanation = "Existe una descripción del cliente y evidencia documentada relacionada con mercado.";
        appliedRules.push("Descripción de clientes más evidencia de producto, oportunidad o venta.");
      } else {
        explanation = "Hay que conectar el cliente descrito con evidencia observable de mercado.";
        missingInformation.push("Evidencia observable de clientes, oportunidades o ventas.");
      }
      break;
    case "finance":
      explanation = "El ingreso mensual por sí solo no permite evaluar margen, costos ni rentabilidad.";
      missingInformation.push("Costos, margen y resultado financiero comparable.");
      break;
    case "liquidity":
      explanation = "No se puede evaluar liquidez sin entradas, salidas y obligaciones futuras comparables.";
      missingInformation.push("Flujo de caja, obligaciones futuras y fechas de pago.");
      break;
    case "operations":
      if (hasText(input.salesProcess) && evidence.length > 0) {
        status = "favorable";
        summary = "Favorable con límites";
        explanation = "Existe un proceso comercial declarado y actividad operativa documentada.";
        appliedRules.push("Proceso de ventas declarado más resultado o seguimiento documentado.");
      } else {
        explanation = "El proceso operativo necesita señales observables para evaluar su consistencia.";
        missingInformation.push("Resultados repetibles del proceso operativo.");
      }
      break;
    case "autonomy":
      explanation = "El tamaño del equipo no demuestra autonomía; hace falta evidencia de responsabilidades y delegación efectiva.";
      missingInformation.push("Distribución de responsabilidades, delegación y continuidad sin el dueño.");
      break;
    case "growth":
      if (input.businessStage === "growing" && evidence.length > 0) {
        status = "favorable";
        summary = "Favorable con límites";
        explanation = "El negocio declara una etapa de crecimiento y tiene señales documentadas relacionadas.";
        appliedRules.push("La etapa de crecimiento no se considera suficiente sin evidencia documentada.");
      } else {
        explanation = "No se penaliza no querer crecer; se necesita una intención y evidencia de crecimiento explícitas para evaluar esta dimensión.";
        missingInformation.push("Intención de crecimiento y capacidad demostrada para sostenerlo.");
      }
      break;
  }

  return {
    key,
    label: dimensionLabels[key],
    status,
    classification: classificationFor(evidence, missingInformation),
    summary,
    explanation,
    risks,
    missingInformation,
    appliedRules,
    evidenceIds: evidenceIds(evidence),
    lastEvaluatedAt: latestEvidenceDate(evidence),
  };
}

export function evaluateBusinessAssessment(
  input: NormalizedBusinessAssessmentInput,
): BusinessAssessment {
  const maturity = buildMaturity(input);
  const health = buildHealth(input);
  const dimensions = BUSINESS_DIMENSIONS.map((key) => buildDimension(input, key));
  const missingInformation = [
    ...new Set([
      ...maturity.missingInformation,
      ...health.missingInformation,
      ...dimensions.flatMap((dimension) => dimension.missingInformation),
    ]),
  ];

  return {
    version: BUSINESS_ASSESSMENT_VERSION,
    maturity,
    health,
    confidence: confidenceFor(input, missingInformation),
    dimensions,
    criticalRisks: [
      ...maturity.risks,
      ...health.risks,
      ...dimensions.flatMap((dimension) => dimension.risks),
    ],
    missingInformation,
    evidenceSummary: {
      declared: input.evidence.filter((item) => item.source === "declared").length,
      documented: input.evidence.filter((item) => item.source === "documented").length,
      verified: input.evidence.filter((item) => item.source === "verified").length,
    },
  };
}
