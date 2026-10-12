import type { ActionExecutionMode, ActionType } from "@/lib/weekly-action-types";

export type DashboardActionResult = {
  id: string;
  status: "draft" | "approved";
};

export type DashboardAction = {
  id: string;
  day: number;
  action: string;
  objective: string;
  success_metric: string;
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
