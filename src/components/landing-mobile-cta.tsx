"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 420;

/*
 * CTA contextual móvil: aparece al salir del hero y se oculta cuando el
 * CTA final está visible, para no duplicar botones ni tapar contenido.
 * Solo se renderiza en pantallas pequeñas (sm:hidden en el contenedor).
 */
export function LandingMobileCta() {
  const [pastHero, setPastHero] = useState(false);
  const [finalCtaVisible, setFinalCtaVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setPastHero(window.scrollY > SHOW_AFTER_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const finalCta = document.getElementById("cta-final");
    let observer: IntersectionObserver | null = null;
    if (finalCta && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          setFinalCtaVisible(entries[0]?.isIntersecting ?? false);
        },
        { threshold: 0.2 },
      );
      observer.observe(finalCta);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  const visible = pastHero && !finalCtaVisible;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 transition-transform duration-200 motion-reduce:transition-none sm:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="surface-card mx-auto flex max-w-md items-center gap-3 rounded-2xl p-2 shadow-[0_12px_32px_rgba(15,23,42,0.22)]">
        <Link
          href="/signup"
          tabIndex={visible ? 0 : -1}
          className="primary-button min-h-12 flex-1 px-4 py-3 text-center text-base"
        >
          Descubrir mi próxima prioridad
        </Link>
      </div>
    </div>
  );
}
