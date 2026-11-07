import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const reviewAction = source("src/actions/weekly-review.ts");
const reviewComponent = source("src/components/conversational-weekly-review.tsx");
const generationStatus = source("src/components/plan-generating-status.tsx");
const dashboard = source("src/app/dashboard/page.tsx");
const ceoPlansMigration = source(
  "supabase/migrations/20260826035144_add_weekly_cycles_and_reviews.sql",
);

test("the review save is idempotent and reports success for an existing review", () => {
  assert.match(reviewAction, /export type WeeklyReviewSaveResult/);
  assert.match(reviewAction, /alreadySaved\?: boolean/);
  assert.match(
    reviewAction,
    /if \(existingReview\) \{[\s\S]*?return \{[\s\S]*?success: true,[\s\S]*?alreadySaved: true/,
  );
  assert.match(
    reviewAction,
    /if \(error\.code === "23505"\) \{[\s\S]*?return \{[\s\S]*?success: true,[\s\S]*?alreadySaved: true/,
  );
});

test("the client saves before it starts generation and does not use a form redirect", () => {
  const saveIndex = reviewComponent.indexOf(
    "createWeeklyReview(new FormData(event.currentTarget))",
  );
  const generationIndex = reviewComponent.indexOf("await startPreparation()");

  assert.ok(saveIndex >= 0);
  assert.ok(generationIndex > saveIndex);
  assert.doesNotMatch(reviewComponent, /<form action=\{createWeeklyReview\}/);
  assert.match(reviewComponent, /Confirmar y preparar mi siguiente semana/);
  assert.match(
    reviewComponent,
    /Guardaremos lo que aprendiste y utilizaremos esos resultados para preparar tu próximo plan\./,
  );
});

test("generation failures keep the saved review recoverable", () => {
  assert.match(
    reviewComponent,
    /Tus aprendizajes se guardaron, pero no pudimos iniciar la preparación/,
  );
  assert.match(reviewComponent, /Reintentar preparación/);
  assert.match(dashboard, /Reintentar preparación/);
});

test("generation feedback is indeterminate and refreshes persisted server state", () => {
  assert.doesNotMatch(generationStatus, /25%|50%|75%|90%/);
  assert.doesNotMatch(generationStatus, /progressMessages|Entendiendo tu contexto/);
  assert.match(generationStatus, /router\.refresh\(\)/);
  assert.match(generationStatus, /window\.clearInterval\(interval\)/);
  assert.match(generationStatus, /15 \* 60 \* 1000/);
  assert.match(generationStatus, /generateCEOPlanAction/);
  assert.match(generationStatus, /aria-busy="true"/);
  assert.match(generationStatus, /motion-reduce:animate-none/);
});

test("the database constraints prevent duplicate reviews and next-week plans", () => {
  assert.match(ceoPlansMigration, /unique \(business_id, week_number\)/);
  assert.match(ceoPlansMigration, /ceo_plan_id uuid not null unique/);
});

test("the dashboard uses the persisted week while displaying preparation", () => {
  assert.match(dashboard, /<PlanGeneratingStatus/);
  assert.match(dashboard, /businessName=\{business\.name\}/);
  assert.match(dashboard, /weekNumber=\{ceoPlan\.week_number\}/);
  assert.match(dashboard, /updatedAt=\{ceoPlan\.updated_at\}/);
});
