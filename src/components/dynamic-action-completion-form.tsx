"use client";

import { useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";

import {
  getTextLimit,
  normalizeCompletionData,
  validateActionCompletion,
  type ActionCapture,
  type ActionCaptureField,
  type ActionCompletionFormState,
  type CompletionIssue,
} from "@/lib/action-capture";

export type ActionCompletionAction = (
  state: ActionCompletionFormState,
  formData: FormData,
) => Promise<ActionCompletionFormState>;

type DynamicActionCompletionFormProps = {
  captureSchema: ActionCapture;
  actionId?: string;
  action?: ActionCompletionAction;
  initialData?: Record<string, unknown>;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
  readOnly?: boolean;
  titleId?: string;
};

const INITIAL_STATE: ActionCompletionFormState = { status: "idle" };

async function readOnlyAction(state: ActionCompletionFormState) {
  return state;
}

const controlClassName =
  "mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 aria-[invalid=true]:border-red-600 disabled:bg-slate-50 disabled:text-slate-700 sm:text-sm";

// Los IDs de captura son snake_case, así que "-" no puede colisionar entre rutas.
export function captureFieldDomId(formId: string, path: string) {
  return `${formId}-${path.replaceAll(".", "-")}`;
}

function countHint(verb: "Selecciona" | "Agrega", minimum?: number, maximum?: number) {
  if (minimum !== undefined && maximum !== undefined) {
    return minimum === maximum ? `${verb} exactamente ${minimum}.` : `${verb} entre ${minimum} y ${maximum}.`;
  }
  if (minimum !== undefined && minimum > 0) return `${verb} al menos ${minimum}.`;
  if (maximum !== undefined) return `${verb} hasta ${maximum}.`;
  return undefined;
}

function fieldHint(field: ActionCaptureField): string | undefined {
  if (field.type === "number") {
    if (field.min !== undefined && field.max !== undefined) return `Valor entre ${field.min} y ${field.max}.`;
    if (field.min !== undefined) return `Valor mínimo: ${field.min}.`;
    if (field.max !== undefined) return `Valor máximo: ${field.max}.`;
    return undefined;
  }
  if (field.type === "text" || field.type === "textarea") {
    return field.max_length !== undefined ? `Máximo ${field.max_length} caracteres.` : undefined;
  }
  if (field.type === "multi_select") return countHint("Selecciona", field.min_items, field.max_items);
  if (field.type === "single_select") return undefined;
  return countHint("Agrega", field.min_items, field.max_items);
}

function RequirementMark({ required }: { required: boolean }) {
  return (
    <span className="ml-1 text-xs font-medium text-slate-500">
      {required ? "(obligatorio)" : "(opcional)"}
    </span>
  );
}

type FieldProps = {
  field: ActionCaptureField;
  path: string;
  formId: string;
  value: unknown;
  issues: CompletionIssue[];
  onValueChange: (value: unknown) => void;
  clearIssue: (path: string) => void;
  requestFocus: (domId: string) => void;
};

function CaptureField({ field, path, formId, value, issues, onValueChange, clearIssue, requestFocus }: FieldProps) {
  const onChange = (next: unknown) => {
    onValueChange(next);
    clearIssue(path);
  };
  const id = captureFieldDomId(formId, path);
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const hint = fieldHint(field);
  const issue = issues.find((candidate) => candidate.path === path);
  const describedBy = [
    field.description || hint ? descriptionId : null,
    issue ? errorId : null,
  ].filter(Boolean).join(" ") || undefined;

  const description = (field.description || hint) && (
    <p id={descriptionId} className="mt-1 text-xs leading-5 text-slate-600">
      {field.description}{field.description && hint ? " " : ""}{hint}
    </p>
  );
  const error = issue && (
    <p id={errorId} className="mt-1.5 text-sm font-medium text-red-700">
      {issue.message}
    </p>
  );

  if (field.type === "multi_select") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} className="min-w-0">
        <legend className="text-sm font-semibold text-slate-900">
          {field.label}<RequirementMark required={field.required} />
        </legend>
        {description}
        <div className="mt-2 space-y-2">
          {field.options.map((option) => (
            <label key={option.value} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0"
                checked={selected.includes(option.value)}
                onChange={(event) => onChange(event.target.checked
                  ? [...selected, option.value]
                  : selected.filter((item) => item !== option.value))}
              />
              <span className="min-w-0 break-words">{option.label}</span>
            </label>
          ))}
        </div>
        {error}
      </fieldset>
    );
  }

  if (field.type === "repeatable_group") {
    const items = Array.isArray(value) ? value as Record<string, unknown>[] : [];
    const exactCount = field.min_items !== undefined && field.max_items === field.min_items
      ? field.min_items
      : undefined;
    const canRemove = field.min_items === undefined || items.length > field.min_items;
    const canAdd = field.max_items === undefined || items.length < field.max_items;

    return (
      <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} className="min-w-0">
        <legend className="text-sm font-semibold text-slate-900">
          {field.label}<RequirementMark required={field.required} />
        </legend>
        {description}
        {error}
        <ol className="mt-2 space-y-3">
          {items.map((item, index) => (
            <li key={index}>
              <fieldset className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {field.label} {index + 1}{exactCount ? ` de ${exactCount}` : ""}
                </legend>
                <div className="space-y-4">
                  {field.fields.map((child) => (
                    <CaptureField
                      key={child.id}
                      field={child}
                      path={`${path}.${index}.${child.id}`}
                      formId={formId}
                      value={item[child.id]}
                      issues={issues}
                      onValueChange={(next) => onValueChange(items.map((current, itemIndex) =>
                        itemIndex === index ? { ...current, [child.id]: next } : current))}
                      clearIssue={clearIssue}
                      requestFocus={requestFocus}
                    />
                  ))}
                </div>
                {canRemove && (
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-red-700 underline"
                    onClick={() => {
                      onChange(items.filter((_, itemIndex) => itemIndex !== index));
                      requestFocus(id);
                    }}
                  >
                    Quitar<span className="sr-only"> {field.label} {index + 1}</span>
                  </button>
                )}
              </fieldset>
            </li>
          ))}
        </ol>
        {canAdd && (
          <button
            type="button"
            className="ghost-button mt-3 min-h-11 px-3 text-sm"
            onClick={() => {
              onChange([...items, {}]);
              requestFocus(captureFieldDomId(formId, `${path}.${items.length}.${field.fields[0].id}`));
            }}
          >
            Agregar<span className="sr-only"> {field.label}</span> otro
          </button>
        )}
      </fieldset>
    );
  }

  const controlProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": issue ? true : undefined,
    "aria-required": field.required || undefined,
    className: controlClassName,
  };

  let control;
  if (field.type === "textarea") {
    control = (
      <textarea
        {...controlProps}
        rows={4}
        maxLength={getTextLimit(field)}
        placeholder={field.placeholder}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  } else if (field.type === "text") {
    control = (
      <input
        {...controlProps}
        type="text"
        maxLength={getTextLimit(field)}
        placeholder={field.placeholder}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  } else if (field.type === "number") {
    control = (
      <input
        {...controlProps}
        type="number"
        inputMode="decimal"
        step="any"
        min={field.min}
        max={field.max}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
      />
    );
  } else {
    control = (
      <select {...controlProps} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecciona una opción</option>
        {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-semibold text-slate-900">
        {field.label}<RequirementMark required={field.required} />
      </label>
      {description}
      {control}
      {error}
    </div>
  );
}

function initializeCaptureData(
  fields: ActionCaptureField[],
  initialData: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => {
    const current = initialData[field.id];
    if (field.type !== "repeatable_group") return [field.id, current];
    const items = Array.isArray(current) ? current as Record<string, unknown>[] : [];
    const minimum = field.min_items ?? 0;
    return [
      field.id,
      Array.from({ length: Math.max(items.length, minimum) }, (_, index) =>
        initializeCaptureData(field.fields, items[index] ?? {}),
      ),
    ];
  }).filter(([, value]) => value !== undefined));
}

export function DynamicActionCompletionForm({
  captureSchema,
  actionId,
  action,
  initialData = {},
  onCancel,
  onPendingChange,
  readOnly = false,
  titleId,
}: DynamicActionCompletionFormProps) {
  const formId = useId();
  const fallbackTitleId = useId();
  const headingId = titleId ?? fallbackTitleId;
  const summaryId = `${formId}-summary`;
  const [data, setData] = useState<Record<string, unknown>>(() => initializeCaptureData(captureSchema.fields, initialData));
  const [state, formAction, isPending] = useActionState(action ?? readOnlyAction, INITIAL_STATE);
  const [issues, setIssues] = useState<CompletionIssue[]>([]);
  const [message, setMessage] = useState<string | undefined>();
  const [handledState, setHandledState] = useState(state);
  const focusTargetRef = useRef<string | null>(null);

  // Cada respuesta del servidor reemplaza los errores mostrados sin perder lo escrito.
  if (state !== handledState) {
    setHandledState(state);
    setIssues(state.issues ?? []);
    setMessage(state.message);
  }

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  useEffect(() => {
    const target = focusTargetRef.current;
    if (!target) return;
    focusTargetRef.current = null;
    (document.getElementById(target) ?? document.getElementById(summaryId))?.focus();
  });

  const normalizedData = normalizeCompletionData(captureSchema, data);
  const generalIssues = issues.filter((issue) => issue.path === "");

  function requestFocus(domId: string) {
    focusTargetRef.current = domId;
  }

  function clearIssue(path: string) {
    setIssues((current) => current.filter((issue) => issue.path !== path));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (readOnly || isPending) {
      event.preventDefault();
      return;
    }
    const validation = validateActionCompletion(captureSchema, normalizedData);
    if (!validation.success) {
      event.preventDefault();
      setIssues(validation.issues);
      setMessage("Revisa los campos marcados.");
      requestFocus(captureFieldDomId(formId, validation.issues[0].path));
      return;
    }
    setMessage(undefined);
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={headingId}
      aria-busy={isPending || undefined}
      className="flex min-w-0 flex-col gap-5"
    >
      <input type="hidden" name="action_id" value={actionId ?? ""} />
      <input type="hidden" name="completion_data" value={JSON.stringify(normalizedData)} />
      <header>
        <h2 id={headingId} className="break-words text-xl font-semibold text-slate-950">{captureSchema.title}</h2>
        {captureSchema.description && <p className="mt-1 break-words text-sm leading-5 text-slate-600">{captureSchema.description}</p>}
      </header>

      {(message || issues.length > 0) && (
        <div id={summaryId} role="alert" tabIndex={-1} className="alert-box">
          <p>{message ?? "Revisa los campos marcados."}</p>
          {issues.length > 0 && (
            <p className="mt-1 text-sm">
              {issues.length === 1 ? "Hay 1 campo por corregir." : `Hay ${issues.length} campos por corregir.`}
            </p>
          )}
          {generalIssues.map((issue) => <p key={issue.message} className="mt-1 text-sm">{issue.message}</p>)}
        </div>
      )}

      <fieldset disabled={readOnly || isPending} className="min-w-0 space-y-5">
        <legend className="sr-only">{captureSchema.title}</legend>
        {captureSchema.fields.map((field) => (
          <CaptureField
            key={field.id}
            field={field}
            path={field.id}
            formId={formId}
            value={data[field.id]}
            issues={issues}
            onValueChange={(next) => setData((current) => ({ ...current, [field.id]: next }))}
            clearIssue={clearIssue}
            requestFocus={requestFocus}
          />
        ))}
      </fieldset>

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
        {!readOnly && onCancel && (
          <button type="button" onClick={onCancel} disabled={isPending} className="ghost-button min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">
            Cancelar
          </button>
        )}
        {!readOnly && (
          <button type="submit" disabled={isPending} className="accent-button min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-70">
            {isPending ? "Guardando resultado…" : "Guardar resultado y completar acción"}
          </button>
        )}
        {readOnly && onCancel && (
          <button type="button" onClick={onCancel} className="secondary-button min-h-11 px-4 text-sm">Cerrar</button>
        )}
      </div>
      <p role="status" className="sr-only">{isPending ? "Guardando resultado…" : ""}</p>
    </form>
  );
}
