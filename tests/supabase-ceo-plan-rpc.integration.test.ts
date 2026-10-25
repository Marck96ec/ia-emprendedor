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

function createPlanPayload() {
  const actions = validActions();

  return {
    p_executive_summary: "Resumen válido",
    p_diagnosis: "Diagnóstico válido",
    p_priorities: validPriorities(),
    p_weekly_plan: actions,
    p_actions: actions,
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
      business_type: "Servicios",
      description: "Negocio para pruebas locales.",
    })
    .select("id")
    .single();

  assert.ifError(error);
  assert.ok(data);
  return data.id;
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
    const planId = await createPlan(admin, businessId, 1);

    try {
      const completed = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: planId,
          ...createPlanPayload(),
          p_actions: validActions().reverse(),
        },
      );
      assert.ifError(completed.error);
      assert.equal(await countActions(admin, planId), 3);
      assert.equal(
        (await getPlanStatus(admin, planId)).status,
        "ready",
      );
      assert.deepEqual(await getActionSequences(admin, planId), [1, 2, 3]);

      const nonOwnerFailure = await otherUser.client.rpc(
        "fail_ceo_plan",
        { p_plan_id: planId },
      );
      assert.ok(nonOwnerFailure.error);
      assert.equal(await countActions(admin, planId), 3);

      const readyFailure = await owner.client.rpc(
        "fail_ceo_plan",
        { p_plan_id: planId },
      );
      assert.ok(readyFailure.error);
      assert.equal(await countActions(admin, planId), 7);

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
        const weeklyPlan = validActions();
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
            p_executive_summary: "Resumen válido",
            p_diagnosis: "Diagnóstico válido",
            p_priorities: validPriorities(),
            p_weekly_plan: weeklyPlan,
            p_actions: mismatchedActions,
          },
        );

        assert.ok(mismatchResult.error);
        assert.equal(mismatchResult.error.code, "22023");
        assert.equal(
          mismatchResult.error.message,
          "CEO_PLAN_PAYLOAD_MISMATCH",
        );
        assert.equal(
          (await getPlanStatus(admin, mismatchPlanId)).status,
          "generating",
        );
        assert.equal(await countActions(admin, mismatchPlanId), 0);
      }

      const invalidPlanId = await createPlan(admin, businessId, 3);
      const invalidActions = validActions();
      invalidActions[0].action_type = "commercial_messages";
      const invalidResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: invalidPlanId,
          ...createPlanPayload(),
          p_weekly_plan: invalidActions,
          p_actions: invalidActions,
        },
      );
      assert.ok(invalidResult.error);

      const multipleAssistedPlanId = await createPlan(admin, businessId, 4);
      const multipleAssisted = validActions().map((action, index) =>
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
          ...createPlanPayload(),
          p_weekly_plan: multipleAssisted,
          p_actions: multipleAssisted,
        },
      );
      assert.ok(multipleAssistedResult.error);

      const rollbackPlanId = await createPlan(admin, businessId, 5);
      const oversizedActions = validActions();
      oversizedActions[0].action = "x".repeat(1001);
      const rollbackResult = await owner.client.rpc(
        "complete_ceo_plan",
        {
          p_plan_id: rollbackPlanId,
          ...createPlanPayload(),
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
        { p_plan_id: rollbackPlanId, ...createPlanPayload() },
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
        { p_plan_id: rollbackPlanId, ...createPlanPayload() },
      );
      assert.ifError(retryResult.error);

      const completedRetryPlan = await getPlanStatus(
        admin,
        rollbackPlanId,
      );
      assert.equal(completedRetryPlan.status, "ready");
      assert.equal(await countActions(admin, rollbackPlanId), 3);
      assert.deepEqual(await getActionSequences(admin, rollbackPlanId), [1, 2, 3]);
    } finally {
      await admin.from("businesses").delete().eq("id", businessId);
      await admin.auth.admin.deleteUser(owner.id);
      await admin.auth.admin.deleteUser(otherUser.id);
    }
  },
);