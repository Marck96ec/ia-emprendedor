"use client";

import { useState } from "react";

import type { ActionCapture, ActionCaptureField } from "@/lib/action-capture";

type DynamicActionCompletionFormProps = {
  captureSchema: ActionCapture;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  readOnly?: boolean;
};

function FieldRenderer({
  field,
  value,
  onChange,
  path,
  readOnly,
}: {
  field: ActionCaptureField;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string;
  readOnly: boolean;
}) {
  const describedBy = field.description ? `${path}-description` : undefined;
  const common = {
    id: path,
    disabled: readOnly,
    "aria-describedby": describedBy,
    className: "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900",
  };

  if (field.type === "textarea") {
    return <textarea {...common} rows={4} placeholder={field.placeholder} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === "text") {
    return <input {...common} type="text" maxLength={field.max_length} placeholder={field.placeholder} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === "number") {
    return <input {...common} type="number" min={field.min} max={field.max} value={value === undefined ? "" : String(value)} onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))} />;
  }
  if (field.type === "single_select") {
    return (
      <select {...common} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecciona una opción</option>
        {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }
  if (field.type === "multi_select") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="mt-2 space-y-2">
        {field.options.map((option) => (
          <label key={option.value} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
            <input type="checkbox" disabled={readOnly} checked={selected.includes(option.value)} onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} />
            {option.label}
          </label>
        ))}
      </div>
    );
  }
  const items = Array.isArray(value) ? value as Record<string, unknown>[] : [];
  const exactCount = field.min_items !== undefined && field.max_items === field.min_items
    ? field.min_items
    : undefined;
  return (
    <div className="mt-2 space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {field.label} {exactCount ? `${index + 1} de ${exactCount}` : index + 1}
          </p>
          {field.fields.map((child) => (
            <FieldRenderer key={child.id} field={child} value={item[child.id]} path={`${path}.${index}.${child.id}`} readOnly={readOnly} onChange={(next) => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, [child.id]: next } : current))} />
          ))}
          {!readOnly && (field.min_items === undefined || items.length > field.min_items) && <button type="button" className="mt-3 text-sm font-medium text-red-700 underline" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Quitar elemento</button>}
        </div>
      ))}
      {!readOnly && (!field.max_items || items.length < field.max_items) && (
        <button type="button" className="ghost-button min-h-11 px-3 text-sm" onClick={() => onChange([...items, {}])}>Agregar otro</button>
      )}
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
  initialData = {},
  onSubmit,
  onCancel,
  readOnly = false,
}: DynamicActionCompletionFormProps) {
  const [data, setData] = useState<Record<string, unknown>>(() => initializeCaptureData(captureSchema.fields, initialData));

  return (
    <form onSubmit={(event) => { event.preventDefault(); if (!readOnly) onSubmit(data); }} className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold text-slate-950">{captureSchema.title}</h2>
        {captureSchema.description && <p className="mt-1 text-sm leading-5 text-slate-600">{captureSchema.description}</p>}
      </header>
      {captureSchema.fields.map((field) => (
        <div key={field.id}>
          <label htmlFor={field.type === "repeatable_group" ? undefined : field.id} className="text-sm font-semibold text-slate-900">
            {field.label}{field.required && <span className="text-blue-700"> *</span>}
          </label>
          {field.description && <p id={`${field.id}-description`} className="mt-1 text-xs leading-5 text-slate-500">{field.description}</p>}
          <FieldRenderer field={field} value={data[field.id]} path={field.id} readOnly={readOnly} onChange={(value) => setData((current) => ({ ...current, [field.id]: value }))} />
        </div>
      ))}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {!readOnly && <button type="button" onClick={onCancel} className="ghost-button min-h-11 px-4 text-sm">Cancelar</button>}
        {!readOnly && <button type="submit" className="accent-button min-h-11 px-4 text-sm">Guardar resultado y completar acción</button>}
        {readOnly && <button type="button" onClick={onCancel} className="secondary-button min-h-11 px-4 text-sm">Cerrar</button>}
      </div>
    </form>
  );
}
