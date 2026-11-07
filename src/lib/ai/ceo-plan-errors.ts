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
    public readonly issueMessages: string[] = [],
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
    const validationDetails = getSafeSDKValidationDetails(error);
    return new CEOPlanError(
      "structural",
      "CEO_PLAN_STRUCTURAL_OUTPUT_INVALID",
      "El output del CEO IA no coincide con el contrato estructural.",
      validationDetails.issuePaths,
      validationDetails.issueMessages,
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

function getSafeSDKValidationDetails(error: ModelBehaviorError) {
  const match = error.message.match(
    /^Invalid output type: final assistant output failed schema validation at "([^"]{1,200})" \(([^()\r\n]{1,200})\)\.?$/,
  );

  if (!match || !/^[A-Za-z0-9_.[\]-]+$/.test(match[1])) {
    return { issuePaths: [], issueMessages: [] };
  }

  return {
    issuePaths: [match[1]],
    issueMessages: [match[2]],
  };
}

export function safeCEOPlanLog(error: unknown) {
  const normalized = toSafeCEOPlanError(error);

  return {
    code: normalized.code,
    kind: normalized.kind,
    issuePaths: normalized.issuePaths,
    issueMessages: normalized.issueMessages,
  };
}