export type JourneyPlan = {
  id: string;
  week_number: number;
};

export type JourneyReview = {
  ceo_plan_id: string;
  decision_learning: { hypothesis_status?: string } | null;
};

export type DashboardJourney = {
  executedActions: number;
  evaluatedDecisions: number;
  validatedHypotheses: number;
  reviewStreak: number;
  hasPriorLearning: boolean;
};

export type DecisionLoopStage = "execute" | "learn" | "improve";

// Preparado para una futura vista de madurez; no se calcula ni se persiste todavía.
export const BUSINESS_MATURITY_STAGES = [
  "Explorando",
  "Midiendo",
  "Decidiendo",
  "Delegando",
  "Escalando",
] as const;

export function getDecisionLoopStage(input: {
  reviewed: boolean;
  allCompleted: boolean;
}): DecisionLoopStage {
  if (input.reviewed) return "improve";
  return input.allCompleted ? "learn" : "execute";
}

export function buildDashboardJourney(input: {
  plans: JourneyPlan[];
  reviews: JourneyReview[];
  executedActions: number;
  currentPlanId: string;
}): DashboardJourney {
  const reviewedPlanIds = new Set(input.reviews.map((review) => review.ceo_plan_id));
  const plansNewestFirst = [...input.plans].sort(
    (first, second) => second.week_number - first.week_number,
  );

  // La semana en curso sin revisar todavía no interrumpe la constancia.
  let reviewStreak = 0;
  for (const plan of plansNewestFirst) {
    if (reviewedPlanIds.has(plan.id)) {
      reviewStreak += 1;
    } else if (plan.id !== input.currentPlanId) {
      break;
    }
  }

  const currentIndex = plansNewestFirst.findIndex(
    (plan) => plan.id === input.currentPlanId,
  );
  const previousPlan = currentIndex >= 0 ? plansNewestFirst[currentIndex + 1] : undefined;
  const hasPriorLearning = Boolean(
    previousPlan &&
      input.reviews.some(
        (review) =>
          review.ceo_plan_id === previousPlan.id && review.decision_learning !== null,
      ),
  );

  return {
    executedActions: input.executedActions,
    evaluatedDecisions: input.reviews.length,
    validatedHypotheses: input.reviews.filter(
      (review) => review.decision_learning?.hypothesis_status === "validated",
    ).length,
    reviewStreak,
    hasPriorLearning,
  };
}
