"use client";

import { useId, useState } from "react";

type PasswordFieldProps = {
  name: string;
  id?: string;
  label: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
};

function EyeIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6-9.75-6-9.75-6Z"
      />
      <circle cx="12" cy="12" r="2.5" />
      {crossed && (
        <path
          strokeLinecap="round"
          d="m4 4 16 16"
        />
      )}
    </svg>
  );
}

export function PasswordField({
  name,
  id,
  label,
  autoComplete,
  required = false,
  minLength,
  placeholder,
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={isVisible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="form-field pr-12"
        />

        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[0.875rem] text-slate-500 hover:text-slate-900"
          aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          <EyeIcon crossed={!isVisible} />
        </button>
      </div>
    </div>
  );
}