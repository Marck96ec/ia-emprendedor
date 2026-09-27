"use client";

import { useFormStatus } from "react-dom";

type PlanGenerationSubmitProps = {
  label: string;
  className?: string;
};

export function PlanGenerationSubmit({
  label,
  className = "primary-button px-5 py-3",
}: PlanGenerationSubmitProps) {
  const { pending } = useFormStatus();

  return (
    <div aria-busy={pending}>
      <button
        type="submit"
        className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
        disabled={pending}
      >
        {pending ? "Generando..." : label}
      </button>

      {pending && (
        <p
          className="mt-3 text-sm text-slate-600"
          role="status"
          aria-live="polite"
        >
          Estamos iniciando la generación de tu plan...
        </p>
      )}
    </div>
  );
}