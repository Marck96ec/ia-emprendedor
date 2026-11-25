import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

import { MemoryRecordSchema } from "../src/lib/business-memory";
import { buildStrategicContext } from "../src/lib/strategic-context";
import {
  assertLocalSupabaseUrl, createBusiness, createDiagnostic, createPlan, createTestUser, createV5PlanPayload,
  deleteTestUser, loadLocalSupabaseConfig, supabaseLocalTestsEnabled, validRoleActions,
} from "./support/supabase-local";

test("Supabase local conserva memoria antigua, registra cambios y aísla a dos propietarios", {
  skip: !supabaseLocalTestsEnabled,
}, async () => {
  const config = loadLocalSupabaseConfig();
  assertLocalSupabaseUrl(config.url);
  assert.ok(config.anonKey && config.serviceRoleKey);
  const admin = createClient(config.url, config.serviceRoleKey);
  const owner = await createTestUser(admin, config, "memory-owner");
  try {
    const other = await createTestUser(admin, config, "memory-other");
    try {
      const businessId = await createBusiness(owner.client, owner.id);
      const otherBusinessId = await createBusiness(other.client, other.id);
      const absence = {
        p_business_id: businessId, p_memory_key: "social_media", p_category: "constraint",
        p_content: { label: "Redes sociales", availability: "unavailable" },
      };
      const initial = await owner.client.rpc("record_business_memory", absence);
      assert.ifError(initial.error);
      assert.ok(initial.data);
      const replay = await owner.client.rpc("record_business_memory", absence);
      assert.ifError(replay.error);
      assert.equal(replay.data, initial.data);

      const before = await owner.client.rpc("business_memory_as_of", { p_business_id: businessId });
      assert.ifError(before.error);
      const memory = MemoryRecordSchema.array().parse(before.data);
      assert.equal(memory.length, 1);
      for (const targetWeek of [5, 8]) {
        const simulatedDate = new Date(memory[0].updated_at);
        simulatedDate.setUTCDate(simulatedDate.getUTCDate() + 7 * (targetWeek - 1));
        const snapshot = await owner.client.rpc("business_memory_as_of", {
          p_business_id: businessId, p_as_of: simulatedDate.toISOString(),
        });
        assert.ifError(snapshot.error);
        const context = buildStrategicContext({
          targetWeek, memory: MemoryRecordSchema.array().parse(snapshot.data), history: [], evidence: [],
          declaredContext: "Publicidad en internet",
          knowledge: { valueProposition: null },
        });
        assert.equal(context.resources.social_media, "unavailable");
      }

      const updated = await owner.client.rpc("record_business_memory", {
        ...absence, p_category: "asset", p_confirmation: "confirmed",
        p_content: { label: "Redes sociales", availability: "available" },
      });
      assert.ifError(updated.error);
      assert.notEqual(updated.data, initial.data);

      const stored = await owner.client.from("business_memory")
        .select("supersedes_id,change_kind,content").eq("id", updated.data).single();
      assert.ifError(stored.error);
      assert.equal(stored.data.supersedes_id, initial.data);
      assert.equal(stored.data.change_kind, "contradicted");

      const historical = await owner.client.rpc("business_memory_as_of", {
        p_business_id: businessId, p_as_of: memory[0].updated_at,
      });
      assert.ifError(historical.error);
      assert.equal(historical.data[0].id, initial.data);
      const current = await owner.client.rpc("business_memory_as_of", { p_business_id: businessId });
      assert.ifError(current.error);
      assert.equal(current.data[0].content.availability, "available");

      const otherWrite = await other.client.rpc("record_business_memory", absence);
      assert.equal(otherWrite.error?.code, "42501");
      const crossRead = await other.client.from("business_memory").select("id").eq("business_id", businessId);
      assert.ifError(crossRead.error);
      assert.deepEqual(crossRead.data, []);
      const crossSnapshot = await other.client.rpc("business_memory_as_of", { p_business_id: businessId });
      assert.ifError(crossSnapshot.error);
      assert.deepEqual(crossSnapshot.data, []);
      const otherOwn = await other.client.rpc("record_business_memory", { ...absence, p_business_id: otherBusinessId });
      assert.ifError(otherOwn.error);
      const directEdit = await owner.client.from("business_memory").update({ state: "retired" }).eq("id", updated.data);
      assert.equal(directEdit.error?.code, "42501");

      await createDiagnostic(owner.client, businessId);
      const planId = await createPlan(owner.client, businessId, 1);
      const actions = validRoleActions().map((action) =>
        action.sequence === 2 ? { ...action, strategy: { depends_on_sequence: 1 } } : action);
      const completedPlan = await owner.client.rpc("complete_ceo_plan", { p_plan_id: planId, ...createV5PlanPayload(actions) });
      assert.ifError(completedPlan.error);

      const storedActions = await owner.client.from("weekly_actions").select("id").eq("ceo_plan_id", planId).order("sequence");
      assert.ifError(storedActions.error);
      const [first, second] = storedActions.data;
      const completion = { result: "Prueba local completada", learning: "Registramos una señal cualitativa." };
      const premature = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: second.id, p_completion_data: completion,
      });
      assert.equal(premature.error?.hint, "ACTION_DEPENDENCY_PENDING");
      const completedFirst = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: first.id, p_completion_data: completion,
      });
      assert.ifError(completedFirst.error);
      const completedSecond = await owner.client.rpc("complete_weekly_action_with_evidence", {
        p_action_id: second.id, p_completion_data: completion,
      });
      assert.ifError(completedSecond.error);
    } finally {
      await deleteTestUser(admin, other);
    }
  } finally {
    await deleteTestUser(admin, owner);
  }
});
