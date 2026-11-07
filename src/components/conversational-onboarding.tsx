"use client";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { OnboardingProgress } from "@/components/onboarding-progress";
import type {
  OnboardingAction,
  OnboardingActionResult,
} from "@/lib/onboarding-action";

type OnboardingMode = "business" | "diagnostic";
type Answers = Record<string, string>;
type QuestionKind = "text" | "textarea" | "number" | "choice";

type Choice = {
  value: string;
  label: string;
};

type Question = {
  id: string;
  fieldIds: readonly string[];
  message: (answers: Answers) => string;
  kind: QuestionKind;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  help?: string;
  choices?: readonly Choice[];
};

type ConversationalOnboardingProps = {
  mode: OnboardingMode;
  action: OnboardingAction;
  businessName?: string;
  error?: string;
};

const TYPING_BASE_DELAY_MS = 30;
const THINKING_DELAY_MS = 240;

function getTypingDelay(character: string): number {
  if (character === " ") return 16;
  if (/[.!?]/.test(character)) return 180;
  if (/[,;:]/.test(character)) return 100;
  return TYPING_BASE_DELAY_MS;
}

function getQuestions(
  mode: OnboardingMode,
  businessName?: string,
): readonly Question[] {
  if (mode === "business") {
    return [
      {
        id: "name",
        fieldIds: ["name"],
        message: () => "Empecemos por lo más importante. ¿Cómo se llama tu negocio?",
        kind: "text",
        required: true,
        minLength: 2,
        maxLength: 120,
        placeholder: "Ej. Detalles que Hablan",
      },
      {
        id: "description",
        fieldIds: ["description"],
        message: (answers) =>
          `Perfecto. ¿Qué productos o servicios ofrece ${answers.name?.trim() || "tu negocio"}?`,
        kind: "textarea",
        required: true,
        minLength: 10,
        maxLength: 1500,
        placeholder: "Cuéntame qué haces y a quién ayudas.",
        help: "No necesitas utilizar palabras técnicas.",
      },
      {
        id: "revenue_model",
        fieldIds: ["revenue_model"],
        message: () => "Entendido. Ahora cuéntame, ¿cómo gana dinero tu negocio?",
        kind: "textarea",
        required: true,
        minLength: 10,
        maxLength: 1000,
        placeholder: "Por ejemplo: venta de productos, servicios, suscripciones, comisiones o contratos.",
      },
    ];
  }

  return [
    {
      id: "business_stage",
      fieldIds: ["business_stage"],
      message: () =>
        `Gracias por contarme sobre ${businessName || "tu negocio"}. ¿En qué etapa se encuentra ahora?`,
      kind: "choice",
      required: true,
      choices: [
        { value: "starting", label: "Estoy empezando" },
        { value: "operating", label: "Funciona de forma estable" },
        { value: "growing", label: "Está creciendo" },
        { value: "stalled", label: "Está estancado o tiene dificultades" },
      ],
    },
    {
      id: "team_size",
      fieldIds: ["team_size"],
      message: () => "¿Cuántas personas forman parte de tu equipo?",
      kind: "number",
      required: true,
      min: 1,
      max: 10000,
      placeholder: "Ej. 2",
    },
    {
      id: "owner_hours_per_week",
      fieldIds: ["owner_hours_per_week"],
      message: () =>
        "¿Cuántas horas por semana puedes dedicar realmente a decisiones y mejoras del negocio?",
      kind: "number",
      required: true,
      min: 0,
      max: 168,
      placeholder: "Ej. 5",
      help: "Es una estimación: incluye solo tiempo que puedas sostener.",
    },
    {
      id: "main_challenge",
      fieldIds: ["main_challenge"],
      message: () => "¿Cuál es el principal problema que tienes hoy?",
      kind: "textarea",
      required: true,
      minLength: 10,
      maxLength: 1000,
      placeholder: "Ej. Tenemos ventas, pero no son constantes y no sé qué canal priorizar.",
    },
    {
      id: "primary_goal",
      fieldIds: ["primary_goal"],
      message: () => "¿Qué te gustaría lograr en los próximos 3 meses?",
      kind: "textarea",
      required: true,
      minLength: 10,
      maxLength: 1000,
      placeholder: "Ej. Aumentar las ventas mensuales y conseguir clientes recurrentes.",
    },
    {
      id: "customers_description",
      fieldIds: ["customers_description"],
      message: () => "¿Quiénes son tus principales clientes?",
      kind: "textarea",
      required: true,
      minLength: 10,
      maxLength: 1000,
      placeholder: "Ej. Familias y trabajadores de la zona que compran productos todos los días.",
    },
    {
      id: "sales_process",
      fieldIds: ["sales_process"],
      message: () => "Resume cómo consigues clientes y realizas ventas hoy.",
      kind: "textarea",
      required: true,
      minLength: 10,
      maxLength: 1500,
      placeholder: "Ej. Llegan por recomendaciones e Instagram; luego cotizo por WhatsApp y doy seguimiento.",
    },
    {
      id: "owner_responsibilities",
      fieldIds: ["owner_responsibilities"],
      message: () => "¿Qué funciones principales realizas personalmente hoy?",
      kind: "textarea",
      required: true,
      minLength: 10,
      maxLength: 1500,
      placeholder: "Ej. Vendo, atiendo clientes, coordino al equipo y reviso las finanzas.",
    },
    {
      id: "monthly_revenue",
      fieldIds: ["monthly_revenue"],
      message: () =>
        "¿Cuál ha sido la facturación mensual promedio de tu empresa durante los últimos 3 meses?",
      kind: "number",
      required: true,
      min: 0,
      step: "0.01",
      placeholder: "Ej. 5000",
      help: "Indica los ingresos antes de gastos e impuestos. Puedes usar un valor aproximado.",
    },
    {
      id: "currency_code",
      fieldIds: ["currency_code"],
      message: () => "¿En qué moneda quieres registrar esa facturación?",
      kind: "choice",
      required: true,
      choices: [
        { value: "USD", label: "USD · Dólar estadounidense" },
        { value: "EUR", label: "EUR · Euro" },
        { value: "COP", label: "COP · Peso colombiano" },
        { value: "MXN", label: "MXN · Peso mexicano" },
        { value: "PEN", label: "PEN · Sol peruano" },
        { value: "CLP", label: "CLP · Peso chileno" },
        { value: "ARS", label: "ARS · Peso argentino" },
      ],
    },
  ];
}

function getAnswerLabel(question: Question, value: string | undefined) {
  if (!value?.trim()) return "Sin respuesta";
  return question.choices?.find((choice) => choice.value === value)?.label ?? value;
}

function isQuestionAnswered(question: Question, answers: Answers) {
  return question.fieldIds.every((fieldId) => {
    const value = answers[fieldId]?.trim() ?? "";
    if (!value) return !question.required;

    if (question.kind === "number") {
      const numericValue = Number(value);
      return (
        Number.isFinite(numericValue) &&
        (question.min === undefined || numericValue >= question.min) &&
        (question.max === undefined || numericValue <= question.max)
      );
    }

    return (
      !question.minLength ||
      value.length >= question.minLength
    );
  });
}

function getValidationMessage(question: Question, answers: Answers) {
  if (isQuestionAnswered(question, answers)) return null;
  if (question.kind === "number") {
    return "Escribe un número válido dentro del rango indicado.";
  }
  if (question.kind === "choice") {
    return "Selecciona una opción para continuar.";
  }
  if ((answers[question.id]?.trim().length ?? 0) === 0) {
    return "Completa esta respuesta para continuar.";
  }
  return `La respuesta debe tener al menos ${question.minLength} caracteres.`;
}

function TypedMessage({
  text,
  immediate = false,
  onComplete,
}: {
  text: string;
  immediate?: boolean;
  onComplete?: () => void;
}) {
  const [content, setContent] = useState(immediate ? text : "");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;

    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (immediate || reducedMotion) {
      onComplete?.();
      return;
    }

    let index = 0;
    let timer: number | null = null;
    const typeNextCharacter = () => {
      index += 1;
      setContent(text.slice(0, index));
      if (index >= text.length) {
        onComplete?.();
        return;
      }

      timer = window.setTimeout(
        typeNextCharacter,
        getTypingDelay(text[index - 1] ?? ""),
      );
    };

    timer = window.setTimeout(typeNextCharacter, TYPING_BASE_DELAY_MS);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [immediate, onComplete, reducedMotion, text]);

  const visibleContent = immediate || reducedMotion ? text : content;

  return (
    <span>
      {visibleContent}
      {!immediate && !reducedMotion && visibleContent.length < text.length && (
        <span aria-hidden="true" className="ml-0.5 animate-pulse motion-reduce:animate-none">
          ▍
        </span>
      )}
    </span>
  );
}

function ThinkingIndicator() {
  return (
    <div
      className="inline-flex items-center gap-1"
      role="status"
      aria-label="TUCEO IA está preparando la siguiente pregunta"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 motion-reduce:animate-none"
          style={{ animationDelay: `${index * 100 - 200}ms` }}
        />
      ))}
    </div>
  );
}

function AssistantBubble({
  children,
  live = false,
}: {
  children: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="flex items-start gap-3" aria-live={live ? "polite" : undefined}>
      <div
        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white"
        aria-hidden="true"
      >
        T
      </div>
      <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
        {children}
      </div>
    </div>
  );
}

export function ConversationalOnboarding({
  mode,
  action,
  businessName,
  error,
}: ConversationalOnboardingProps) {
  const questions = useMemo(
    () => getQuestions(mode, businessName),
    [businessName, mode],
  );
  const [answers, setAnswers] = useState<Answers>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [questionComplete, setQuestionComplete] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [submissionState, setSubmissionState] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(
    error ?? null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const thinkingTimerRef = useRef<number | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const answerInputRef = useRef<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;

    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView?.({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activeIndex, reducedMotion, thinking]);

  useEffect(() => {
    if (!thinking && questionComplete) {
      answerInputRef.current?.focus();
    }
  }, [activeIndex, questionComplete, thinking]);

  useEffect(
    () => () => {
      if (thinkingTimerRef.current !== null) {
        window.clearTimeout(thinkingTimerRef.current);
      }
    },
    [],
  );

  const currentQuestion = questions[activeIndex];
  const isSummary = activeIndex >= questions.length;
  const currentValue = currentQuestion
    ? answers[currentQuestion.fieldIds[0]]
    : undefined;
  const handleQuestionComplete = useCallback(() => {
    setQuestionComplete(true);
  }, []);

  function setAnswerInputRef(
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null,
  ) {
    answerInputRef.current = element;
  }

  function updateAnswer(fieldId: string, value: string) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
    setValidationError(null);
    setSubmissionError(null);
  }

  function beginThinking(nextIndex: number) {
    if (thinkingTimerRef.current !== null) {
      window.clearTimeout(thinkingTimerRef.current);
    }

    setThinking(true);
    setQuestionComplete(false);
    thinkingTimerRef.current = window.setTimeout(
      () => {
        setThinking(false);
        setActiveIndex(nextIndex);
      },
      reducedMotion ? 0 : THINKING_DELAY_MS,
    );
  }

  function continueToNext() {
    if (!currentQuestion) return;

    const message = getValidationMessage(currentQuestion, answers);
    if (message) {
      setValidationError(message);
      answerInputRef.current?.focus();
      return;
    }

    beginThinking(Math.min(activeIndex + 1, questions.length));
  }

  function handleAnswerKeyDown(event: KeyboardEvent) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      continueToNext();
    }
  }

  function editQuestion(index: number) {
    if (thinkingTimerRef.current !== null) {
      window.clearTimeout(thinkingTimerRef.current);
    }
    setThinking(false);
    setQuestionComplete(false);
    setValidationError(null);
    setActiveIndex(index);
  }

  function goBack() {
    if (activeIndex === 0) return;
    editQuestion(activeIndex - 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionState === "saving") return;

    setSubmissionError(null);
    setSubmissionState("saving");

    try {
      const result: OnboardingActionResult = await action(
        new FormData(event.currentTarget),
      );
      if (!result.success) {
        setSubmissionError(result.message);
        setSubmissionState("error");
        return;
      }
    } catch (submitError) {
      if (isRedirectError(submitError)) return;

      console.error("ONBOARDING_SAVE_REQUEST_ERROR", submitError);
      setSubmissionError(
        "No pudimos guardar tu información. Tus respuestas siguen en pantalla; inténtalo de nuevo.",
      );
      setSubmissionState("error");
    }
  }

  const progress = isSummary
    ? 100
    : Math.round(((activeIndex + 1) / questions.length) * 100);
  const introMessage =
    mode === "business"
      ? "¡Bienvenido a TUCEO IA! Vamos a conocer tu negocio para preparar recomendaciones adaptadas a lo que realmente necesitas."
      : "Ya conozco la base de tu negocio. Ahora vamos a entender su situación actual y tus objetivos.";

  return (
    <main className="ambient-shell min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <section className="surface-card overflow-hidden rounded-[2rem]">
          <header className="border-b border-slate-200/80 bg-white/70 px-5 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <p className="badge-chip">TUCEO IA</p>
              {businessName && (
                <span className="text-sm font-medium text-slate-600">
                  {businessName}
                </span>
              )}
            </div>
            <div className="mt-5">
              <OnboardingProgress currentStep={mode === "business" ? 1 : 2} />
            </div>
            <div className="flex items-center justify-between gap-4 text-xs font-medium text-slate-500">
              <span>
                {isSummary
                  ? "Resumen listo"
                  : `${mode === "business" ? "Conociendo tu negocio" : "Diagnóstico"} · Pregunta ${activeIndex + 1} de ${questions.length}`}
              </span>
              <span aria-label={`Progreso: ${progress}%`}>{progress}%</span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </header>

          <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
            <AssistantBubble>
              <TypedMessage text={introMessage} immediate />
            </AssistantBubble>

            {questions.slice(0, activeIndex).map((question, index) => (
              <div key={question.id} className="space-y-2">
                <AssistantBubble>
                  <TypedMessage
                    text={question.message(answers)}
                    immediate
                  />
                </AssistantBubble>
                <div className="ml-12 flex justify-end">
                  <button
                    type="button"
                    className="max-w-[90%] rounded-2xl rounded-tr-md bg-blue-600 px-4 py-3 text-left text-sm leading-6 text-white hover:bg-blue-700"
                    onClick={() => editQuestion(index)}
                  >
                    {getAnswerLabel(question, answers[question.fieldIds[0]])}
                    <span className="mt-1 block text-xs text-blue-100 underline underline-offset-2">
                      Editar respuesta
                    </span>
                  </button>
                </div>
              </div>
            ))}

            {thinking && (
              <div ref={scrollAnchorRef}>
                <AssistantBubble live>
                  <ThinkingIndicator />
                </AssistantBubble>
              </div>
            )}

            {!thinking && !isSummary && currentQuestion && (
              <>
                <div ref={scrollAnchorRef}>
                  <AssistantBubble live>
                    <TypedMessage
                      key={currentQuestion.id}
                      text={currentQuestion.message(answers)}
                      onComplete={handleQuestionComplete}
                    />
                    {currentQuestion.help && questionComplete && (
                      <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-5 text-slate-600">
                        {currentQuestion.help}
                      </p>
                    )}
                  </AssistantBubble>
                </div>

                {questionComplete && (
                  <div className="ml-12 space-y-3">
                    <fieldset
                      className="space-y-2"
                      disabled={submissionState === "saving"}
                    >
                      {currentQuestion.kind === "choice" && (
                        <>
                          <legend className="sr-only">
                            {currentQuestion.message(answers)}
                          </legend>
                          {currentQuestion.choices?.map((choice, index) => (
                            <label
                              key={choice.value}
                              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                                currentValue === choice.value
                                  ? "border-blue-600 bg-blue-50 text-blue-950"
                                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                              }`}
                            >
                              <input
                                ref={index === 0 ? setAnswerInputRef : undefined}
                                type="radio"
                                name={currentQuestion.id}
                                value={choice.value}
                                checked={currentValue === choice.value}
                                onChange={(event) =>
                                  updateAnswer(
                                    currentQuestion.fieldIds[0],
                                    event.target.value,
                                  )
                                }
                                className="h-4 w-4"
                              />
                              <span>{choice.label}</span>
                            </label>
                          ))}
                        </>
                      )}
                      {currentQuestion.kind !== "choice" && (
                        <label className="block">
                          <span className="sr-only">
                            {currentQuestion.message(answers)}
                          </span>
                          {currentQuestion.kind === "textarea" ? (
                            <textarea
                              ref={setAnswerInputRef}
                              name={currentQuestion.id}
                              value={currentValue ?? ""}
                              onChange={(event) =>
                                updateAnswer(
                                  currentQuestion.fieldIds[0],
                                  event.target.value,
                                )
                              }
                              onKeyDown={handleAnswerKeyDown}
                              placeholder={currentQuestion.placeholder}
                              minLength={currentQuestion.minLength}
                              maxLength={currentQuestion.maxLength}
                              aria-invalid={Boolean(validationError)}
                              aria-describedby={
                                validationError
                                  ? `${currentQuestion.id}-error`
                                  : undefined
                              }
                              className="form-field min-h-32 resize-y"
                              autoFocus
                            />
                          ) : (
                            <input
                              ref={setAnswerInputRef}
                              name={currentQuestion.id}
                              type={currentQuestion.kind}
                              inputMode={
                                currentQuestion.kind === "number"
                                  ? "decimal"
                                  : undefined
                              }
                              value={currentValue ?? ""}
                              onChange={(event) =>
                                updateAnswer(
                                  currentQuestion.fieldIds[0],
                                  event.target.value,
                                )
                              }
                              onKeyDown={handleAnswerKeyDown}
                              placeholder={currentQuestion.placeholder}
                              min={currentQuestion.min}
                              max={currentQuestion.max}
                              step={currentQuestion.step}
                              minLength={currentQuestion.minLength}
                              maxLength={currentQuestion.maxLength}
                              aria-invalid={Boolean(validationError)}
                              aria-describedby={
                                validationError
                                  ? `${currentQuestion.id}-error`
                                  : undefined
                              }
                              className="form-field"
                              autoFocus
                            />
                          )}
                        </label>
                      )}
                    </fieldset>

                    {validationError && (
                      <p
                        id={`${currentQuestion.id}-error`}
                        className="text-sm text-red-700"
                        role="alert"
                      >
                        {validationError}
                      </p>
                    )}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        className="secondary-button min-h-11 px-4 py-2 text-sm"
                        onClick={goBack}
                        disabled={activeIndex === 0 || submissionState === "saving"}
                      >
                        Atrás
                      </button>
                      <button
                        type="button"
                        className="primary-button min-h-11 px-5 py-2 text-sm"
                        onClick={continueToNext}
                        disabled={submissionState === "saving"}
                      >
                        Continuar
                      </button>
                    </div>
                    <p className="text-xs text-slate-500" role="status">
                      Tus respuestas se conservan mientras avanzas.
                    </p>
                  </div>
                )}
              </>
            )}

            {!thinking && isSummary && (
              <div ref={scrollAnchorRef} className="ml-12 space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-sm font-semibold text-blue-950">
                    Revisa tu información antes de continuar
                  </p>
                  <p className="mt-1 text-sm leading-5 text-blue-900/80">
                    Puedes editar cualquier respuesta. La siguiente etapa solo
                    comenzará cuando guardemos estos datos correctamente.
                  </p>
                </div>

                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                            {question.message(answers)}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-slate-800">
                            {getAnswerLabel(
                              question,
                              answers[question.fieldIds[0]],
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-sm font-semibold text-blue-700 underline underline-offset-2"
                          onClick={() => editQuestion(index)}
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {submissionError && (
                  <div className="alert-box" role="alert">
                    {submissionError}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="space-y-3"
                >
                  {questions.flatMap((question) =>
                    question.fieldIds.map((fieldId) => (
                      <input
                        key={fieldId}
                        type="hidden"
                        name={fieldId}
                        value={answers[fieldId] ?? ""}
                      />
                    )),
                  )}
                  <button
                    type="submit"
                    className="primary-button min-h-12 w-full"
                    disabled={submissionState === "saving"}
                  >
                    {submissionState === "saving"
                      ? "Guardando la información..."
                      : mode === "business"
                        ? "Continuar con mi diagnóstico"
                        : "Preparar mi diagnóstico"}
                  </button>
                </form>
              </div>
            )}

            <div aria-hidden="true" />
          </div>
        </section>
      </div>
    </main>
  );
}
