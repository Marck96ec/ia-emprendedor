import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * Utilidades compartidas por las pruebas de integración.
 * Solo permiten Supabase local: assertLocalSupabaseUrl rechaza cualquier host remoto.
 */
export const supabaseLocalTestsEnabled = process.env.SUPABASE_LOCAL_TESTS === "1";

export type LocalSupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export type TestUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
};

export function stripEnvQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function parseEnvFile(filePath: string): Record<string, string> {
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

export function loadSupabaseCliEnv(): Record<string, string> {
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

export function loadLocalSupabaseConfig(): LocalSupabaseConfig {
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

export function assertLocalSupabaseUrl(url: string): void {
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

export function validPriorities() {
  return [1, 2, 3].map((rank) => ({
    rank,
    title: `Prioridad ${rank}`,
    reason: `Motivo ${rank}`,
    expected_impact: `Impacto ${rank}`,
  }));
}

export function validActions(count = 3) {
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

export function createPlanPayload(actions = validActions()) {

  return {
    p_executive_summary: "Resumen válido",
    p_diagnosis: "Diagnóstico válido",
    p_priorities: validPriorities(),
    p_weekly_plan: actions,
    p_actions: actions,
  };
}

export type V4Action = {
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

export function validRoleActions(): V4Action[] {
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

export function createV5PlanPayload(
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

export async function createTestUser(
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

export async function createBusiness(
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

export async function createDiagnostic(
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

export async function createPlan(
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

