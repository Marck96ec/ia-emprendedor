import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("dashboard orders decision, next action, time, progress, evidence, then focus before the board", () => {
  const page = source("src/app/dashboard/page.tsx");
  const order = [
    "<DecisionHero",
    "<NextActionCard",
    "<TimeAllocationCard",
    "<WeeklyProgress",
    "<ExternalEvidenceSection",
    "<ExecutiveSummary",
    "<WeeklyActionBoard",
  ].map((marker) => page.indexOf(marker));

  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("hero shows the decision question, direction and a decision CTA", () => {
  const hero = source("src/components/decision-hero.tsx");

  assert.match(hero, /Tu decisión esta semana/);
  assert.match(hero, /decision\.question/);
  assert.match(hero, /decision\.recommended_direction/);
  assert.match(hero, /Entender la decisión/);
});

test("next action card exposes the first pending action with a start CTA", () => {
  const card = source("src/components/next-action-card.tsx");

  assert.match(card, /Qué hacer ahora/);
  assert.match(card, /Tiempo estimado/);
  assert.match(card, /Empezar esta acción/);
});

test("evidence is collapsed by default and surfaces counter evidence", () => {
  const section = source("src/components/external-evidence-section.tsx");

  assert.match(section, /<details/);
  assert.doesNotMatch(section, /<details[^>]*\sopen/);
  assert.match(section, /¿Encontramos evidencia en contra\?/);
  assert.match(section, /No encontramos evidencia suficientemente comparable/);
  assert.match(section, /counter_evidence/);
});

test("action board keeps its title, marks the recommended action and avoids tiny truncation", () => {
  const board = source("src/components/weekly-action-board.tsx");
  const card = source("src/components/action-card.tsx");

  assert.match(board, /Ejecuta tu próxima acción/);
  assert.doesNotMatch(board, /Elige tu próxima decisión/);
  assert.match(card, /Recomendada ahora/);
  assert.match(card, /line-clamp-3/);
  assert.doesNotMatch(card, /line-clamp-2/);
});

test("priorities are collapsed and the dialog uses non-technical language", () => {
  const dialog = source("src/components/executive-context-dialog.tsx");

  assert.match(dialog, /<details/);
  assert.doesNotMatch(dialog, /<details[^>]*\sopen/);
  for (const label of [
    "Principal restricción",
    "Nivel de certeza",
    "Lo que aún no sabemos",
    "Decisión de esta semana",
    "Métrica que observaremos",
  ]) {
    assert.ok(dialog.includes(label), label);
  }
  for (const jargon of ["Cuello de botella", "Confianza", "Decisión crítica"]) {
    assert.ok(!dialog.includes(jargon), jargon);
  }
});

test("header explains the product only during the first week", () => {
  const header = source("src/components/dashboard-header.tsx");

  assert.match(header, /weekNumber === 1/);
  assert.match(
    header,
    /CEO IA analiza tu negocio, identifica qué merece atención y te ayuda a decidir dónde invertir tu tiempo\./,
  );
});
