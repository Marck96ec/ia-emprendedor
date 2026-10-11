import { ModelBehaviorError } from "@openai/agents";

export type CEOPlanErrorKind =
  | "configuration"
  | "structural"
  | "semantic"
  | "transient"
  | "persistence";

export class CEOPlanError extends Error {
  constructor(
    public readonly kind: CEOPlanErrorKind,
    public readonly code: string,
    message: string,
    public readonly issuePaths: string[] = [],
  ) {
    super(message);
    this.name = "CEOPlanError";
  }
}

export function isRetryableCEOPlanError(
  error: unknown,
): error is CEOPlanError {
  return (
    error instanceof CEOPlanError &&
    (error.kind === "structural" || error.kind === "semantic")
  );
}

export function toSafeCEOPlanError(
  error: unknown,
): CEOPlanError {
  if (error instanceof CEOPlanError) {
    return error;
  }

  if (isInvalidCEOPlanOutputError(error)) {
    return new CEOPlanError(
      "structural",
      "CEO_PLAN_STRUCTURAL_OUTPUT_INVALID",
      "El output del CEO IA no coincide con el contrato estructural.",
    );
  }

  return new CEOPlanError(
    "transient",
    "CEO_PLAN_MODEL_REQUEST_FAILED",
    "Falló la solicitud al modelo del CEO IA.",
  );
}

export function isInvalidCEOPlanOutputError(
  error: unknown,
): error is ModelBehaviorError {
  return (
    error instanceof ModelBehaviorError &&
    error.message.startsWith("Invalid output type:")
  );
}

export function safeCEOPlanLog(error: unknown) {
  const normalized = toSafeCEOPlanError(error);

  return {
    code: normalized.code,
    kind: normalized.kind,
    issuePaths: normalized.issuePaths,
  };
}