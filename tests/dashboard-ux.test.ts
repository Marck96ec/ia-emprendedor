import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  BUSINESS_MATURITY_STAGES,
  buildDashboardJourney,
  getDecisionLoopStage,
} from "../src/lib/dashboard-progress";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("review streak counts consecutive reviewed weeks and ignores the unreviewed current week", () => {
  const plans = [1, 2, 3, 4].map((week) => ({ id: `p${week}`, week_number: week }));
  const reviews = ["p1", "p2", "p3"].map((id) => ({
    ceo_plan_id: id,
    decision_learning: { hypothesis_status: id === "p1" ? "validated" : "inconclusive" },
  }));

  const journey = buildDashboardJourney({ plans, reviews, executedActions: 12, currentPlanId: "p4" });

  assert.equal(journey.reviewStreak, 3);
  assert.equal(journey.evaluatedDecisions, 3);
  assert.equal(journey.validatedHypotheses, 1);
  assert.equal(journey.executedActions, 12);
  assert.equal(journey.hasPriorLearning, true);
});

test("review streak stops at the first skipped review and never goes negative", () => {
  const plans = [1, 2, 3].map((week) => ({ id: `p${week}`, week_number: week }));
  const reviews = [{ ceo_plan_id: "p1", decision_learning: null }];

  const journey = buildDashboardJourney({ plans, reviews, executedActions: 0, currentPlanId: "p3" });

  assert.equal(journey.reviewStreak, 0);
  assert.equal(journey.hasPriorLearning, false);
});

test("first week has no streak and no prior learning", () => {
  const journey = buildDashboardJourney({
    plans: [{ id: "p1", week_number: 1 }],
    reviews: [],
    executedActions: 2,
    currentPlanId: "p1",
  });

  assert.deepEqual(journey, {
    executedActions: 2,
    evaluatedDecisions: 0,
    validatedHypotheses: 0,
    reviewStreak: 0,
    hasPriorLearning: false,
  });
});

test("decision loop stage follows execution and review state", () => {
  assert.equal(getDecisionLoopStage({ reviewed: false, allCompleted: false }), "execute");
  assert.equal(getDecisionLoopStage({ reviewed: false, allCompleted: true }), "learn");
  assert.equal(getDecisionLoopStage({ reviewed: true, allCompleted: true }), "improve");
});

test("maturity stages are prepared but not persisted", () => {
  assert.deepEqual([...BUSINESS_MATURITY_STAGES], [
    "Explorando",
    "Midiendo",
    "Decidiendo",
    "Delegando",
    "Escalando",
  ]);
});

test("dashboard orders welcome, decision, next action, progress/time strip, then the workspace", () => {
  const page = source("src/app/dashboard/page.tsx");
  const order = [
    "<WelcomeBanner",
    "<DecisionHero",
    "<NextActionCard",
    "<WeeklyProgress",
    "<TimeAllocationCard",
    "<WeeklyActionBoard",
  ].map((marker) => page.indexOf(marker));

  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("desktop dashboard is a single viewport with internal scrolling areas", () => {
  const page = source("src/app/dashboard/page.tsx");
  const board = source("src/components/weekly-action-board.tsx");
  const panel = source("src/components/action-detail-panel.tsx");

  assert.match(page, /lg:h-dvh lg:overflow-hidden/);
  assert.match(board, /lg:overflow-y-auto/);
  assert.match(board, /lg:min-h-0/);
  assert.match(panel, /lg:overflow-y-auto/);
});

test("focus, hypothesis and evidence live in the drawer instead of reserving page space", () => {
  const page = source("src/app/dashboard/page.tsx");
  const hero = source("src/components/decision-hero.tsx");
  const drawer = source("src/components/executive-context-drawer.tsx");

  assert.match(page, /focusPanel=\{/);
  assert.match(page, /evidencePanel=\{/);
  assert.ok(page.indexOf("evidencePanel={") < page.indexOf("<NextActionCard"));
  for (const label of ["Entender decisión", "Ver evidencia", "Ver prioridades"]) {
    assert.ok(hero.includes(label), label);
  }
  for (const tab of ["Decisión", "Foco e hipótesis", "Prioridades", "Evidencia"]) {
    assert.ok(drawer.includes(`"${tab}"`), tab);
  }
  assert.match(drawer, /showModal\(\)/);
});

test("primary action CTA stays pinned in the detail panel", () => {
  const panel = source("src/components/action-detail-panel.tsx");

  assert.match(panel, /sticky bottom-0/);
  assert.match(panel, /Confirmar acción realizada/);
  assert.match(panel, /Crear con ayuda de IA/);
});

test("hero shows the decision, recommendation, human certainty and decision links", () => {
  const hero = source("src/components/decision-hero.tsx");

  assert.match(hero, /Decisión de esta semana/);
  assert.match(hero, /decision\.question/);
  assert.match(hero, /CEO IA recomienda:/);
  assert.match(hero, /decision\.recommended_direction/);
  assert.match(hero, /Nivel de certeza:/);
  assert.match(hero, /low: "Exploratoria"/);
  assert.match(hero, /Entender decisión/);
});

test("next action card is the protagonist and handles last action and weekly celebration", () => {
  const card = source("src/components/next-action-card.tsx");

  assert.match(card, /Siguiente paso/);
  assert.match(card, /Última acción de la semana/);
  assert.match(card, /Tiempo estimado/);
  assert.match(card, /Empezar esta acción/);
  assert.match(card, /Plan ejecutado\./);
  assert.match(card, /Revisar mi semana/);
});

test("evidence renders only inside the drawer and keeps its compact summary and counter evidence", () => {
  const section = source("src/components/external-evidence-section.tsx");
  const page = source("src/app/dashboard/page.tsx");

  assert.doesNotMatch(section, /<details[^>]*\sopen/);
  assert.match(section, /summarizeEvidence/);
  assert.match(section, /fuentes/);
  assert.match(section, /Favorable pero no concluyente/);
  assert.match(section, /Buscamos también evidencia en contra\./);
  assert.match(section, /No encontramos un caso suficientemente comparable/);
  assert.match(section, /counter_evidence/);
  for (const label of ["Apoya", "Mixta", "Cuestiona"]) {
    assert.ok(section.includes(label), label);
  }
  assert.equal(page.match(/<ExternalEvidenceSection/g)?.length, 1);
  assert.doesNotMatch(section, /rounded-2xl border/);
});

test("action board keeps its title and separates now, later and completed actions", () => {
  const board = source("src/components/weekly-action-board.tsx");
  const card = source("src/components/action-card.tsx");

  assert.match(board, /Ejecuta tu próxima acción/);
  assert.doesNotMatch(board, /Elige tu próxima decisión/);
  for (const heading of ["Ahora", "Después", "Completadas"]) {
    assert.ok(board.includes(`>${heading}<`), heading);
  }
  assert.match(card, /Recomendada ahora/);
  assert.match(card, /Por hacer/);
  assert.doesNotMatch(card, /Pendiente/);
  assert.match(card, /line-clamp-3/);
});

test("board selection follows the recommended action after completing one", () => {
  const board = source("src/components/weekly-action-board.tsx");

  assert.match(board, /setSelectedActionId\(null\)/);
  assert.match(board, /firstPendingAction \?\?/);
});

test("drawer organizes priorities and uses non-technical language", () => {
  const dialog = source("src/components/executive-context-drawer.tsx");

  assert.match(dialog, /role="tablist"/);
  assert.match(dialog, /Prioridades de la semana/);
  for (const label of [
    "Principal restricción",
    "Nivel de certeza",
    "Lo que todavía necesitamos aprender",
    "Decisión de esta semana",
    "Métrica que observaremos",
    "Exploratoria",
  ]) {
    assert.ok(dialog.includes(label), label);
  }
  for (const jargon of ["Cuello de botella", "Confianza", "Decisión crítica", "Lo que aún no sabemos"]) {
    assert.ok(!dialog.includes(jargon), jargon);
  }
});

test("header keeps the compact product explanation for small screens and links to evolution", () => {
  const header = source("src/components/dashboard-header.tsx");

  assert.match(header, /weekNumber === 1/);
  assert.match(header, /lg:hidden/);
  assert.match(
    header,
    /CEO IA analiza tu negocio, identifica qué merece atención y te ayuda a decidir dónde invertir tu tiempo\./,
  );
  assert.match(header, /Mi evolución/);
});

test("welcome banner covers first visit, return, completion and learning copy", () => {
  const banner = source("src/components/welcome-banner.tsx");

  for (const copy of [
    "Bienvenido de vuelta.",
    "Retomemos donde quedaste.",
    "Continuar con mi próxima acción",
    "Esta semana CEO IA está aprendiendo cómo funciona tu negocio.",
    "CEO IA está usando lo aprendido la semana pasada para ajustar tu siguiente decisión.",
    "Plan ejecutado.",
    "Ahora revisemos qué cambió realmente.",
  ]) {
    assert.ok(banner.includes(copy), copy);
  }
  for (const step of ["Decidir", "Ejecutar", "Aprender", "Mejorar"]) {
    assert.ok(banner.includes(step), step);
  }
});

test("progress uses real data only and avoids punitive or gamified-currency copy", () => {
  const progress = source("src/components/weekly-progress.tsx");
  const page = source("src/app/dashboard/page.tsx");

  assert.match(progress, /Semana en progreso/);
  assert.match(progress, /semanas consecutivas revisando decisiones/);
  assert.match(progress, /Una decisión menos basada en intuición\./);
  assert.doesNotMatch(progress, /Perdiste|racha perdida|monedas|\bXP\b/i);
  assert.match(page, /buildDashboardJourney/);
  assert.doesNotMatch(page, /\.insert\(|\.upsert\(/);
});

test("animations respect reduced motion and no animation dependency was added", () => {
  const css = source("src/app/globals.css");
  const manifest = source("package.json");

  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.anim-pop/);
  assert.match(css, /\.anim-rise/);
  assert.doesNotMatch(manifest, /framer-motion|motion"|gsap|lottie|confetti/i);
});

test("dashboard components avoid text below 12px", () => {
  for (const file of [
    "decision-hero",
    "next-action-card",
    "welcome-banner",
    "weekly-progress",
    "time-allocation-card",
    "executive-summary",
    "executive-context-drawer",
    "external-evidence-section",
    "action-card",
    "weekly-action-board",
    "action-detail-panel",
    "dashboard-header",
  ]) {
    assert.doesNotMatch(source(`src/components/${file}.tsx`), /text-\[0\.\d+rem\]|text-\[(?:9|10|11)px\]/, file);
  }
});

test("weekly review frames the review as learning", () => {
  const review = source("src/app/weekly-review/page.tsx");

  assert.match(review, /Descubramos qué funcionó/);
  assert.match(review, /Ahora conviértela en aprendizaje/);
  assert.match(review, /Decisión que probamos/);
});
