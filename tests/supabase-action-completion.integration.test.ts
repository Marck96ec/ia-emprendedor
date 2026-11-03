import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";

import { GENERIC_ACTION_CAPTURE_SCHEMA } from "../src/lib/action-capture";
import {
  assertLocalSupabaseUrl,
  createBusiness,
  createDiagnostic,
  createPlan,
  createTestUser,
  createV5PlanPayload,
  loadLocalSupabaseConfig,
  supabaseLocalTestsEnabled as enabled,
  validRoleActions,
  type V4Action,
} from "./support/supabase-local";

type CompletionFixtures = {
  schemas: Record<string, unknown>;
  schema_validity: Array<{ name: string; schema?: string; inline?: unknown; valid: boolean }>;
  completions: Array<{ name: string; schema: string; data: unknown; valid: boolean; issue_paths: string[] }>;
};

const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/action-completion-cases.json"), "utf8"),
) as CompletionFixtures;

function fixtureSchema(name: string): unknown {
  return name === "generic" ? GENERIC_ACTION_CAPTURE_SCHEMA : fixtures.schemas[name];
}

function assertRpcError(
  error: PostgrestError | null,
  expected: { code: string; hint?: string },
  label: string,
) {
  assert.ok(error, `${label}: se esperaba un error`);
  assert.equal(error.code, expected.code, `${label}: código inesperado (${error.message})`);
  if (expected.hint) {
    assert.equal(error.hint, expected.hint, `${label}: hint inesperado (${error.message})`);
  }
}

function issuePathsFromDetails(error: PostgrestError | null): string[] {
  assert.ok(error?.details, "El error de validación debe incluir el detalle de los campos");
  return (JSON.parse(error.details) as Array<{ path: string }>).map((issue) => issue.path).sort();
}

async function getAction(admin: SupabaseClient, actionId: string) {
  const { data, error } = await admin
    .from("weekly_actions")
    .select("id, status, completion_data, completed_at")
    .eq("id", actionId)
    .single();

  assert.ifError(error);
  return data;
}

function evidenceActions(): V4Action[] {
  const [first, second, third] = validRoleActions();
  return [
    first,
    second,
    { ...third, execution_mode: "ai_assisted", action_type: "value_proposition" },
    {
      ...third,
      sequence: 4,
      action: "Registrar una observación adicional",
      objective: "Conservar una señal para la revisión.",
    },
  ];
}

test(
  "La evidencia de acciones se valida en Supabase y la tabla no admite escrituras directas",
  { skip: !enabled },
  async () => {
    const config = loadLocalSupabaseConfig();
    assertLocalSupabaseUrl(config.url);
    assert.ok(config.anonKey, "Falta la clave anon/publishable de Supabase local.");
    assert.ok(config.serviceRoleKey, "Falta la clave service role de Supabase local.");

    const admin = createClient(config.url, config.serviceRoleKey);
    const anon = createClient(config.url, config.anonKey);
    const owner = await createTestUser(admin, config, "evidence-owner");
    const otherUser = await createTestUser(admin, config, "evidence-other");
    const businessId = await createBusiness(admin, owner.id);

    try {
      await createDiagnostic(admin, businessId);
      const planId = await createPlan(admin, businessId, 1);
      const actions = evidenceActions();
      const captureSchemas = [fixtures.schemas.pricing, fixtures.schemas.contacts, null, null];
      const payload = createV5PlanPayload(actions);
      const actionsWithCapture = actions.map((action, index) => ({
        ...action,
        capture_schema: captureSchemas[index],
      }));

      const { error: planError } = await owner.client.rpc("complete_ceo_plan", {
        p_plan_id: planId,
        ...payload,
        p_weekly_plan: actionsWithCapture,
        p_actions: actionsWithCapture,
      });
      assert.ifError(planError);

      const { data: rows, error: rowsError } = await admin
        .from("weekly_actions")
        .select("id, sequence, status")
        .eq("ceo_plan_id", planId)
        .order("sequence");
      assert.ifError(rowsError);
      assert.equal(rows?.length, 4);
      const [pricingAction, contactsAction, aiAction, genericAction] = rows!;

      // D2: PostgREST no debe permitir escrituras directas, tampoco por privilegios heredados.
      const directUpdate = await owner.client
        .from("weekly_actions")
        .update({ status: "completed", completed_at: new Date().toISOString(), completion_data: {} })
        .eq("id", pricingAction.id);
      assertRpcError(directUpdate.error, { code: "42501" }, "UPDATE directo de status");

      const schemaDowngrade = await owner.client
        .from("weekly_actions")
        .update({ capture_schema: null })
        .eq("id", pricingAction.id);
      assertRpcError(schemaDowngrade.error, { code: "42501" }, "UPDATE directo de capture_schema");

      const directInsert = await owner.client.from("weekly_actions").insert({
        ceo_plan_id: planId,
        sequence: 5,
        action: "Acción inyectada",
        objective: "Objetivo inyectado",
        reason: "Razón inyectada",
        success_metric: "Métrica inyectada",
        expected_result: "Resultado inyectado",
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      assertRpcError(directInsert.error, { code: "42501" }, "INSERT directo");

      const directDelete = await owner.client.from("weekly_actions").delete().eq("id", genericAction.id);
      assertRpcError(directDelete.error, { code: "42501" }, "DELETE directo");

      const anonUpdate = await anon.from("weekly_actions").update({ status: "completed" }).eq("id", pricingAction.id);
      assertRpcError(anonUpdate.error, { code: "42501" }, "UPDATE anónimo");

      const ownerSelect = await owner.client.from("weekly_actions").select("id").eq("ceo_plan_id", planId);
      assert.ifError(ownerSelect.error);
      assert.equal(ownerSelect.data?.length, 4, "El propietario conserva la lectura por RLS");

      const otherSelect = await otherUser.client.from("weekly_actions").select("id").eq("ceo_plan_id", planId);
      assert.ifError(otherSelect.error);
      assert.equal(otherSelect.data?.length, 0, "Otro usuario no ve acciones ajenas");

      // Los validadores internos no se exponen a roles de PostgREST.
      for (const fn of ["validate_action_completion_data", "is_valid_action_capture_schema"]) {
        const args = fn === "validate_action_completion_data"
          ? { p_schema: fixtures.schemas.pricing, p_data: {} }
          : { p_schema: fixtures.schemas.pricing };
        const authenticatedCall = await owner.client.rpc(fn, args);
        assertRpcError(authenticatedCall.error, { code: "42501" }, `${fn} como authenticated`);
        const anonCall = await anon.rpc(fn, args);
        assertRpcError(anonCall.error, { code: "42501" }, `${fn} como anon`);
      }

      // D1: un objeto vacío no completa una acción con campos obligatorios.
      const emptyEvidence = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: pricingAction.id,
        p_completion_data: {},
      });
      assertRpcError(emptyEvidence.error, { code: "22023", hint: "COMPLETION_DATA_INVALID" }, "evidencia vacía");
      assert.deepEqual(issuePathsFromDetails(emptyEvidence.error), ["price", "signals"]);
      assert.equal((await getAction(admin, pricingAction.id)).status, "pending");

      const tooLarge = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: genericAction.id,
        p_completion_data: { result: "x".repeat(300_000), learning: "Aprendizaje" },
      });
      assertRpcError(tooLarge.error, { code: "22023", hint: "COMPLETION_DATA_INVALID" }, "evidencia demasiado grande");

      const validPricing = { price: 20, signals: ["interest"] };
      const otherUserAttempt = await otherUser.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: pricingAction.id,
        p_completion_data: validPricing,
      });
      assertRpcError(otherUserAttempt.error, { code: "42501" }, "otro usuario");

      const anonAttempt = await anon.rpc("complete_weekly_action_with_evidence", {
        p_action_id: pricingAction.id,
        p_completion_data: validPricing,
      });
      assert.ok(anonAttempt.error, "anon no puede completar acciones");
      assert.equal((await getAction(admin, pricingAction.id)).status, "pending");

      const completed = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: pricingAction.id,
        p_completion_data: validPricing,
      });
      assert.ifError(completed.error);
      assert.equal(completed.data, pricingAction.id);
      const persisted = await getAction(admin, pricingAction.id);
      assert.equal(persisted.status, "completed");
      assert.deepEqual(persisted.completion_data, validPricing);

      // Idempotencia: el mismo envío no falla y no reescribe la evidencia.
      const identicalRetry = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: pricingAction.id,
        p_completion_data: { signals: ["interest"], price: 20 },
      });
      assert.ifError(identicalRetry.error);
      assert.equal(identicalRetry.data, pricingAction.id);
      assert.equal((await getAction(admin, pricingAction.id)).completed_at, persisted.completed_at);

      const differentRetry = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: pricingAction.id,
        p_completion_data: { price: 99, signals: ["purchase"] },
      });
      assertRpcError(differentRetry.error, { code: "P0001", hint: "ACTION_ALREADY_COMPLETED" }, "evidencia distinta");
      assert.deepEqual((await getAction(admin, pricingAction.id)).completion_data, validPricing);

      // Dos envíos concurrentes distintos: solo uno persiste y el otro no lo sobrescribe.
      const contactsA = { contacts: [1, 2, 3].map((n) => ({ name: `Cliente A${n}`, outcome: "interested" })) };
      const contactsB = { contacts: [1, 2, 3].map((n) => ({ name: `Cliente B${n}`, outcome: "not_interested" })) };
      const concurrent = await Promise.all([contactsA, contactsB].map((data) =>
        owner.client.rpc("complete_weekly_action_with_evidence", {
          p_action_id: contactsAction.id,
          p_completion_data: data,
        }),
      ));
      const winners = concurrent.filter((result) => !result.error);
      const losers = concurrent.filter((result) => result.error);
      assert.equal(winners.length, 1, "Exactamente un envío concurrente debe persistir");
      assert.equal(losers.length, 1);
      assertRpcError(losers[0].error, { code: "P0001", hint: "ACTION_ALREADY_COMPLETED" }, "envío concurrente");
      const storedContacts = (await getAction(admin, contactsAction.id)).completion_data;
      assert.deepEqual(storedContacts, concurrent[0].error ? contactsB : contactsA);

      // Acción con IA: exige un entregable aprobado antes de registrar evidencia.
      const genericEvidence = { result: "Dos clientes pidieron una demo", learning: "La propuesta interesa" };
      const unapproved = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: aiAction.id,
        p_completion_data: genericEvidence,
      });
      assertRpcError(unapproved.error, { code: "P0001", hint: "DELIVERABLE_NOT_APPROVED" }, "IA sin aprobar");

      const { data: draft, error: draftError } = await owner.client
        .from("action_results")
        .insert({ weekly_action_id: aiAction.id, status: "draft", draft_content: { value_proposition: "Borrador" } })
        .select("id")
        .single();
      assert.ifError(draftError);

      const draftOnly = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: aiAction.id,
        p_completion_data: genericEvidence,
      });
      assertRpcError(draftOnly.error, { code: "P0001", hint: "DELIVERABLE_NOT_APPROVED" }, "IA con borrador");

      const approval = await owner.client.rpc("approve_action_result", { p_action_result_id: draft!.id });
      assert.ifError(approval.error);
      assert.equal((await getAction(admin, aiAction.id)).status, "pending", "Aprobar no completa la acción sin evidencia");

      const aiCompleted = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: aiAction.id,
        p_completion_data: genericEvidence,
      });
      assert.ifError(aiCompleted.error);
      assert.equal((await getAction(admin, aiAction.id)).status, "completed");

      // D3 y D11: una semana de 4 acciones se cierra con un resumen de hasta 2000 caracteres.
      const { error: reviewError } = await owner.client.from("weekly_reviews").insert({
        ceo_plan_id: planId,
        outcome_status: "mixed",
        outcome_summary: "Resultado observado. ".repeat(75).slice(0, 1500),
        what_worked: null,
        what_didnt_work: null,
        business_changes: null,
        next_week_focus: null,
        completed_actions: 3,
        total_actions: 4,
        decision_learning: null,
      });
      assert.ifError(reviewError);

      const closedWeek = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: genericAction.id,
        p_completion_data: genericEvidence,
      });
      assertRpcError(closedWeek.error, { code: "P0001", hint: "WEEKLY_PLAN_CLOSED" }, "semana cerrada");
      assert.equal((await getAction(admin, genericAction.id)).status, "pending");

      // La semana siguiente se genera sobre el plan revisado.
      const nextPlanId = await createPlan(admin, businessId, 2);
      const { error: nextPlanError } = await owner.client.rpc("complete_ceo_plan", {
        p_plan_id: nextPlanId,
        ...payload,
        p_weekly_plan: actionsWithCapture.slice(0, 2),
        p_actions: actionsWithCapture.slice(0, 2),
        p_time_allocation: { ...payload.p_time_allocation, allocated_hours: 3 },
      });
      assert.ifError(nextPlanError);
      const { data: nextActions, error: nextActionsError } = await admin
        .from("weekly_actions")
        .select("status, capture_schema")
        .eq("ceo_plan_id", nextPlanId);
      assert.ifError(nextActionsError);
      assert.equal(nextActions?.length, 2);
      assert.ok(nextActions?.every((action) => action.status === "pending" && action.capture_schema));
    } finally {
      await admin.from("businesses").delete().eq("id", businessId);
      await admin.auth.admin.deleteUser(owner.id);
      await admin.auth.admin.deleteUser(otherUser.id);
    }
  },
);

test(
  "El validador de PostgreSQL coincide con el de TypeScript en los fixtures compartidos",
  { skip: !enabled },
  async () => {
    const config = loadLocalSupabaseConfig();
    assertLocalSupabaseUrl(config.url);
    const admin = createClient(config.url, config.serviceRoleKey);

    const generic = await admin.rpc("action_capture_generic_schema");
    assert.ifError(generic.error);
    assert.deepEqual(generic.data, GENERIC_ACTION_CAPTURE_SCHEMA, "El esquema genérico debe ser idéntico en TS y SQL");

    for (const testCase of fixtures.schema_validity) {
      const schema = testCase.inline ?? fixtureSchema(testCase.schema!);
      const { data, error } = await admin.rpc("is_valid_action_capture_schema", { p_schema: schema });
      assert.ifError(error);
      assert.equal(data, testCase.valid, `Esquema: ${testCase.name}`);
    }

    for (const testCase of fixtures.completions) {
      const { data, error } = await admin.rpc("validate_action_completion_data", {
        p_schema: fixtureSchema(testCase.schema),
        p_data: testCase.data,
      });
      assert.ifError(error);
      const paths = (data as Array<{ path: string }>).map((issue) => issue.path).sort();
      assert.deepEqual(paths, [...testCase.issue_paths].sort(), `Evidencia: ${testCase.name}`);
    }
  },
);
