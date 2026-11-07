"use client";

import Link from "next/link";
import {
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFormStatus } from "react-dom";

import { login, type LoginFormState } from "@/actions/auth";
import { PasswordField } from "@/components/password-field";

type LoginAction = (
  state: LoginFormState,
  formData: FormData,
) => Promise<LoginFormState>;

type ProgressiveLoginFormProps = {
  initialError?: string;
  initialMessage?: string;
  action?: LoginAction;
};

function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function ProgressiveLoginForm({
  initialError = "",
  initialMessage = "",
  action = login,
}: ProgressiveLoginFormProps) {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [stepError, setStepError] = useState("");
  const [dismissedServerError, setDismissedServerError] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [actionState, formAction] = useActionState(action, {
    error: initialError,
  });

  const serverError =
    step === "password" && !dismissedServerError
      ? actionState.error
      : step === "email"
        ? initialError
        : undefined;
  const error = stepError || serverError;

  function continueToPassword() {
    const input = emailInputRef.current;
    const normalizedEmail = email.trim().toLowerCase();

    if (!input || !normalizedEmail || !input.checkValidity()) {
      setStepError("Ingresa un correo electrónico válido.");
      return;
    }

    setEmail(normalizedEmail);
    setStepError("");
    setDismissedServerError(true);
    setStep("password");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (step === "email") {
      event.preventDefault();
      continueToPassword();
      return;
    }

    setStepError("");
    setDismissedServerError(false);
  }

  function editEmail() {
    setStep("email");
    setStepError("");
    setDismissedServerError(true);
  }

  return (
    <>
      <p className="badge-chip">TUCEO IA</p>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
        {step === "email" ? "Bienvenido a TUCEO IA" : "Ingresa tu contraseña"}
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {step === "email"
          ? "Tu negocio, una decisión clara a la vez."
          : "Continúa donde dejaste tu negocio."}
      </p>

      {error && (
        <div
          className="alert-box mt-6"
          role="alert"
          id="login-error"
          aria-live="polite"
        >
          {error}
        </div>
      )}
      {initialMessage && !error && (
        <div className="success-box mt-6" role="status">
          {initialMessage}
        </div>
      )}

      <form
        action={step === "password" ? formAction : undefined}
        onSubmit={handleSubmit}
        className="mt-6"
      >
        {step === "email" ? (
          <div className="anim-rise">
            <label htmlFor="login-email" className="field-label">
              Correo electrónico
            </label>
            <input
              ref={emailInputRef}
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setStepError("");
              }}
              required
              autoFocus
              autoComplete="username"
              className="form-field"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
            />
            <button type="submit" className="primary-button mt-5 w-full">
              Continuar <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : (
          <div className="anim-rise">
            <input type="hidden" name="email" value={email} />
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-700">
              <span className="min-w-0 truncate">{email}</span>
              <button
                type="button"
                className="shrink-0 font-semibold text-slate-950 underline underline-offset-4"
                onClick={editEmail}
              >
                Editar
              </button>
            </div>

            <PasswordField
              id="login-password"
              name="password"
              label="Contraseña"
              required
              autoFocus
              autoComplete="current-password"
              ariaDescribedBy={error ? "login-error" : undefined}
              ariaInvalid={Boolean(error)}
            />

            <div className="mt-3 text-right">
              <Link href="/forgot-password" className="link-button text-sm">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="mt-5">
              <LoginSubmitButton />
            </div>
          </div>
        )}
      </form>

      {step === "email" && (
        <p className="mt-6 text-center text-sm text-slate-600">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/signup" className="link-button">
            Crear cuenta
          </Link>
        </p>
      )}
    </>
  );
}
