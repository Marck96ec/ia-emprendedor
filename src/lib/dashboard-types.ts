import type { ActionExecutionMode, ActionType } from "@/lib/weekly-action-types";

export type DashboardActionResult = {
  id: string;
  status: "draft" | "approved";
};

export type DashboardAction = {
  id: string;
  sequence: number;
  action: string;
  objective: string;
  reason: string;
  success_metric: string;
  expected_result: string;
  status: "pending" | "completed";
  completed_at: string | null;
  execution_mode: ActionExecutionMode;
  action_type: ActionType;
  action_results: DashboardActionResult[];
};

export type DashboardWeeklyReview = {
  id: string;
  completed_actions: number;
  total_actions: number;
  outcome_status: "positive" | "mixed" | "no_change" | "negative";
  outcome_summary: string;
};

export type DashboardPriority = {
  rank: number;
  title: string;
  reason: string;
  expected_impact: string;
};

export type DashboardStrategicDiagnosis = {
  business_understanding: {
    business_model: string;
    revenue_engine: string;
    primary_customer: string;
    current_goal: string;
    owner_involvement: string;
    current_context: string;
  };
  diagnosis: {
    summary: string;
    affected_area:
      | "demand"
      | "conversion"
      | "retention"
      | "revenue"
      | "cashflow"
      | "margin"
      | "capacity"
      | "operations"
      | "positioning"
      | "execution"
      | "owner_dependency"
      | "unknown";
    why_it_matters: string;
  };
  bottleneck: {
    area: string;
    description: string;
    affected_metric: string;
  };
  evidence: Array<{
    fact: string;
    source_field: string;
    interpretation: string;
  }>;
  confidence: "low" | "medium" | "high";
  unknowns: string[];
  alternative_hypothesis: {
    hypothesis: string;
    what_would_confirm_it: string;
  } | null;
  critical_decision: {
    question: string;
    recommended_direction: string;
    rationale: string;
    expected_outcome: string;
    target_metric: string;
  };
};
