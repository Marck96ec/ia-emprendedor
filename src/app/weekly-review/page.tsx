import { redirect } from "next/navigation";

import { ConversationalWeeklyReview } from "@/components/conversational-weekly-review";
import { StrategicDiagnosisSchema } from "@/lib/ai/ceo-agent";
import { buildWeeklyReviewContext } from "@/lib/weekly-review-context";
import { createClient } from "@/lib/supabase/server";
import { parseWeeklyReviewDraft } from "@/lib/weekly-review-types";
import { DecisionHypothesisSchema } from "@/lib/decision-learning";

type WeeklyReviewPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function WeeklyReviewPage({
  searchParams,
}: WeeklyReviewPageProps) {
  const { error: pageError } = await searchParams;
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", userId)
    .maybeSingle();

  if (businessError) {
    console.error("WEEKLY_REVIEW_PAGE_BUSINESS_ERROR", businessError);
    throw new Error("No pudimos cargar el negocio");
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  const { data: ceoPlan, error: planError } = await supabase
    .from("ceo_plans")
    .select("id, week_number, status, strategic_diagnosis, decision_hypothesis")
    .eq("business_id", business.id)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planError) {
    console.error("WEEKLY_REVIEW_PAGE_PLAN_ERROR", planError);
    throw new Error("No pudimos cargar el plan semanal");
  }

  if (!ceoPlan || ceoPlan.status !== "ready") {
    redirect("/dashboard");
  }

  const strategicDiagnosis = StrategicDiagnosisSchema.safeParse(ceoPlan.strategic_diagnosis);
  const decisionHypothesis = DecisionHypothesisSchema.safeParse(ceoPlan.decision_hypothesis);

  if (!strategicDiagnosis.success || !decisionHypothesis.success) {
    redirect("/dashboard?error=" + encodeURIComponent("Este plan no tiene una hipótesis estratégica revisable."));
  }

  const { data: existingReview, error: reviewError } = await supabase
    .from("weekly_reviews")
    .select("id")
    .eq("ceo_plan_id", ceoPlan.id)
    .maybeSingle();

  if (reviewError) {
    console.error("WEEKLY_REVIEW_PAGE_LOOKUP_ERROR", reviewError);
    throw new Error("No pudimos cargar la revisión semanal");
  }

  if (existingReview) {
    redirect("/dashboard");
  }

  const { data: actions, error: actionsError } = await supabase
    .from("weekly_actions")
    .select("status, completion_data")
    .eq("ceo_plan_id", ceoPlan.id);

  if (actionsError) {
    console.error("WEEKLY_REVIEW_PAGE_ACTIONS_ERROR", actionsError);
    throw new Error("No pudimos cargar las acciones");
  }

  const totalActions = actions?.length ?? 0;
  const completedActions =
    actions?.filter((action) => action.status === "completed").length ?? 0;
  const recordedResults =
    actions?.filter((action) => action.status === "completed" && action.completion_data !== null).length ?? 0;

  if (totalActions === 0) {
    redirect("/dashboard");
  }

  const { data: draft, error: draftError } = await supabase
    .from("weekly_review_drafts")
    .select("answers")
    .eq("ceo_plan_id", ceoPlan.id)
    .maybeSingle();

  if (draftError) {
    console.error("WEEKLY_REVIEW_PAGE_DRAFT_ERROR", draftError);
    throw new Error("No pudimos cargar el borrador de la revisión");
  }

  const { data: evidence, error: evidenceError } = await supabase
    .from("business_evidence")
    .select("evidence_type")
    .eq("business_id", business.id)
    .order("observed_at", { ascending: false })
    .limit(100);

  if (evidenceError) {
    console.error("WEEKLY_REVIEW_PAGE_EVIDENCE_ERROR", evidenceError);
    throw new Error("No pudimos cargar la evidencia de tu negocio");
  }

  const reviewContext = buildWeeklyReviewContext({
    businessName: business.name,
    weekNumber: ceoPlan.week_number,
    completedActions,
    totalActions,
    recordedResults,
    evidence: evidence ?? [],
  });

  return (
    <>
      {pageError && (
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <div className="alert-box" role="alert">{pageError}</div>
        </div>
      )}
      <ConversationalWeeklyReview
        businessName={business.name}
        weekNumber={ceoPlan.week_number}
        decisionQuestion={strategicDiagnosis.data.critical_decision.question}
        hypothesis={decisionHypothesis.data.statement}
        introMessage={reviewContext.introMessage}
        evidenceMessage={reviewContext.evidenceMessage}
        metricMessage={reviewContext.metricMessage}
        initialDraft={parseWeeklyReviewDraft(draft?.answers)}
      />
    </>
  );
}
