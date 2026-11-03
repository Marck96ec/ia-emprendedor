import assert from "node:assert/strict";
import test from "node:test";

import {
  ActionCaptureSchema,
  GENERIC_ACTION_CAPTURE_SCHEMA,
  parsePersistedActionCaptureSchema,
  validateActionCaptureSemantics,
  validateActionCompletion,
} from "../src/lib/action-capture";

const validSchema = {
  version: 1 as const,
  capture_type: "pricing_experiment",
  title: "Resultado del experimento",
  fields: [
    { id: "price", type: "number" as const, label: "Precio probado", required: true, min: 1, max: 100 },
    {
      id: "responses",
      type: "multi_select" as const,
      label: "Señales observadas",
      required: true,
      min_items: 1,
      options: [{ value: "interest", label: "Interés" }, { value: "purchase", label: "Compra" }],
    },
  ],
  completion_rule: { type: "all_required_fields_valid" as const },
};

test("accepts supported capture field types and rejects duplicate IDs", () => {
  assert.equal(ActionCaptureSchema.safeParse(validSchema).success, true);
  assert.equal(ActionCaptureSchema.safeParse({
    ...validSchema,
    fields: [validSchema.fields[0], validSchema.fields[0]],
  }).success, false);
  assert.equal(ActionCaptureSchema.safeParse({
    ...validSchema,
    fields: [{ id: "bad-id", type: "text", label: "Bad", required: true }],
  }).success, false);
});

test("rejects nested repeatable groups and invalid ranges", () => {
  assert.equal(ActionCaptureSchema.safeParse({
    ...validSchema,
    fields: [{ id: "items", type: "repeatable_group", label: "Items", required: true, fields: [
      { id: "nested", type: "repeatable_group", label: "Nested", required: true, fields: [{ id: "name", type: "text", label: "Name", required: true }] },
    ] }],
  }).success, false);
  assert.equal(ActionCaptureSchema.safeParse({
    ...validSchema,
    fields: [{ id: "range", type: "number", label: "Range", required: true, min: 10, max: 1 }],
  }).success, false);
});

test("rejects invalid child field IDs with the nested field path", () => {
  const parsed = ActionCaptureSchema.safeParse({
    ...validSchema,
    fields: [
      validSchema.fields[0],
      {
        id: "items",
        type: "repeatable_group" as const,
        label: "Items",
        required: true,
        fields: [{ id: "Product Name", type: "text" as const, label: "Product", required: true }],
      },
    ],
  });

  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.error.issues.some((issue) =>
      issue.path.join(".") === "fields.1.fields.0.id" &&
      issue.message.includes("pattern"),
    ));
  }
});

test("validates completion data against required, type, range and options", () => {
  assert.deepEqual(validateActionCompletion(validSchema, { price: 20, responses: ["purchase"] }), { success: true });
  const invalid = validateActionCompletion(validSchema, { price: 0, responses: ["unknown"] });
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.deepEqual(invalid.issues.map((issue) => issue.path).sort(), ["price", "responses"]);
  const missing = validateActionCompletion(validSchema, { price: "" });
  assert.equal(missing.success, false);
});

test("rejects completion with fewer repeatable items than the success metric requires", () => {
  const schema = {
    ...validSchema,
    fields: [{
      id: "rules",
      type: "repeatable_group" as const,
      label: "Reglas",
      required: true,
      min_items: 3,
      max_items: 3,
      fields: [{ id: "rule", type: "text" as const, label: "Regla", required: true }],
    }],
  };

  assert.equal(validateActionCompletion(schema, { rules: [{ rule: "Una regla" }] }).success, false);
  assert.deepEqual(validateActionCompletion(schema, {
    rules: [{ rule: "Una" }, { rule: "Dos" }, { rule: "Tres" }],
  }), { success: true });
  assert.equal(validateActionCaptureSemantics({
    action: "Definir 3 reglas de operación",
    success_metric: "Tres reglas escritas y compartidas",
    expected_result: "Criterios claros",
  }, schema).success, true);
  assert.equal(validateActionCaptureSemantics({
    action: "Definir 3 reglas de operación",
    success_metric: "Tres reglas escritas y compartidas",
    expected_result: "Criterios claros",
  }, validSchema).success, false);
  assert.equal(validateActionCaptureSemantics({
    action: "Revisar varios clientes recientes",
    success_metric: "Comparación de varios clientes",
    expected_result: "Patrones iniciales",
  }, {
    ...schema,
    fields: [{
      ...schema.fields[0],
      min_items: 2,
      max_items: 5,
    }],
  }).success, true);
});

test("legacy fallback is valid and requires evidence", () => {
  assert.equal(ActionCaptureSchema.safeParse(GENERIC_ACTION_CAPTURE_SCHEMA).success, true);
  assert.equal(validateActionCompletion(GENERIC_ACTION_CAPTURE_SCHEMA, {
    result: "Señal observada",
    learning: "Aprendizaje",
  }).success, true);
});

test("persisted invalid schemas are rejected instead of becoming a generic fallback", () => {
  assert.equal(parsePersistedActionCaptureSchema(null).success, false);
  assert.equal(parsePersistedActionCaptureSchema({ ...validSchema, fields: [] }).success, false);
});
