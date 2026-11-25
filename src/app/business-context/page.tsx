import Link from "next/link";
import { redirect } from "next/navigation";

import { saveBusinessResource } from "@/actions/business-memory";
import { resourceLabels, type Availability } from "@/lib/business-memory";
import { loadBusinessMemory } from "@/lib/strategic-context-server";
import { createClient } from "@/lib/supabase/server";

const labels: Record<Availability, string> = {
  unknown: "Por confirmar",
  available: "Disponible",
  unavailable: "No disponible",
};

export default async function BusinessContextPage({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims?.sub) redirect("/login");

  const { data: business, error } = await supabase.from("businesses").select("id,name")
    .eq("owner_id", auth.claims.sub).maybeSingle();
  if (error) throw error;
  if (!business) redirect("/onboarding/business");
  const memory = await loadBusinessMemory(supabase, business.id);
  const { status } = await searchParams;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
      <Link href="/dashboard" className="command-link">Volver al centro de dirección</Link>
      <header>
        <p className="command-kicker text-slate-600">{business.name}</p>
        <h1 className="text-2xl font-semibold text-[var(--executive-blue)]">Canales y recursos disponibles</h1>
        <p className="mt-1 text-sm text-slate-700">¿Qué canales o personas tienes disponibles para ejecutar esta semana?</p>
      </header>
      {status === "saved" && <p role="status" className="success-box">Disponibilidad guardada.</p>}
      {(status === "error" || status === "invalid") && <p role="alert" className="alert-box">Revisa la disponibilidad y vuelve a guardar.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(resourceLabels).map(([key, label]) => {
          const entry = memory.find((item) => item.memory_key === key);
          return (
            <form key={key} action={saveBusinessResource} className="command-card flex flex-col gap-2 p-4">
              <input type="hidden" name="resource" value={key} />
              <label className="text-sm font-semibold text-[var(--executive-blue)]" htmlFor={key}>{label}</label>
              <select id={key} name="availability" className="form-field" defaultValue={entry?.content.availability ?? "unknown"}>
                {Object.entries(labels).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
              </select>
              <label htmlFor={key + "-detail"} className="text-xs text-slate-700">Detalle opcional</label>
              <input id={key + "-detail"} name="detail" maxLength={400} className="form-field" defaultValue={entry?.content.detail ?? ""} />
              <button type="submit" className="secondary-button mt-1 min-h-11 w-fit text-sm">Guardar disponibilidad</button>
            </form>
          );
        })}
      </div>
      {memory.some((item) => item.category === "learning") && (
        <section className="command-card space-y-2 p-4" aria-labelledby="memory-learning-title">
          <h2 id="memory-learning-title" className="font-semibold text-[var(--executive-blue)]">Aprendizajes de semanas anteriores</h2>
          <ul className="space-y-2 text-sm">
            {memory.filter((item) => item.category === "learning").slice(0, 4).map((item) => (
              <li key={item.id}><strong>{item.content.label}.</strong>{" "}{item.content.detail}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

