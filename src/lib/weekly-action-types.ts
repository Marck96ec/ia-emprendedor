export const ACTION_EXECUTION_MODES = [
  "manual",
  "ai_assisted",
] as const;

export type ActionExecutionMode =
  (typeof ACTION_EXECUTION_MODES)[number];

export const ACTION_TYPES = [
  "generic",
  "value_proposition",
  "commercial_messages",
] as const;

export type ActionType =
  (typeof ACTION_TYPES)[number];

export const ACTION_ROLE_RECOMMENDATIONS = [
  "execute",
  "delegate",
  "automate",
  "defer",
] as const;

export type ActionRoleRecommendation =
  (typeof ACTION_ROLE_RECOMMENDATIONS)[number];
