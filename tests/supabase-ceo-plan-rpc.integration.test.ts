import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const enabled = process.env.SUPABASE_LOCAL_TESTS === "1";

type LocalSupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

type TestUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
};

function stripEnvQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function parseEnvFile(filePath: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .flatMap((line) => {
          const match = line.match(
            /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/,
          );

          if (!match || match[1].startsWith("#")) {
            return [];
          }

          return [[
            match[1],
            stripEnvQuotes(match[2]),
          ]];
        }),
    );
  } catch {
    return {};
  }
}

function loadSupabaseCliEnv(): Record<string, string> {
  try {
    const command =
      process.platform === "win32"
        ? "npx.cmd supabase status -o env"
        : "npx supabase status -o env";
    const shell =
      process.platform === "win32"
        ? process.env.ComSpec ?? "cmd.exe"
        : "/bin/sh";
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      shell,
      stdio: ["ignore", "pipe", "ignore"],
    });

    return Object.fromEntries(
      output.split(/\r?\n/).flatMap((line) => {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        return match
          ? [[match[1], stripEnvQuotes(match[2])]]
          : [];
      }),
    );
  } catch {
    return {};
  }
}

function loadLocalSupabaseConfig(): LocalSupabaseConfig {
  const fileEnv = {
    ...parseEnvFile(join(process.cwd(), ".env.local")),
    ...parseEnvFile(join(process.cwd(), ".env.test.local")),
  };
  const cliEnv = loadSupabaseCliEnv();
  const explicitLocal = {
    url:
      process.env.SUPABASE_LOCAL_URL ??
      fileEnv.SUPABASE_LOCAL_URL ??
      "",
    anonKey:
      process.env.SUPABASE_LOCAL_ANON_KEY ??
      fileEnv.SUPABASE_LOCAL_ANON_KEY ??
      "",
    serviceRoleKey:
      process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ??
      fileEnv.SUPABASE_LOCAL_SERVICE_ROLE_KEY ??
      "",
  };
  const hasExplicitLocalConfig = Object.values(explicitLocal).some(
    Boolean,
  );
  const hasCompleteExplicitLocalConfig = Object.values(
    explicitLocal,
  ).every(Boolean);
  const cliConfig = {
    url: cliEnv.API_URL ?? "",
    anonKey: cliEnv.ANON_KEY ?? cliEnv.PUBLISHABLE_KEY ?? "",
    serviceRoleKey: cliEnv.SERVICE_ROLE_KEY ?? "",
  };
  const hasCliCredentialConfig = [
    cliEnv.API_URL,
    cliEnv.ANON_KEY,
    cliEnv.PUBLISHABLE_KEY,
    cliEnv.SERVICE_ROLE_KEY,
  ].some(Boolean);
  const hasCompleteCliConfig = Object.values(cliConfig).every(Boolean);

  if (
    hasExplicitLocalConfig &&
    !hasCompleteExplicitLocalConfig
  ) {
    assert.fail(
      "La configuración local de Supabase está incompleta.",
    );
  }

  if (hasCliCredentialConfig && !hasCompleteCliConfig) {
    assert.fail(
      "supabase status no devolvió el conjunto completo de credenciales locales.",
    );
  }

  if (
    hasCompleteExplicitLocalConfig &&
    hasCompleteCliConfig &&
    (explicitLocal.url !== cliConfig.url ||
      explicitLocal.anonKey !== cliConfig.anonKey ||
      explicitLocal.serviceRoleKey !== cliConfig.serviceRoleKey)
  ) {
    assert.fail(
      "Las credenciales locales configuradas no coinciden con Supabase local.",
    );
  }

  if (hasCompleteCliConfig) {
    return cliConfig;
  }

  if (hasCompleteExplicitLocalConfig) {
    return explicitLocal;
  }

  return {
    url: "http://127.0.0.1:54321",
    anonKey: "",
    serviceRoleKey: "",
  };
}

function assertLocalSupabaseUrl(url: string): void {
  let hostname = "";

  try {
    hostname = new URL(url).hostname;
  } catch {
    assert.fail("La URL de Supabase local no es válida.");
  }

  assert.ok(
    hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1",
    "La prueba de integración solo permite Supabase local.",
  );
}

function validPriorities() {
  return [1, 2, 3].map((rank) => ({
    rank,
    title: `Prioridad ${rank}`,
    reason: `Motivo ${rank}`,
    expected_impact: `Impacto ${rank}`,
  }));
}

function validActions(count = 3) {
  return Array.from({ length: count }, (_, index) => ({
    sequence: index + 1,
    action: `Acción ${index + 1}`,
    objective: `Objetivo ${index + 1}`,
    reason: `Razón ${index + 1}`,
    success_metric: `Métrica ${index + 1}`,
    expected_result: `Resultado ${index + 1}`,
    execution_mode: "manual",
    action_type: "generic",
  }));
}

function createPlanPayload(actions = validActions()) {

  return {
    p_executive_summary: "Resumen válido",
    p_diagnosis: "Diagnóstico válido",
    p_priorities: validPriorities(),
    p_weekly_plan: actions,
    p_actions: actions,
  };
}

type V4Action = {
  sequence: number;
  action: string;
  objective: string;
  reason: string;
  success_metric: string;
  expected_result: string;
  role_recommendation: "execute" | "delegate" | "automate" | "defer";
  role_reason: string;
  estimated_hours: number;
  execution_mode: "manual" | "ai_assisted";
  action_type: "generic" | "value_proposition" | "commercial_messages";
};

function validRoleActions(): V4Action[] {
  return [
    {
      sequence: 1,
      action: "Validar la hipótesis con clientes",
      objective: "Aprender qué segmento responde mejor.",
      reason: "Requiere criterio y aprendizaje directo del empresario.",
      success_metric: "Tres conversaciones registradas",
      expected_result: "Identificar el segmento con mayor señal.",
      role_recommendation: "execute",
      role_reason: "La conversación requiere criterio estratégico del empresario.",
      estimated_hours: 2,
      execution_mode: "manual",
      action_type: "generic",
    },
    {
      sequence: 2,
      action: "Configurar un seguimiento repetible",
      objective: "Reducir trabajo operativo recurrente.",
      reason: "El proceso puede estructurarse con reglas simples.",
      success_metric: "El seguimiento queda definido",
      expected_result: "Menos atención personal en tareas repetitivas.",
      role_recommendation: "automate",
      role_reason: "Es repetitivo y de bajo juicio estratégico.",
      estimated_hours: 1,
      execution_mode: "manual",
      action_type: "generic",
    },
    {
      sequence: 3,
      action: "Revisar una iniciativa secundaria",
      objective: "Conservarla para otro ciclo.",
      reason: "No mueve el bottleneck actual.",
      success_metric: "La iniciativa queda fuera del ciclo",
      expected_result: "Preservar capacidad para la decisión crítica.",
      role_recommendation: "defer",
      role_reason: "Compite con una prioridad de mayor impacto esta semana.",
      estimated_hours: 0,
      execution_mode: "manual",
      action_type: "generic",
    },
  ];
}

function createV5PlanPayload(
  actions: ReadonlyArray<V4Action> = validRoleActions(),
  timeAllocation = {
    available_hours: 6,
    allocated_hours: 3,
    reserved_hours: 3,
    rationale: "Se conserva capacidad para responder al aprendizaje.",
  },
) {
  return {
    p_executive_summary: "Resumen válido v4",
    p_diagnosis: "Diagnóstico válido v4",
    p_priorities: validPriorities(),
    p_weekly_plan: actions,
    p_actions: actions,
    p_strategic_diagnosis: { confidence: "medium" },
    p_time_allocation: timeAllocation,
    p_decision_hypothesis: {
      statement: "La dirección elegida producirá una señal comercial suficiente.",
      validation_signal: "Aparecen conversaciones cualificadas.",
    },
  };
}

async function createTestUser(
  admin: SupabaseClient,
  config: LocalSupabaseConfig,
  label: string,
): Promise<TestUser> {
  const email = `ceo-rpc-${label}-${Date.now()}@example.com`;
  const password = "TestPassword123!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  assert.ifError(error);
  assert.ok(data.user);

  const client = createClient(config.url, config.anonKey);
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  assert.ifError(signInError);

  return {
    id: data.user.id,
    email,
    password,
    client,
  };
}

async function createBusiness(
  admin: SupabaseClient,
  ownerId: string,
) {
  const { data, error } = await admin
    .from("businesses")
    .insert({
      owner_id: ownerId,
      name: `RPC test ${ownerId.slice(0, 8)}`,
      description: "Negocio para pruebas locales.",
      revenue_model: "Cobro por servicios profesionales.",
    })
    .select("id")
    .single();

  assert.ifError(error);
  assert.ok(data);
  return data.id;
}

async function createDiagnostic(
  admin: SupabaseClient,
  businessId: string,
  ownerHoursPerWeek = 6,
) {
  const { error } = await admin
    .from("business_diagnostics")
    .insert({
      business_id: businessId,
      business_stage: "operating",
      team_size: 1,
      owner_hours_per_week: ownerHoursPerWeek,
      owner_responsibilities: "Ventas, decisiones y revisión del negocio.",
      main_challenge: "La captación comercial necesita más foco.",
      primary_goal: "Aumentar conversaciones cualificadas.",
      customers_description: "Comercios locales con una necesidad concreta.",
      sales_process: "Conversaciones directas y seguimiento semanal.",
      monthly_revenue: 1200,
      currency_code: "USD",
    });

  assert.ifError(error);
}

async function createPlan(
  admin: SupabaseClient,
  businessId: string,
  weekNumber: number,
) {
  const { data, error } = await admin
    .from("ceo_plans")
    .insert({
      business_id: businessId,
      week_number: weekNumber,
      status: "generating",
      model: "test",
      prompt_version: "test",
    })
    .select("id")
    .single();

  assert.ifError(error);
  assert.ok(data);
  return data.id;
}

async function countActions(
  admin: SupabaseClient,
  planId: string,
) {
  const { count, error } = await admin
    .from("weekly_actions")
    .select("id", { count: "exact", head: true })
    .eq("ceo_plan_id", planId);

  assert.ifError(error);
  return count ?? 0;
}

async function getPlanStatus(
  admin: SupabaseClient,
  planId: string,
) {
  const { data, error } = await admin
    .from("ceo_plans")
    .select("id, status")
    .eq("id", planId)
    .single();

  assert.ifError(error);
  assert.ok(data);
  return data;
}

async function getActionSequences(
  admin: SupabaseClient,
  planId: string,
) {
  const { data, error } = await admin
    .from("weekly_actions")
    .select("sequence")
    .eq("ceo_plan_id", planId)
    .order("sequence", { ascending: true });

  assert.ifError(error);
  return (data ?? []).map((action) => action.sequence);
}

async function getRoleActions(
  admin: SupabaseClient,
  planId: string,
) {
  const { data, error } = await admin
    .from("weekly_actions")
    .select("sequence, role_recommendation, role_reason, estimated_hours")
    .eq("ceo_plan_id", planId)
    .order("sequence", { ascending: true });

  assert.ifError(error);
  return data ?? [];
}

async function getTimeAllocation(
  admin: SupabaseClient,
  planId: string,
) {
  const { data, error } = await admin
    .from("ceo_plans")
    .select("time_allocation")
    .eq("id", planId)
    .single();

  assert.ifError(error);
  return data.time_allocation;
}

test(
  "CEO plan RPC en Supabase local protege propietarios, estados y atomicidad",
  { skip: !enabled },
  async () => {
    const config = loadLocalSupabaseConfig();
    assertLocalSupabaseUrl(config.url);
    assert.ok(
      config.anonKey,
      "Falta la clave anon/publishable de Supabase local.",
    );
    assert.ok(
      config.serviceRoleKey,
      "Falta la clave service role de Supabase local.",
    );

    const admin = createClient(config.url, config.serviceRoleKey);
    const owner = await createTestUser(admin, config, "owner");
    const otherUser = await createTestUser(admin, config, "other");
    const businessId = await createBusiness(admin, owner.id);
    await createDiagnostic(admin, businessId);
    const planId = await createPlan(admin, businessId, 1);
    const expectedActions = validRoleActions();

    try {
      for (const actionCount of [1, 3, 5]) {
        const { error } = await admin
          .from("ceo_plans")
          .update({ weekly_plan: validActions(actionCount) })
          .eq("id", planId);

        assert.ifError(error);
      }

      for (const actionCount of [0, 6, 7]) {
        const { error } = await admin
          .from("ceo_plans")
          .update({ weekly_plan: validActions(actionCount) })
          .eq("id", planId);

        assert.ok(error);
        assert.equal(error.code, "23514");
        assert.match(
          error.message,
          /ceo_plans_weekly_plan_array_check/,
        );
      }

      const legacySixPlanId = await createPlan(admin, businessId, 12);
      const legacySixResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: legacySixPlanId,
          ...createPlanPayload(),
        },
      );
      assert.ok(legacySixResult.error);
      assert.equal(
        (await getPlanStatus(admin, legacySixPlanId)).status,
        "generating",
      );
      assert.equal(await countActions(admin, legacySixPlanId), 0);

      const legacySevenPlanId = await createPlan(admin, businessId, 13);
      const legacySevenResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: legacySevenPlanId,
          ...createPlanPayload(),
          p_strategic_diagnosis: { confidence: "medium" },
        },
      );
      assert.ok(legacySevenResult.error);
      assert.equal(
        (await getPlanStatus(admin, legacySevenPlanId)).status,
        "generating",
      );
      assert.equal(await countActions(admin, legacySevenPlanId), 0);

      const completed = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: planId,
          ...createV5PlanPayload(expectedActions),
          p_actions: [...expectedActions].reverse(),
        },
      );
      assert.ifError(completed.error);
      assert.equal(
        await countActions(admin, planId),
        expectedActions.length,
      );
      assert.equal(
        (await getPlanStatus(admin, planId)).status,
        "ready",
      );
      assert.deepEqual(await getActionSequences(admin, planId), [1, 2, 3]);

      const validV4PlanId = await createPlan(admin, businessId, 6);
      const validV4Result = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: validV4PlanId,
          ...createV5PlanPayload(),
        },
      );
      assert.ifError(validV4Result.error);
      assert.equal(
        (await getPlanStatus(admin, validV4PlanId)).status,
        "ready",
      );
      assert.deepEqual(await getRoleActions(admin, validV4PlanId), [
        {
          sequence: 1,
          role_recommendation: "execute",
          role_reason: "La conversación requiere criterio estratégico del empresario.",
          estimated_hours: 2,
        },
        {
          sequence: 2,
          role_recommendation: "automate",
          role_reason: "Es repetitivo y de bajo juicio estratégico.",
          estimated_hours: 1,
        },
        {
          sequence: 3,
          role_recommendation: "defer",
          role_reason: "Compite con una prioridad de mayor impacto esta semana.",
          estimated_hours: 0,
        },
      ]);
      assert.deepEqual(await getTimeAllocation(admin, validV4PlanId), {
        available_hours: 6,
        allocated_hours: 3,
        reserved_hours: 3,
        rationale: "Se conserva capacidad para responder al aprendizaje.",
      });

      const invalidV4Cases = [
        {
          week: 7,
          actions: validRoleActions().map((action) =>
            action.sequence === 3
              ? { ...action, estimated_hours: 1 }
              : action,
          ),
          timeAllocation: {
            available_hours: 6,
            allocated_hours: 4,
            reserved_hours: 2,
            rationale: "Reserva válida.",
          },
        },
        {
          week: 8,
          actions: validRoleActions().map((action) =>
            action.sequence === 1
              ? { ...action, estimated_hours: 0 }
              : action,
          ),
          timeAllocation: {
            available_hours: 6,
            allocated_hours: 1,
            reserved_hours: 5,
            rationale: "Reserva válida.",
          },
        },
        {
          week: 9,
          actions: validRoleActions(),
          timeAllocation: {
            available_hours: 6,
            allocated_hours: 4,
            reserved_hours: 2,
            rationale: "Asignación inconsistente.",
          },
        },
        {
          week: 10,
          actions: validRoleActions(),
          timeAllocation: {
            available_hours: 6,
            allocated_hours: 3,
            reserved_hours: 8,
            rationale: "Reserva inconsistente.",
          },
        },
      ];

      for (const invalidCase of invalidV4Cases) {
        const invalidV4PlanId = await createPlan(
          admin,
          businessId,
          invalidCase.week,
        );
        const invalidV4Result = await owner.client.rpc(
          "complete_ceo_plan",
          {
            p_plan_id: invalidV4PlanId,
            ...createV5PlanPayload(
              invalidCase.actions,
              invalidCase.timeAllocation,
            ),
          },
        );

        assert.ok(invalidV4Result.error);
        assert.equal(
          (await getPlanStatus(admin, invalidV4PlanId)).status,
          "generating",
        );
        assert.equal(await countActions(admin, invalidV4PlanId), 0);
      }

      await admin
        .from("business_diagnostics")
        .update({ owner_hours_per_week: 5 })
        .eq("business_id", businessId);
      const overCapacityPlanId = await createPlan(admin, businessId, 11);
      const overCapacityActions = validRoleActions().map((action) =>
        action.sequence === 2
          ? { ...action, estimated_hours: 4 }
          : action,
      );
      const overCapacityResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: overCapacityPlanId,
          ...createV5PlanPayload(overCapacityActions, {
            available_hours: 5,
            allocated_hours: 6,
            reserved_hours: 0,
            rationale: "No debe persistirse.",
          }),
        },
      );
      assert.ok(overCapacityResult.error);
      assert.equal(
        (await getPlanStatus(admin, overCapacityPlanId)).status,
        "generating",
      );
      assert.equal(await countActions(admin, overCapacityPlanId), 0);

      const nonOwnerFailure = await otherUser.client.rpc(
        "fail_ceo_plan",
        { p_plan_id: planId },
      );
      assert.ok(nonOwnerFailure.error);
      assert.equal(
        await countActions(admin, planId),
        expectedActions.length,
      );

      const readyFailure = await owner.client.rpc(
        "fail_ceo_plan",
        { p_plan_id: planId },
      );
      assert.ok(readyFailure.error);
      assert.equal(
        await countActions(admin, planId),
        expectedActions.length,
      );

      await admin
        .from("business_diagnostics")
        .update({ owner_hours_per_week: 6 })
        .eq("business_id", businessId);

      const mismatchPlanId = await createPlan(admin, businessId, 2);
      const sharedFields = [
        "sequence",
        "action",
        "objective",
        "reason",
        "success_metric",
        "expected_result",
        "execution_mode",
        "action_type",
      ] as const;

      for (const field of sharedFields) {
        const weeklyPlan = validRoleActions();
        const mismatchedActions = weeklyPlan.map(
          (action, index) => {
            if (field === "sequence") {
              return index === 0
                ? { ...action, sequence: 2 }
                : index === 1
                  ? { ...action, sequence: 1 }
                  : action;
            }

            if (field === "action") {
              return index === 0
                ? { ...action, action: "Acción inconsistente" }
                : action;
            }

            if (field === "objective") {
              return index === 0
                ? { ...action, objective: "Objetivo inconsistente" }
                : action;
            }

            if (field === "success_metric") {
              return index === 0
                ? {
                    ...action,
                    success_metric: "Métrica inconsistente",
                  }
                : action;
            }

            if (field === "reason") {
              return index === 0
                ? { ...action, reason: "Razón inconsistente" }
                : action;
            }

            if (field === "expected_result") {
              return index === 0
                ? { ...action, expected_result: "Resultado inconsistente" }
                : action;
            }

            if (field === "execution_mode") {
              return index === 0
                ? {
                    ...action,
                    execution_mode: "ai_assisted",
                    action_type: "value_proposition",
                  }
                : action;
            }

            return index === 0
              ? {
                  ...action,
                  action_type: "value_proposition",
                  execution_mode: "ai_assisted",
                }
              : action;
          },
        );

        const mismatchResult = await owner.client.rpc(
          "complete_ceo_plan",
          {
            p_plan_id: mismatchPlanId,
            ...createV5PlanPayload(weeklyPlan),
            p_actions: mismatchedActions,
          },
        );

        assert.ok(mismatchResult.error);
        assert.equal(mismatchResult.error.code, "22023");
        assert.equal(
          mismatchResult.error.message,
          field === "sequence"
            ? "CEO_PLAN_ROLE_PAYLOAD_MISMATCH"
            : "CEO_PLAN_PAYLOAD_MISMATCH",
        );
        assert.equal(
          (await getPlanStatus(admin, mismatchPlanId)).status,
          "generating",
        );
        assert.equal(await countActions(admin, mismatchPlanId), 0);
      }

      const invalidPlanId = await createPlan(admin, businessId, 3);
      const invalidActions = validRoleActions();
      invalidActions[0].action_type = "commercial_messages";
      const invalidResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: invalidPlanId,
          ...createV5PlanPayload(),
          p_weekly_plan: invalidActions,
          p_actions: invalidActions,
        },
      );
      assert.ok(invalidResult.error);

      const multipleAssistedPlanId = await createPlan(admin, businessId, 4);
      const multipleAssisted = validRoleActions().map((action, index) =>
        index < 2
          ? {
              ...action,
              execution_mode: "ai_assisted",
              action_type: "value_proposition",
            }
          : action,
      );
      const multipleAssistedResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: multipleAssistedPlanId,
          ...createV5PlanPayload(),
          p_weekly_plan: multipleAssisted,
          p_actions: multipleAssisted,
        },
      );
      assert.ok(multipleAssistedResult.error);

      const rollbackPlanId = await createPlan(admin, businessId, 5);
  const oversizedActions = validRoleActions();
      oversizedActions[0].action = "x".repeat(1001);
      const rollbackResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: rollbackPlanId,
          ...createV5PlanPayload(),
          p_weekly_plan: oversizedActions,
          p_actions: oversizedActions,
        },
      );
      assert.ok(rollbackResult.error);
      assert.equal(await countActions(admin, rollbackPlanId), 0);

      const failResult = await owner.client.rpc("fail_ceo_plan", {
        p_plan_id: rollbackPlanId,
      });
      assert.ifError(failResult.error);

      const failedPlan = await getPlanStatus(admin, rollbackPlanId);
      assert.equal(failedPlan.status, "failed");

      const invalidRetry = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: rollbackPlanId,
          ...createV5PlanPayload(),
        },
      );
      assert.ok(invalidRetry.error);
      assert.equal(invalidRetry.error.code, "P0001");
      assert.equal(
        (await getPlanStatus(admin, rollbackPlanId)).status,
        "failed",
      );

      const { data: claimedPlan, error: claimError } = await owner.client
        .from("ceo_plans")
        .update({ status: "generating" })
        .eq("id", rollbackPlanId)
        .eq("status", "failed")
        .select("id, status")
        .single();

      assert.ifError(claimError);
      assert.ok(claimedPlan);
      assert.equal(claimedPlan.id, rollbackPlanId);
      assert.equal(claimedPlan.status, "generating");

      const retryResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: rollbackPlanId,
          ...createV5PlanPayload(),
        },
      );
      assert.ifError(retryResult.error);

      const completedRetryPlan = await getPlanStatus(
        admin,
        rollbackPlanId,
      );
      assert.equal(completedRetryPlan.status, "ready");
      assert.equal(
        await countActions(admin, rollbackPlanId),
        expectedActions.length,
      );
      assert.deepEqual(await getActionSequences(admin, rollbackPlanId), [1, 2, 3]);
    } finally {
      await admin.from("businesses").delete().eq("id", businessId);
      await admin.auth.admin.deleteUser(owner.id);
      await admin.auth.admin.deleteUser(otherUser.id);
    }
  },
);