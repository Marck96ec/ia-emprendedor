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

export type ActionCompletionFormState = {
  status: "idle" | "error";
  message?: string;
  issues?: CompletionIssue[];
};

/*
 * Reglas compartidas con validate_action_completion_data en
 * supabase/migrations/20261103120000_harden_action_evidence_completion.sql.
 * tests/fixtures/action-completion-cases.json verifica que coincidan.
 */
export const MAX_TEXT_LENGTH = 500;
export const MAX_TEXTAREA_LENGTH = 2000;
export const MAX_COMPLETION_DATA_BYTES = 262144;
export const PROPORTIONAL_SAMPLE_MIN_ITEMS = 3;

export const COMPLETION_MESSAGES = {
  object: "El resultado debe ser un objeto",
  tooLarge: "El resultado supera el tamaño permitido",
  required: "Este campo es obligatorio",
  unknown: "Este campo no forma parte de la evidencia solicitada",
  text: "El texto no tiene un formato válido o supera el límite",
  number: "El número está fuera del rango permitido",
  singleSelect: "Selecciona una opción válida",
  multiSelect: "Selecciona una cantidad válida de opciones",
  group: "Agrega una cantidad válida de elementos",
  item: "El elemento no tiene un formato válido",
} as const;

type CountRequirement = { minimum: number; exact: boolean };

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
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  treinta: 30,
  cincuenta: 50,
  cien: 100,
};

/*
 * Unidades de tiempo, dinero o medida: "48 horas" o "100 dólares" no son
 * registros que el empresario deba capturar uno por uno.
 */
const NON_COUNTABLE_UNITS = new Set([
  "segundos", "minutos", "horas", "días", "dias", "jornadas", "semanas", "meses", "años", "anos",
  "dólares", "dolares", "pesos", "euros", "soles", "bolívares", "bolivares", "quetzales", "colones",
  "lempiras", "córdobas", "cordobas", "reales", "guaraníes", "guaranies", "centavos", "céntimos", "centimos",
  "puntos", "kilómetros", "kilometros", "metros", "centímetros", "centimetros", "kilos", "kilogramos",
  "gramos", "libras", "litros", "mililitros", "megas", "gigas",
]);

const QUANTITY_PATTERN = new RegExp(
  "(?:^|[^\\p{L}\\d])" +
    "(?:(al menos|como mínimo|como minimo|mínimo|minimo|más de|mas de|hasta|máximo|maximo|exactamente)\\s+)?" +
    `(\\d+|${Object.keys(CARDINALITY_WORDS).join("|")}|varios|varias)` +
    "\\s+(\\p{L}+s)(?![\\p{L}\\d])",
  "giu",
);

export function getCountRequirements(text: string): CountRequirement[] {
  const requirements: CountRequirement[] = [];
  for (const match of text.matchAll(QUANTITY_PATTERN)) {
    const qualifier = match[1]?.toLowerCase();
    const quantity = match[2].toLowerCase();
    const unit = match[3].toLowerCase();
    if (NON_COUNTABLE_UNITS.has(unit) || qualifier === "hasta" || qualifier === "máximo" || qualifier === "maximo") {
      continue;
    }

    if (quantity === "varios" || quantity === "varias") {
      requirements.push({ minimum: 2, exact: false });
      continue;
    }

    const parsed = /^\d+$/.test(quantity) ? Number(quantity) : CARDINALITY_WORDS[quantity];
    const minimum = qualifier === "más de" || qualifier === "mas de" ? parsed + 1 : parsed;
    requirements.push({ minimum, exact: qualifier === undefined || qualifier === "exactamente" });
  }
  return requirements.filter((requirement) => requirement.minimum >= 2);
}

function hasSufficientRepeatableGroup(fields: ActionCaptureField[], requirement: CountRequirement): boolean {
  return fields.some((field) =>
    field.type === "repeatable_group" &&
    field.required &&
    (field.min_items ?? 0) >= requirement.minimum &&
    (requirement.exact ? field.max_items === requirement.minimum : field.max_items === undefined || field.max_items >= requirement.minimum),
  );
}

/*
 * Más de MAX_REPEATABLE_ITEMS registros no caben en un formulario razonable:
 * la cantidad se demuestra con un número obligatorio cuyo mínimo es la meta,
 * y los resultados con una muestra representativa de elementos.
 */
function hasProportionalCapture(fields: ActionCaptureField[], requirement: CountRequirement): boolean {
  const hasCount = fields.some((field) =>
    field.type === "number" && field.required && field.min !== undefined && field.min >= requirement.minimum,
  );
  const hasSample = fields.some((field) =>
    field.type === "repeatable_group" && field.required && (field.min_items ?? 0) >= PROPORTIONAL_SAMPLE_MIN_ITEMS,
  );
  return hasCount && hasSample;
}

export function validateActionCaptureSemantics(
  action: Pick<{ action: string; success_metric: string; expected_result: string }, "action" | "success_metric" | "expected_result">,
  captureSchema: ActionCapture,
): { success: true } | { success: false; message: string } {
  const requirements = getCountRequirements(
    `${action.action}\n${action.success_metric}\n${action.expected_result}`,
  );

  for (const requirement of requirements) {
    if (requirement.minimum > MAX_REPEATABLE_ITEMS) {
      if (!hasProportionalCapture(captureSchema.fields, requirement)) {
        return {
          success: false,
          message: `La evidencia debe incluir un campo number obligatorio con min >= ${requirement.minimum} para la cantidad y un repeatable_group obligatorio con min_items >= ${PROPORTIONAL_SAMPLE_MIN_ITEMS} para la muestra de resultados.`,
        };
      }
      continue;
    }

    if (!hasSufficientRepeatableGroup(captureSchema.fields, requirement)) {
      return {
        success: false,
        message: `La evidencia debe permitir registrar ${requirement.exact ? "exactamente " : "al menos "}${requirement.minimum} elementos mediante un repeatable_group obligatorio.`,
      };
    }
  }

  return { success: true };
}

function isBlankCompletionValue(value: unknown): boolean {
  return value === undefined ||
    value === null ||
    (typeof value === "string" && /^[ \t\n\r\f\v]*$/.test(value)) ||
    (Array.isArray(value) && value.length === 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getTextLimit(field: Extract<ActionCaptureField, { type: "text" | "textarea" }>): number {
  return field.max_length ?? (field.type === "text" ? MAX_TEXT_LENGTH : MAX_TEXTAREA_LENGTH);
}

/*
 * Prepara lo que captura el formulario: recorta textos y quita valores vacíos.
 * Las claves que no pertenecen al esquema se conservan para que la validación
 * las rechace en lugar de ocultar un envío manipulado.
 */
export function normalizeCompletionData(
  captureSchema: ActionCapture,
  completionData: unknown,
): unknown {
  const normalizeRecord = (fields: ActionCaptureField[], record: Record<string, unknown>) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, rawValue] of Object.entries(record)) {
      const field = fields.find((candidate) => candidate.id === key);
      let value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
      if (field?.type === "repeatable_group" && Array.isArray(value)) {
        value = value.map((item) => isRecord(item) ? normalizeRecord(field.fields, item) : item);
      }
      if (field && isBlankCompletionValue(value)) continue;
      normalized[key] = value;
    }
    return normalized;
  };

  return isRecord(completionData) ? normalizeRecord(captureSchema.fields, completionData) : completionData;
}

export function validateActionCompletion(
  captureSchema: ActionCapture,
  completionData: unknown,
): { success: true } | { success: false; issues: CompletionIssue[] } {
  if (!isRecord(completionData)) {
    return { success: false, issues: [{ path: "", message: COMPLETION_MESSAGES.object }] };
  }
  if (new TextEncoder().encode(JSON.stringify(completionData)).length > MAX_COMPLETION_DATA_BYTES) {
    return { success: false, issues: [{ path: "", message: COMPLETION_MESSAGES.tooLarge }] };
  }

  const issues: CompletionIssue[] = [];
  const validateFields = (fields: ActionCaptureField[], record: Record<string, unknown>, prefix: string) => {
    const join = (key: string | number) => prefix ? `${prefix}.${key}` : String(key);
    for (const field of fields) {
      const path = join(field.id);
      const value = record[field.id];
      if (isBlankCompletionValue(value)) {
        if (field.required) issues.push({ path, message: COMPLETION_MESSAGES.required });
        continue;
      }

      if (field.type === "text" || field.type === "textarea") {
        if (typeof value !== "string" || [...value].length > getTextLimit(field)) {
          issues.push({ path, message: COMPLETION_MESSAGES.text });
        }
      } else if (field.type === "number") {
        if (typeof value !== "number" || !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) {
          issues.push({ path, message: COMPLETION_MESSAGES.number });
        }
      } else if (field.type === "single_select") {
        if (typeof value !== "string" || !field.options.some((option) => option.value === value)) {
          issues.push({ path, message: COMPLETION_MESSAGES.singleSelect });
        }
      } else if (field.type === "multi_select") {
        if (
          !Array.isArray(value) ||
          value.some((item) => typeof item !== "string" || !field.options.some((option) => option.value === item)) ||
          new Set(value).size !== value.length ||
          (field.min_items !== undefined && value.length < field.min_items) ||
          (field.max_items !== undefined && value.length > field.max_items)
        ) {
          issues.push({ path, message: COMPLETION_MESSAGES.multiSelect });
        }
      } else if (
        !Array.isArray(value) ||
        (field.min_items !== undefined && value.length < field.min_items) ||
        (field.max_items !== undefined && value.length > field.max_items)
      ) {
        issues.push({ path, message: COMPLETION_MESSAGES.group });
      } else {
        value.forEach((item, index) => {
          if (isRecord(item)) {
            validateFields(field.fields, item, `${path}.${index}`);
          } else {
            issues.push({ path: `${path}.${index}`, message: COMPLETION_MESSAGES.item });
          }
        });
      }
    }

    for (const key of Object.keys(record)) {
      if (!fields.some((field) => field.id === key)) {
        issues.push({ path: join(key), message: COMPLETION_MESSAGES.unknown });
      }
    }
  };

  validateFields(captureSchema.fields, completionData, "");
  return issues.length > 0 ? { success: false, issues } : { success: true };
}
