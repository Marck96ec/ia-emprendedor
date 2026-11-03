import { z } from "zod";

export const MAX_CAPTURE_FIELDS = 10;
export const MAX_CAPTURE_OPTIONS = 12;
export const MAX_REPEATABLE_CHILDREN = 8;
export const MAX_REPEATABLE_ITEMS = 10;
export const MAX_CAPTURE_NESTING_DEPTH = 2;

const CaptureOptionSchema = z.object({
  value: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const ModelCaptureOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const BaseCaptureFieldSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
  required: z.boolean(),
});

const ModelBaseCaptureFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  required: z.boolean(),
});

const NonGroupCaptureFieldModelSchema = z.union([
  ModelBaseCaptureFieldSchema.extend({
    type: z.literal("text"),
    placeholder: z.string().nullable(),
    max_length: z.number().int().nullable(),
  }),
  ModelBaseCaptureFieldSchema.extend({
    type: z.literal("textarea"),
    placeholder: z.string().nullable(),
    max_length: z.number().int().nullable(),
  }),
  ModelBaseCaptureFieldSchema.extend({
    type: z.literal("number"),
    min: z.number().nullable(),
    max: z.number().nullable(),
  }),
  ModelBaseCaptureFieldSchema.extend({
    type: z.literal("single_select"),
    options: z.array(ModelCaptureOptionSchema),
  }),
  ModelBaseCaptureFieldSchema.extend({
    type: z.literal("multi_select"),
    min_items: z.number().int().nullable(),
    max_items: z.number().int().nullable(),
    options: z.array(ModelCaptureOptionSchema),
  }),
]);

const RepeatableGroupModelFieldSchema = ModelBaseCaptureFieldSchema.extend({
  type: z.literal("repeatable_group"),
  min_items: z.number().int().nullable(),
  max_items: z.number().int().nullable(),
  fields: z.array(NonGroupCaptureFieldModelSchema),
});

export const ActionCaptureModelFieldSchema = z.union([
  NonGroupCaptureFieldModelSchema,
  RepeatableGroupModelFieldSchema,
]);

export const ActionCaptureModelSchema = z.object({
  version: z.literal(1),
  capture_type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  fields: z.array(ActionCaptureModelFieldSchema),
  completion_rule: z.object({
    type: z.literal("all_required_fields_valid"),
  }),
});

export type ActionCaptureModel = z.infer<typeof ActionCaptureModelSchema>;

const CaptureFieldSchema: z.ZodType<ActionCaptureField> = z.lazy(() =>
  z.discriminatedUnion("type", [
    BaseCaptureFieldSchema.extend({
      type: z.literal("text"),
      placeholder: z.string().optional(),
      max_length: z.number().int().positive().optional(),
    }),
    BaseCaptureFieldSchema.extend({
      type: z.literal("textarea"),
      placeholder: z.string().optional(),
      max_length: z.number().int().positive().optional(),
    }),
    BaseCaptureFieldSchema.extend({
      type: z.literal("number"),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
    BaseCaptureFieldSchema.extend({
      type: z.literal("single_select"),
      options: z.array(CaptureOptionSchema).min(1).max(MAX_CAPTURE_OPTIONS),
    }),
    BaseCaptureFieldSchema.extend({
      type: z.literal("multi_select"),
      min_items: z.number().int().min(0).max(MAX_REPEATABLE_ITEMS).optional(),
      max_items: z.number().int().min(0).max(MAX_REPEATABLE_ITEMS).optional(),
      options: z.array(CaptureOptionSchema).min(1).max(MAX_CAPTURE_OPTIONS),
    }),
    BaseCaptureFieldSchema.extend({
      type: z.literal("repeatable_group"),
      min_items: z.number().int().min(0).max(MAX_REPEATABLE_ITEMS).optional(),
      max_items: z.number().int().min(0).max(MAX_REPEATABLE_ITEMS).optional(),
      fields: z.array(z.lazy(() => CaptureFieldSchema)).min(1).max(MAX_REPEATABLE_CHILDREN),
    }),
  ]),
);

export const ActionCaptureSchema = z.object({
  version: z.literal(1),
  capture_type: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  fields: z.array(CaptureFieldSchema).min(1).max(MAX_CAPTURE_FIELDS),
  completion_rule: z.object({
    type: z.literal("all_required_fields_valid"),
  }),
}).superRefine((schema, context) => {
  const validateFields = (fields: ActionCaptureField[], path: (string | number)[], depth: number) => {
    const ids = new Set<string>();
    for (const [index, field] of fields.entries()) {
      const fieldPath = [...path, index];
      if (ids.has(field.id)) {
        context.addIssue({ code: "custom", message: "Los IDs de fields deben ser únicos", path: [...fieldPath, "id"] });
      }
      ids.add(field.id);

      if ("min" in field && "max" in field && field.min !== undefined && field.max !== undefined && field.min > field.max) {
        context.addIssue({ code: "custom", message: "min no puede ser mayor que max", path: [...fieldPath, "min"] });
      }
      if ("min_items" in field && "max_items" in field && field.min_items !== undefined && field.max_items !== undefined && field.min_items > field.max_items) {
        context.addIssue({ code: "custom", message: "min_items no puede ser mayor que max_items", path: [...fieldPath, "min_items"] });
      }
      if (field.type === "single_select" || field.type === "multi_select") {
        const optionValues = field.options.map((option) => option.value);
        if (new Set(optionValues).size !== optionValues.length) {
          context.addIssue({ code: "custom", message: "Las opciones deben ser únicas", path: [...fieldPath, "options"] });
        }
      }
      if (field.type === "repeatable_group") {
        if (depth >= MAX_CAPTURE_NESTING_DEPTH) {
          context.addIssue({ code: "custom", message: "La profundidad de repeatable_group excede el límite", path: fieldPath });
        }
        if (field.fields.some((child) => child.type === "repeatable_group")) {
          context.addIssue({ code: "custom", message: "repeatable_group no puede contener otro repeatable_group", path: [...fieldPath, "fields"] });
        }
        validateFields(field.fields, [...fieldPath, "fields"], depth + 1);
      }
    }
  };
  validateFields(schema.fields, ["fields"], 0);
});

function nullableToOptional(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(nullableToOptional);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, entry]) => entry !== null)
      .map(([key, entry]) => [key, nullableToOptional(entry)]),
  );
}

export function parseActionCaptureModel(value: unknown) {
  const model = ActionCaptureModelSchema.safeParse(value);
  if (!model.success) {
    return model;
  }

  return ActionCaptureSchema.safeParse(nullableToOptional(model.data));
}

export type ActionCaptureField = {
  id: string;
  label: string;
  description?: string;
  required: boolean;
} & (
  | { type: "text"; placeholder?: string; max_length?: number }
  | { type: "textarea"; placeholder?: string; max_length?: number }
  | { type: "number"; min?: number; max?: number }
  | { type: "single_select"; options: Array<{ value: string; label: string }> }
  | { type: "multi_select"; min_items?: number; max_items?: number; options: Array<{ value: string; label: string }> }
  | { type: "repeatable_group"; min_items?: number; max_items?: number; fields: ActionCaptureField[] }
);

export type ActionCapture = z.infer<typeof ActionCaptureSchema>;

export const GENERIC_ACTION_CAPTURE_SCHEMA: ActionCapture = {
  version: 1,
  capture_type: "generic_action_result",
  title: "Registra el resultado de esta acción",
  fields: [
    { id: "result", type: "textarea", label: "¿Qué ocurrió al realizar esta acción?", required: true },
    { id: "learning", type: "textarea", label: "¿Qué aprendiste?", required: true },
  ],
  completion_rule: { type: "all_required_fields_valid" },
};

export function getActionCaptureSchema(value: unknown): ActionCapture {
  const parsed = ActionCaptureSchema.safeParse(value);
  return parsed.success ? parsed.data : GENERIC_ACTION_CAPTURE_SCHEMA;
}

export function parsePersistedActionCaptureSchema(value: unknown) {
  return ActionCaptureSchema.safeParse(value);
}

export type CompletionIssue = { path: string; message: string };

const CARDINALITY_WORDS: Record<string, number> = {
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

function getExplicitCardinality(text: string): { minimum: number; exact: boolean } | undefined {
  const severalMatch = text.match(/\b(varios|varias)\s+[a-záéíóúñ]+s\b/i);
  if (severalMatch) return { minimum: 2, exact: false };
  const match = text.match(/\b(\d+|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+[a-záéíóúñ]+s\b/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  return {
    minimum: Number.isNaN(value) ? CARDINALITY_WORDS[match[1].toLowerCase()] : value,
    exact: true,
  };
}

function hasSufficientRepeatableGroup(fields: ActionCaptureField[], requirement: { minimum: number; exact: boolean }): boolean {
  return fields.some((field) =>
    field.type === "repeatable_group" &&
    (field.min_items ?? 0) >= requirement.minimum &&
    (requirement.exact ? field.max_items === requirement.minimum : field.max_items === undefined || field.max_items >= requirement.minimum),
  );
}

export function validateActionCaptureSemantics(
  action: Pick<{ action: string; success_metric: string; expected_result: string }, "action" | "success_metric" | "expected_result">,
  captureSchema: ActionCapture,
): { success: true } | { success: false; message: string } {
  const minimum = getExplicitCardinality(
    `${action.action} ${action.success_metric} ${action.expected_result}`,
  );
  if (minimum === undefined || minimum.minimum < 2) return { success: true };

  if (!hasSufficientRepeatableGroup(captureSchema.fields, minimum)) {
    return {
      success: false,
      message: `La evidencia debe permitir registrar ${minimum.exact ? "exactamente " : "al menos "}${minimum.minimum} elementos mediante un repeatable_group.`,
    };
  }

  return { success: true };
}

export function validateActionCompletion(
  captureSchema: ActionCapture,
  completionData: unknown,
): { success: true } | { success: false; issues: CompletionIssue[] } {
  const issues: CompletionIssue[] = [];
  const values = completionData && typeof completionData === "object" && !Array.isArray(completionData)
    ? completionData as Record<string, unknown>
    : null;

  if (!values) return { success: false, issues: [{ path: "", message: "El resultado debe ser un objeto" }] };

  const validateFields = (fields: ActionCaptureField[], record: Record<string, unknown>, prefix: string) => {
    for (const field of fields) {
      const path = prefix ? `${prefix}.${field.id}` : field.id;
      const value = record[field.id];
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
        if (field.required) issues.push({ path, message: "Este campo es obligatorio" });
        continue;
      }
      if ((field.type === "text" || field.type === "textarea") && (typeof value !== "string" || (field.max_length !== undefined && value.length > field.max_length))) {
        issues.push({ path, message: "El texto no tiene un formato válido" });
      } else if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))) {
        issues.push({ path, message: "El número está fuera del rango permitido" });
      } else if (field.type === "single_select" && (typeof value !== "string" || !field.options.some((option) => option.value === value))) {
        issues.push({ path, message: "Selecciona una opción válida" });
      } else if (field.type === "multi_select" && (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !field.options.some((option) => option.value === item)) || (field.min_items !== undefined && value.length < field.min_items) || (field.max_items !== undefined && value.length > field.max_items))) {
        issues.push({ path, message: "Selecciona una cantidad válida de opciones" });
      } else if (field.type === "repeatable_group" && (!Array.isArray(value) || (field.min_items !== undefined && value.length < field.min_items) || (field.max_items !== undefined && value.length > field.max_items))) {
        issues.push({ path, message: "Agrega una cantidad válida de elementos" });
      } else if (field.type === "repeatable_group" && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            issues.push({ path: `${path}.${index}`, message: "El elemento no tiene un formato válido" });
          } else {
            validateFields(field.fields, item as Record<string, unknown>, `${path}.${index}`);
          }
        });
      }
    }
  };
  validateFields(captureSchema.fields, values, "");
  return issues.length > 0 ? { success: false, issues } : { success: true };
}
