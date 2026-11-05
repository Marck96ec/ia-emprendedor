import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  ActionCaptureSchema,
  GENERIC_ACTION_CAPTURE_SCHEMA,
  getCountRequirements,
  normalizeCompletionData,
  parsePersistedActionCaptureSchema,
  validateActionCaptureSemantics,
  validateActionCompletion,
  type ActionCapture,
} from "../src/lib/action-capture";

type CompletionFixtures = {
  schemas: Record<string, unknown>;
  schema_validity: Array<{ name: string; schema?: string; inline?: unknown; valid: boolean }>;
  completions: Array<{ name: string; schema: string; data: unknown; valid: boolean; issue_paths: string[] }>;
};

// Los mismos casos se ejecutan contra PostgreSQL en supabase-action-completion.integration.test.ts.
const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/action-completion-cases.json"), "utf8"),
) as CompletionFixtures;

function fixtureSchema(name: string): unknown {
  return name === "generic" ? GENERIC_ACTION_CAPTURE_SCHEMA : fixtures.schemas[name];
}

function validateLikeDatabase(schema: unknown, data: unknown): string[] {
  const parsed = ActionCaptureSchema.safeParse(schema);
  if (!parsed.success) return [""];
  const result = validateActionCompletion(parsed.data, data);
  return result.success ? [] : result.issues.map((issue) => issue.path).sort();
}

test("shared fixtures: schema validity matches the database contract", () => {
  for (const testCase of fixtures.schema_validity) {
    const schema = testCase.inline ?? fixtureSchema(testCase.schema!);
    assert.equal(ActionCaptureSchema.safeParse(schema).success, testCase.valid, testCase.name);
  }
});

test("shared fixtures: completion issues match the database contract", () => {
  for (const testCase of fixtures.completions) {
    const paths = validateLikeDatabase(fixtureSchema(testCase.schema), testCase.data);
    assert.deepEqual(paths, [...testCase.issue_paths].sort(), testCase.name);
    assert.equal(paths.length === 0, testCase.valid, testCase.name);
  }
});

test("completion payloads above the size limit are rejected", () => {
  const result = validateActionCompletion(GENERIC_ACTION_CAPTURE_SCHEMA, {
    result: "x".repeat(300_000),
    learning: "Aprendizaje",
  });
  assert.equal(result.success, false);
  if (!result.success) assert.deepEqual(result.issues.map((issue) => issue.path), [""]);
});

test("normalization trims answers, drops empty optional values and keeps unknown keys for rejection", () => {
  const schema = fixtures.schemas.contacts as ActionCapture;
  const normalized = normalizeCompletionData(schema, {
    contacts: [
      { name: "  Ana  ", outcome: "interested", notes: "   " },
      { name: "Luis", outcome: "not_interested", notes: "" },
      { name: "Eva", outcome: "interested" },
    ],
    injected: "x",
  });

  assert.deepEqual(normalized, {
    contacts: [
      { name: "Ana", outcome: "interested" },
      { name: "Luis", outcome: "not_interested" },
      { name: "Eva", outcome: "interested" },
    ],
    injected: "x",
  });
  const validation = validateActionCompletion(schema, normalized);
  assert.equal(validation.success, false);
  if (!validation.success) assert.deepEqual(validation.issues.map((issue) => issue.path), ["injected"]);
});

function groupSchema(group: { min_items?: number; max_items?: number; required?: boolean }): ActionCapture {
  return {
    version: 1,
    capture_type: "group_capture",
    title: "Evidencia",
    fields: [{
      id: "items",
      type: "repeatable_group",
      label: "Elemento",
      required: group.required ?? true,
      min_items: group.min_items,
      max_items: group.max_items,
      fields: [{ id: "detail", type: "textarea", label: "Detalle", required: true }],
    }],
    completion_rule: { type: "all_required_fields_valid" },
  };
}

function semantics(text: string, schema: ActionCapture) {
  return validateActionCaptureSemantics(
    { action: text, success_metric: "Resultado registrado", expected_result: "Aprendizaje útil" },
    schema,
  ).success;
}

test("cardinality ignores time, money and measurement units", () => {
  assert.deepEqual(getCountRequirements("Responder en 48 horas a los leads"), []);
  assert.deepEqual(getCountRequirements("Medir durante 2 semanas"), []);
  assert.deepEqual(getCountRequirements("Invertir 100 dólares en anuncios"), []);
  assert.deepEqual(getCountRequirements("Vender todos los productos"), []);
  assert.deepEqual(getCountRequirements("Atender hasta 3 clientes"), []);
  assert.equal(semantics("Responder en 48 horas a los leads", GENERIC_ACTION_CAPTURE_SCHEMA), true);
  assert.equal(semantics("Probar el anuncio durante 2 semanas con 100 dólares", GENERIC_ACTION_CAPTURE_SCHEMA), true);
});

test("cardinality keeps real count requirements, including later matches in the text", () => {
  assert.deepEqual(getCountRequirements("En 48 horas contactar 5 clientes"), [{ minimum: 5, exact: true }]);
  assert.equal(semantics("En 48 horas contactar 5 clientes", GENERIC_ACTION_CAPTURE_SCHEMA), true, "La meta no obliga a registrar cinco resultados");
  assert.equal(semantics("En 48 horas contactar 5 clientes", groupSchema({ min_items: 5, max_items: 5 })), true);
  assert.equal(semantics("Definir 3 reglas", groupSchema({ min_items: 3, max_items: 5 })), true, "La cantidad planificada no limita el resultado real");
});

test("'al menos N' is a minimum, not an exact count", () => {
  assert.deepEqual(getCountRequirements("Conseguir al menos 5 respuestas"), [{ minimum: 5, exact: false }]);
  assert.equal(semantics("Conseguir al menos 5 respuestas", groupSchema({ min_items: 5 })), true);
  assert.equal(semantics("Conseguir al menos 5 respuestas", groupSchema({ min_items: 5, max_items: 8 })), true);
  assert.equal(semantics("Conseguir al menos 5 respuestas", groupSchema({ min_items: 4, max_items: 8 })), true);
  assert.deepEqual(getCountRequirements("Hablar con más de 3 proveedores"), [{ minimum: 4, exact: false }]);
});

test("count evidence must be required so it cannot be skipped", () => {
  assert.equal(semantics("Definir 3 reglas", groupSchema({ min_items: 3, max_items: 3, required: false })), false);
});

test("repeatable evidence can be empty when no result occurred", () => {
  const result = validateActionCompletion(groupSchema({ min_items: 3, max_items: 10 }), {
    items: [],
  });

  assert.equal(result.success, true);
});

test("counts above ten require a proportional capture instead of an impossible form", () => {
  const proportional = fixtures.schemas.proportional as ActionCapture;
  assert.equal(semantics("Llamar a 20 clientes", proportional), true);
  assert.equal(semantics("Llamar a 20 clientes", groupSchema({ min_items: 10, max_items: 10 })), true);
  assert.equal(semantics("Llamar a 25 clientes", proportional), true);
  assert.equal(semantics("Llamar a 20 clientes", {
    ...proportional,
    fields: [proportional.fields[0]],
  }), true);
  assert.equal(semantics("Llamar a veinte clientes", proportional), true);
});

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

test("accepts completion with fewer repeatable items than the success metric requires", () => {
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

  assert.equal(validateActionCompletion(schema, { rules: [{ rule: "Una regla" }] }).success, true);
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
  }, validSchema).success, true);
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
