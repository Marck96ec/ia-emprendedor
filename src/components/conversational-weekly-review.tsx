"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createWeeklyReview, saveWeeklyReviewDraft } from "@/actions/weekly-review";
import {
  HYPOTHESIS_STATUS_LABELS,
  OUTCOME_STATUS_LABELS,
  type WeeklyReviewDraft,
} from "@/lib/weekly-review-types";

type Choice = {
  value: string;
  label: string;
};

type ReviewQuestion = {
  id: keyof WeeklyReviewDraft;
  message: string;
  kind: "choice" | "textarea";
  required: boolean;
  choices?: Choice[];
  placeholder?: string;
  help?: string;
};

type ConversationalWeeklyReviewProps = {
  businessName: string;
  weekNumber: number;
  decisionQuestion: string;
  hypothesis: string;
  introMessage: string;
  evidenceMessage: string | null;
  metricMessage: string;
  initialDraft: WeeklyReviewDraft;
};

const INITIAL_DRAFT: WeeklyReviewDraft = {};
const TYPING_BASE_DELAY_MS = 34;
const TYPING_SPACE_DELAY_MS = 18;
const TYPING_COMMA_DELAY_MS = 120;
const TYPING_SENTENCE_DELAY_MS = 220;

function getTypingDelay(character: string): number {
  if (character === " ") return TYPING_SPACE_DELAY_MS;
  if (/[.!?]/.test(character)) return TYPING_SENTENCE_DELAY_MS;
  if (/[,;:]/.test(character)) return TYPING_COMMA_DELAY_MS;
  return TYPING_BASE_DELAY_MS;
}

function isAnswered(question: ReviewQuestion, value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (!value.trim()) return !question.required;
  return question.kind === "choice" || value.trim().length >= 5;
}

function getAnswerLabel(question: ReviewQuestion, value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "Sin respuesta";
  return question.choices?.find((choice) => choice.value === value)?.label ?? value;
}

function TypedMessage({
  text,
  immediate,
  onComplete,
}: {
  text: string;
  immediate?: boolean;
  onComplete?: () => void;
}) {
  const [content, setContent] = useState(immediate ? text : "");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
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
        <span aria-hidden="true" className="ml-0.5 animate-pulse motion-reduce:animate-none">▍</span>
      )}
    </span>
  );
}

function ThinkingIndicator() {
  return (
    <div className="inline-flex items-center gap-1" role="status" aria-label="TUCEO IA está preparando la siguiente pregunta">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 motion-reduce:animate-none [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 motion-reduce:animate-none [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 motion-reduce:animate-none" />
    </div>
  );
}

export function ConversationalWeeklyReview({
  businessName,
  weekNumber,
  decisionQuestion,
  hypothesis,
  introMessage,
  evidenceMessage,
  metricMessage,
  initialDraft,
}: ConversationalWeeklyReviewProps) {
  const questions = useMemo<ReviewQuestion[]>(() => [
    {
      id: "outcome_status",
      message: "¿Cómo le fue a tu negocio con lo que hiciste esta semana?",
      kind: "choice",
      required: true,
      choices: Object.entries(OUTCOME_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      id: "observed_result",
      message: "¿Qué resultado concreto observaste en tu negocio?",
      kind: "textarea",
      required: true,
      placeholder: "Cuéntame qué ocurrió, aunque el resultado haya sido pequeño o diferente a la meta.",
    },
    {
      id: "hypothesis_status",
      message: "¿Qué nos dicen los resultados sobre la decisión que tomamos?",
      kind: "choice",
      required: true,
      help: decisionQuestion,
      choices: Object.entries(HYPOTHESIS_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      id: "evidence",
      message: "¿Qué evidencia concreta apareció esta semana?",
      kind: "textarea",
      required: true,
      help: evidenceMessage ?? undefined,
      placeholder: "Describe hechos observables. Si no apareció evidencia nueva, dilo claramente.",
    },
    {
      id: "learning",
      message: "¿Qué harías diferente la próxima semana con lo que descubriste?",
      kind: "textarea",
      required: true,
      placeholder: "Escribe el aprendizaje, incluso si todavía necesitamos más información.",
    },
    {
      id: "next_week_focus",
      message: "¿Hay algo en lo que quieras enfocarte la próxima semana?",
      kind: "textarea",
      required: false,
      placeholder: "Opcional. Puedes dejarlo vacío si prefieres que el siguiente plan lo defina el diagnóstico.",
    },
  ], [decisionQuestion, evidenceMessage]);

  const [answers, setAnswers] = useState<WeeklyReviewDraft>({
    ...INITIAL_DRAFT,
    ...initialDraft,
  });
  const [activeIndex, setActiveIndex] = useState(() => {
    const firstIncomplete = questions.findIndex((question) =>
      question.required && !isAnswered(question, initialDraft[question.id]),
    );
    return firstIncomplete === -1 ? questions.length : Math.max(firstIncomplete, 0);
  });
  const [questionVisible, setQuestionVisible] = useState(true);
  const [questionComplete, setQuestionComplete] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initialDraft && Object.keys(initialDraft).length > 0 ? "saved" : "idle",
  );
  const draftSaveRef = useRef<Promise<unknown> | null>(null);
  const thinkingTimerRef = useRef<number | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activeIndex, questionVisible, reducedMotion]);

  useEffect(() => () => {
    if (thinkingTimerRef.current !== null) window.clearTimeout(thinkingTimerRef.current);
  }, []);

  function queueDraftSave(nextAnswers: WeeklyReviewDraft) {
    setDraftStatus("saving");
    const previousSave = draftSaveRef.current ?? Promise.resolve();
    const save = previousSave
      .catch(() => undefined)
      .then(() => saveWeeklyReviewDraft(nextAnswers));
    draftSaveRef.current = save;
    void save.then((result) => {
      if (result.success) {
        setDraftStatus("saved");
      } else {
        setDraftStatus("error");
      }
    }).catch(() => {
      setDraftStatus("error");
    });
  }

  function updateAnswer(id: keyof WeeklyReviewDraft, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function beginThinking(nextIndex: number) {
    setThinking(true);
    setQuestionVisible(false);
    setQuestionComplete(false);
    const delay = reducedMotion ? 0 : 240;
    thinkingTimerRef.current = window.setTimeout(() => {
      setThinking(false);
      setActiveIndex(nextIndex);
      setQuestionVisible(true);
    }, delay);
  }

  function continueToNext() {
    const question = questions[activeIndex];
    if (!question) return;
    const value = answers[question.id];
    if (!isAnswered(question, value)) return;
    queueDraftSave(answers);
    beginThinking(Math.min(activeIndex + 1, questions.length));
  }

  function goBack() {
    if (activeIndex === 0) return;
    if (thinkingTimerRef.current !== null) window.clearTimeout(thinkingTimerRef.current);
    setThinking(false);
    setQuestionVisible(true);
    setQuestionComplete(false);
    setActiveIndex((current) => Math.max(0, current - 1));
  }

  function editQuestion(index: number) {
    setQuestionVisible(true);
    setThinking(false);
    setQuestionComplete(false);
    setActiveIndex(index);
  }

  const currentQuestion = questions[activeIndex];
  const handleQuestionComplete = useCallback(() => {
    setQuestionComplete(true);
  }, []);
  const isSummary = activeIndex >= questions.length;
  const progress = isSummary ? 100 : Math.round(((activeIndex + 1) / questions.length) * 100);
  const currentValue = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentValid = currentQuestion ? isAnswered(currentQuestion, currentValue) : true;

  return (
    <main className="ambient-shell min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <section className="surface-card overflow-hidden rounded-[2rem]">
          <header className="border-b border-slate-200/80 bg-white/70 px-5 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <p className="badge-chip">TUCEO IA</p>
              <span className="text-sm font-medium text-slate-600">Semana {weekNumber}</span>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
              <span>{isSummary ? "Resumen listo" : `Paso ${activeIndex + 1} de ${questions.length}`}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </header>

          <div className="thin-scroll max-h-[calc(100dvh-14rem)] space-y-5 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">T</div>
              <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
                <TypedMessage text={`Hola. Soy TUCEO IA y vamos a convertir la semana de ${businessName} en una decisión más clara.`} immediate />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">T</div>
              <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
                <TypedMessage text={introMessage} immediate />
              </div>
            </div>

            {hypothesis && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-950">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">La decisión que probamos</p>
                <p className="mt-1 font-medium">{hypothesis}</p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Qué cambió en tu negocio</p>
              <p className="mt-1">{metricMessage}</p>
            </div>

            {questions.slice(0, activeIndex).map((question, index) => (
              <div key={question.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">T</div>
                  <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
                    <TypedMessage text={question.message} immediate />
                  </div>
                </div>
                <div className="ml-12 flex justify-end">
                  <button type="button" className="max-w-[90%] rounded-2xl rounded-tr-md bg-blue-600 px-4 py-3 text-left text-sm leading-6 text-white hover:bg-blue-700" onClick={() => editQuestion(index)}>
                    {getAnswerLabel(question, answers[question.id])}
                    <span className="mt-1 block text-xs text-blue-100 underline underline-offset-2">Editar respuesta</span>
                  </button>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex items-start gap-3" aria-live="polite">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">T</div>
                <div className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-4">
                  <ThinkingIndicator />
                </div>
              </div>
            )}

            {!thinking && questionVisible && currentQuestion && (
              <div ref={scrollAnchorRef} className="flex items-start gap-3" aria-live="polite">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden="true">T</div>
                <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
                  <TypedMessage
                    key={currentQuestion.id}
                    text={currentQuestion.message}
                    onComplete={handleQuestionComplete}
                  />
                  {currentQuestion.help && questionComplete && <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-5 text-slate-600">{currentQuestion.help}</p>}
                </div>
              </div>
            )}

            {!thinking && questionVisible && questionComplete && currentQuestion && (
              <div className="ml-12 space-y-3">
                {currentQuestion.kind === "choice" && (
                  <fieldset className="space-y-2">
                    <legend className="sr-only">{currentQuestion.message}</legend>
                    {currentQuestion.choices?.map((choice) => (
                      <label key={choice.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${currentValue === choice.value ? "border-blue-600 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"}`}>
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={choice.value}
                          checked={currentValue === choice.value}
                          onChange={(event) => updateAnswer(currentQuestion.id, event.target.value)}
                          className="h-4 w-4"
                        />
                        <span>{choice.label}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
                {currentQuestion.kind === "textarea" && (
                  <textarea
                    className="form-field min-h-32 resize-y"
                    value={String(currentValue ?? "")}
                    onChange={(event) => updateAnswer(currentQuestion.id, event.target.value)}
                    placeholder={currentQuestion.placeholder}
                    aria-label={currentQuestion.message}
                    minLength={currentQuestion.required ? 5 : undefined}
                    maxLength={currentQuestion.id === "next_week_focus" ? 1000 : 2000}
                    autoFocus
                  />
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" className="ghost-button min-h-11 px-3 text-sm" onClick={goBack} disabled={activeIndex === 0}>Atrás</button>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {!currentQuestion.required && (
                      <button type="button" className="secondary-button min-h-11 px-3 text-sm" onClick={continueToNext}>Omitir</button>
                    )}
                    <button type="button" className="primary-button min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50" onClick={continueToNext} disabled={!currentValid || draftStatus === "saving"}>
                      {draftStatus === "saving" ? "Guardando…" : "Continuar"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500" role="status">
                  {draftStatus === "saved" && "Borrador guardado de forma segura."}
                  {draftStatus === "error" && "No se pudo guardar el borrador; tus respuestas siguen en pantalla."}
                </p>
              </div>
            )}

            {!thinking && isSummary && (
              <div ref={scrollAnchorRef} className="ml-12 space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-sm font-semibold text-blue-950">Resumen editable de tu semana</p>
                  <p className="mt-1 text-sm leading-5 text-blue-900/80">Confirma que esto representa lo que ocurrió. Todavía no hemos cerrado la semana.</p>
                </div>
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{question.id === "next_week_focus" ? "Siguiente foco" : question.message}</p>
                          <p className="mt-1 text-sm leading-5 text-slate-800">{getAnswerLabel(question, answers[question.id])}</p>
                        </div>
                        <button type="button" className="shrink-0 text-sm font-semibold text-slate-700 underline underline-offset-4" onClick={() => editQuestion(index)}>Editar</button>
                      </div>
                    </div>
                  ))}
                </div>
                <form action={createWeeklyReview} className="space-y-3">
                  {Object.entries(answers).map(([key, value]) => (
                    <input key={key} type="hidden" name={key} value={String(value ?? "")} />
                  ))}
                  <button type="submit" className="primary-button w-full">Confirmar y guardar aprendizajes</button>
                  <Link href="/dashboard" className="secondary-button w-full">Salir sin guardar</Link>
                  <p className="text-center text-xs leading-5 text-slate-500">Al confirmar, la revisión queda registrada como historial y ya no se puede editar.</p>
                </form>
              </div>
            )}
            <div ref={scrollAnchorRef} aria-hidden="true" />
          </div>
        </section>
      </div>
    </main>
  );
}
