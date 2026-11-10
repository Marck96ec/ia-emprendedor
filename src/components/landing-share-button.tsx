"use client";

import { useEffect, useRef, useState } from "react";

import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";

type ShareStatus = "idle" | "copied" | "error";

type LandingShareButtonProps = {
  className?: string;
};

/*
 * Compartir discreto: Web Share API cuando el dispositivo la soporta;
 * si no, copia el enlace canónico y confirma por aria-live.
 * Nunca comparte parámetros de la URL actual ni datos de la sesión.
 */
export function LandingShareButton({ className = "" }: LandingShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const announce = (next: ShareStatus) => {
    setStatus(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 4000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      announce("copied");
    } catch {
      announce("error");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: SITE_NAME,
          text: `${SITE_NAME} — ${SITE_TAGLINE}`,
          url: SITE_URL,
        });
      } catch (error) {
        // El usuario canceló el diálogo nativo: no es un error.
        if (error instanceof DOMException && error.name === "AbortError") return;
        await copyLink();
      }
      return;
    }

    await copyLink();
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleShare}
        className="ghost-button inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold"
        aria-label={`Compartir ${SITE_NAME}`}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        <span className="hidden sm:inline">Compartir</span>
      </button>
      <span role="status" aria-live="polite" className="text-sm font-medium text-emerald-700">
        {status === "copied" ? "Enlace copiado" : null}
        {status === "error" ? "No se pudo copiar el enlace" : null}
      </span>
    </span>
  );
}
