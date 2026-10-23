import assert from "node:assert/strict";
import test from "node:test";

import {
  BusinessOnboardingSchema,
  DiagnosticOnboardingSchema,
} from "../src/lib/onboarding-validation";

const validDiagnostic = {
  business_stage: "operating",
  team_size: "2",
  owner_hours_per_week: "5",
  main_challenge: "Las ventas son irregulares.",
  primary_goal: "Conseguir más clientes recurrentes.",
  customers_description: "Comercios locales que necesitan reparaciones.",
  sales_process: "Llegan por referidos y escriben por WhatsApp.",
  owner_responsibilities: "Vendo, coordino el equipo y reviso las finanzas.",
  monthly_revenue: "1200",
  currency_code: "USD",
};

test("exige el contexto esencial de la empresa", () => {
  assert.equal(
    BusinessOnboardingSchema.safeParse({
      name: "Taller Norte",
      description: "Reparaciones para comercios locales.",
      revenue_model: "Cobro por cada reparación realizada.",
    }).success,
    true,
  );
});

test("acepta facturación aproximada con moneda y rechaza campos ausentes", () => {
  assert.equal(DiagnosticOnboardingSchema.safeParse(validDiagnostic).success, true);
  assert.equal(
    DiagnosticOnboardingSchema.safeParse({
      ...validDiagnostic,
      monthly_revenue: "",
    }).success,
    false,
  );
  assert.equal(
    DiagnosticOnboardingSchema.safeParse({
      ...validDiagnostic,
      currency_code: "",
    }).success,
    false,
  );
});