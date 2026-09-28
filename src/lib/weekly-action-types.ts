export const ACTION_EXECUTION_MODES = [
  "manual",
  "ai_assisted",
] as const;

export type ActionExecutionMode =
  (typeof ACTION_EXECUTION_MODES)[number];

export const ACTION_TYPES = [
  "generic",
  "value_proposition",
] as const;

export type ActionType =
  (typeof ACTION_TYPES)[number];
