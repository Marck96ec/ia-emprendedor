import Link from "next/link";
import { redirect } from "next/navigation";

import {
  approveActionResult,
  workOnActionWithAI,
} from "@/actions/action-ai";
import { ActionWorkspaceSubmit } from "@/components/action-workspace-submit";
import { ValuePropositionSchema } from "@/lib/ai/value-proposition-agent";
import { loadBusinessKnowledge } from "@/lib/business-knowledge";
import { createClient } from "@/lib/supabase/server";

type ActionPageProps = {
  params: Promise<{ actionId: string }>;
  searchParams: Promise<{ error?: string }>;
};

function ResultSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-200 pb-5 last:border-0 last:pb-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-2 text-lg leading-8 text-slate-900">{children}</div>
    </div>
  );
}

export default async function ActionWorkspacePage({
  params,
  searchParams,
}: ActionPageProps) {
  const [{ actionId }, { error: pageError }] = await Promise.all([
    params,
    searchParams,
  ]);
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const { data: action, error: actionError } = await supabase
    .from("weekly_actions")
    .select("id, ceo_plan_id, day, action, objective, success_metric, status, execution_mode, action_type")
    .eq("id", actionId)
    .maybeSingle();

  if (actionError || !action) {
    redirect("/dashboard");
  }

  const { data: plan } = await supabase
    .from("ceo_plans")
    .select("id, business_id, status, executive_summary, diagnosis, priorities")
    .eq("id", action.ceo_plan_id)
    .maybeSingle();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_id, name, business_type, description")
    .eq("id", plan?.business_id ?? "")
    .maybeSingle();

  if (!plan || !business || business.owner_id !== claimsData.claims.sub) {
    redirect("/dashboard");
  }

  if (action.execution_mode !== "ai_assisted" || action.action_type !== "value_proposition") {
    redirect("/dashboard");
  }

  const [resultResponse, reviewResponse] = await Promise.all([
    supabase
      .from("action_results")
      .select("id, status, draft_content, approved_content, revision")
      .eq("weekly_action_id", action.id)
      .maybeSingle(),
    supabase
      .from("weekly_reviews")
      .select("id")
      .eq("ceo_plan_id", plan.id)
      .maybeSingle(),
  ]);

  if (resultResponse.error || reviewResponse.error) {
    redirect("/dashboard");
  }

  const result = resultResponse.data;
  const review = reviewResponse.data;
  const businessKnowledge = await loadBusinessKnowledge(business.id);

  const isClosed = Boolean(review);
  const content = result
    ? ValuePropositionSchema.safeParse(
        result.status === "approved"
          ? result.approved_content
          : result.draft_content,
      )
    : null;
  const canWork = !isClosed && plan.status === "ready" && action.status === "pending" && result?.status !== "approved";

  return (
    <main className="ambient-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="link-button text-sm">Volver al dashboard</Link>

        <header className="mt-8 border-b border-slate-200 pb-7">
          <p className="badge-chip">Trabajar con IA · Día {action.day}</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{action.action}</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">{action.objective}</p>
          <p className="mt-3 text-sm text-slate-500">Cómo saber si funcionó: {action.success_metric}</p>
        </header>

        {pageError && <div className="alert-box mt-6" role="alert">{pageError}</div>}

        {isClosed && <div className="soft-status mt-6">Esta semana está cerrada. Este resultado es solo de lectura.</div>}
        {result?.status === "approved" && <div className="success-box mt-6">Resultado aprobado</div>}

        {!content?.success && !result && canWork && (
          <section className="surface-card mt-6 rounded-[2rem] p-6 sm:p-8">
            {businessKnowledge.valueProposition && (
              <p className="soft-status mb-5">
                Ya tenemos una propuesta de valor aprobada de tu negocio. La usaremos como punto de partida.
              </p>
            )}
            <h2 className="text-2xl font-semibold text-slate-950">Tu propuesta</h2>
            <p className="mt-3 max-w-2xl text-slate-600">Basándome en lo que ya conozco de tu negocio, prepararé una propuesta concreta para esta acción.</p>
            <form action={workOnActionWithAI} className="mt-6">
              <input type="hidden" name="action_id" value={action.id} />
              <ActionWorkspaceSubmit label="Crear propuesta con IA" pendingLabel="Preparando propuesta..." />
            </form>
          </section>
        )}

        {content?.success && (
          <>
            <section className="surface-card mt-6 rounded-[2rem] p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="badge-chip">{result?.status === "approved" ? "Entregable final" : `Borrador · Revisión ${result?.revision}`}</p>
                  <h2 className="mt-4 text-2xl font-semibold text-slate-950">Tu propuesta</h2>
                </div>
              </div>
              <div className="mt-7 space-y-6">
                <ResultSection label="Propuesta de valor">{content.data.value_proposition}</ResultSection>
                <ResultSection label="Cliente objetivo">{content.data.target_customer}</ResultSection>
                <ResultSection label="Problema que resuelve">{content.data.problem_solved}</ResultSection>
                <ResultSection label="Diferenciador">{content.data.differentiator}</ResultSection>
                <ResultSection label="3 beneficios">
                  <ul className="list-disc space-y-2 pl-5">
                    {content.data.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
                  </ul>
                </ResultSection>
              </div>
            </section>

            <section className="mt-6 rounded-[2rem] bg-slate-900 p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Por qué te propongo esto</p>
              <p className="mt-3 leading-7 text-slate-200">{content.data.rationale}</p>
            </section>

            {canWork && result && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <form action={workOnActionWithAI} className="surface-card rounded-[2rem] p-6">
                  <input type="hidden" name="action_id" value={action.id} />
                  <label htmlFor="feedback" className="field-label">¿Qué te gustaría ajustar?</label>
                  <textarea id="feedback" name="feedback" maxLength={500} rows={3} className="form-field resize-y" placeholder="Hazla más directa, enfócala en un tipo de cliente..." />
                  <div className="mt-4"><ActionWorkspaceSubmit label="Mejorar propuesta" pendingLabel="Refinando..." secondary /></div>
                </form>
                <form action={approveActionResult} className="lg:pb-6">
                  <input type="hidden" name="action_result_id" value={result.id} />
                  <ActionWorkspaceSubmit label="Aprobar resultado" pendingLabel="Aprobando..." />
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}