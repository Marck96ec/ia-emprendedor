import Link from "next/link";

import { LandingMobileCta } from "@/components/landing-mobile-cta";
import { LandingShareButton } from "@/components/landing-share-button";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

const problems = [
  {
    title: "Todo parece urgente",
    text: "Ventas, clientes, operación, caja… todo compite por tu atención y al final de la semana no avanzó lo más importante.",
  },
  {
    title: "Decides sin contraste",
    text: "No tienes con quién revisar la decisión antes de ejecutarla, y cada error cuesta tiempo y dinero.",
  },
  {
    title: "Las semanas se repiten",
    text: "Trabajas mucho, pero sin un registro de resultados es imposible saber qué funcionó y qué no.",
  },
  {
    title: "Los consejos no aplican",
    text: "El contenido genérico de negocios no conoce tu situación, tus clientes ni tus restricciones.",
  },
];

const cycleSteps = [
  {
    name: "Diagnosticar",
    text: "Comprende la situación real de tu negocio: qué vendes, a quién, y qué lo frena hoy.",
  },
  {
    name: "Decidir",
    text: "Identifica la decisión crítica de la semana y las 3 prioridades que un CEO pondría sobre la mesa.",
  },
  {
    name: "Ejecutar",
    text: "Convierte la decisión en un plan de 7 días con acciones concretas y medibles.",
  },
  {
    name: "Medir",
    text: "Registra qué resultado obtuvo cada acción, con evidencia y no con impresiones.",
  },
  {
    name: "Aprender",
    text: "Revisa la semana: qué hipótesis se validó, cuál quedó inconclusa y por qué.",
  },
  {
    name: "Mejorar",
    text: "La siguiente semana parte de lo aprendido. Cada ciclo hace al sistema más útil para tu negocio.",
  },
];

const comparison = {
  isolated: {
    title: "Una conversación aislada con IA",
    points: [
      "No conoce tu negocio: partes de cero en cada conversación.",
      "Olvida todo al cerrar el chat.",
      "Entrega respuestas genéricas que tú debes traducir a acción.",
      "Nadie hace seguimiento de lo que decidiste.",
      "La próxima semana vuelves a empezar.",
    ],
  },
  tuceo: {
    title: "TUCEO IA",
    points: [
      "Trabaja con el contexto de tu negocio: qué vendes, a quién y qué quieres lograr.",
      "Mantiene memoria semana a semana: decisiones, resultados y aprendizajes.",
      "Convierte el análisis en 3 prioridades y un plan de 7 días.",
      "Registra los resultados de cada acción como evidencia.",
      "Cada semana parte de lo aprendido en la anterior.",
    ],
  },
};

const stages = [
  {
    title: "Estás empezando",
    text: "Valida en qué enfocarte antes de gastar tiempo y dinero. Un diagnóstico claro vale más que meses de prueba y error sin dirección.",
  },
  {
    title: "Ya tienes ingresos",
    text: "Identifica el cuello de botella que limita el crecimiento y atácalo con una decisión semanal bien elegida.",
  },
  {
    title: "Quieres mejorar el desempeño",
    text: "Convierte cada semana en un ciclo medible: decidir, ejecutar, registrar resultados y aprender con evidencia.",
  },
];

const benefits = [
  "Una lectura ejecutiva de la situación actual de tu negocio.",
  "3 prioridades concretas, no veinte ideas sueltas.",
  "Un plan de acción de 7 días, enfocado y medible.",
  "Registro de resultados que se convierte en evidencia del negocio.",
  "Memoria de decisiones: cada semana parte de lo que aprendiste.",
  "Criterio de dirección sin contratar a un CEO.",
];

const faqs = [
  {
    question: "¿Qué es TUCEO IA?",
    answer:
      "Un copiloto de dirección empresarial. Analiza la situación de tu negocio, te ayuda a decidir qué priorizar cada semana, convierte la decisión en un plan de acción y aprende de los resultados contigo. No es un CRM, un ERP, un gestor de proyectos ni un chatbot genérico.",
  },
  {
    question: "¿Sirve para un negocio que está empezando?",
    answer:
      "Sí. Si estás por lanzar, el diagnóstico te ayuda a enfocar lo esencial antes de invertir de más. Y si tu negocio ya tiene ingresos, el ciclo semanal te ayuda a encontrar y atacar lo que más impacto puede tener.",
  },
  {
    question: "¿Necesito conocimientos técnicos o de IA?",
    answer:
      "No. Le cuentas a TUCEO IA qué está pasando en tu negocio con tus palabras, como se lo contarías a un asesor. El sistema se encarga del análisis y te devuelve prioridades y acciones claras.",
  },
  {
    question: "¿En qué se diferencia de preguntarle a un chat de IA?",
    answer:
      "Un chat aislado no conoce tu negocio ni recuerda la conversación anterior. TUCEO IA mantiene el contexto de tu negocio, registra tus resultados semana a semana y usa ese aprendizaje para mejorar la siguiente recomendación.",
  },
  {
    question: "¿Cuánto tiempo toma empezar?",
    answer:
      "Creas tu cuenta, describes tu negocio en un onboarding guiado y completas un diagnóstico inicial. Con eso, TUCEO IA genera tu primera lectura ejecutiva, tus 3 prioridades y tu plan de la semana.",
  },
  {
    question: "¿Quién puede ver la información de mi negocio?",
    answer:
      "La información de tu negocio se almacena asociada a tu cuenta y solo es accesible con tus credenciales. Cada usuario accede únicamente a sus propios datos.",
  },
  {
    question: "¿Reemplaza a un CEO o a un consultor?",
    answer:
      "No. TUCEO IA es un copiloto: te da criterio, estructura y seguimiento para dirigir mejor tu negocio. Las decisiones y la ejecución siguen siendo tuyas.",
  },
  {
    question: "¿En qué estado está el producto?",
    answer:
      "TUCEO IA está en beta activa: el ciclo completo de diagnóstico, decisión, plan semanal, registro de resultados y revisión ya está disponible, y el producto sigue mejorando con cada iteración.",
  },
];

const sectionLabelClass =
  "text-sm font-semibold uppercase tracking-[0.14em] text-slate-500";

export default function Home() {
  return (
    <main className="ambient-shell min-h-screen px-4 pb-24 pt-6 sm:px-6 sm:pb-6 lg:px-8">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>

      <div className="mx-auto max-w-6xl">
        <header className="surface-card sticky top-3 z-30 rounded-[1.5rem] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight text-slate-900"
            >
              {SITE_NAME}
            </Link>

            <nav aria-label="Secciones de la página" className="hidden lg:block">
              <ul className="flex items-center gap-1 text-sm font-medium text-slate-600">
                {[
                  { href: "#producto", label: "Producto" },
                  { href: "#ciclo", label: "El ciclo" },
                  { href: "#etapas", label: "Etapas" },
                  { href: "#faq", label: "Preguntas" },
                ].map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <LandingShareButton />
              <Link
                href="/login"
                className="secondary-button hidden min-h-11 px-4 py-2 text-sm sm:inline-flex"
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                className="primary-button min-h-11 px-4 py-2 text-sm"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </header>

        <div id="contenido">
          <section
            aria-labelledby="hero-title"
            className="grid gap-10 py-12 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20"
          >
            <div>
              <p className="badge-chip">Copiloto de dirección empresarial</p>

              <h1
                id="hero-title"
                className="mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl"
              >
                {SITE_TAGLINE}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                {SITE_NAME} analiza la situación de tu negocio, te muestra qué
                priorizaría un CEO experimentado y convierte esa decisión en un
                plan de acción de 7 días. Al cerrar la semana, registras los
                resultados y el sistema aprende de ellos contigo.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="primary-button min-h-12 px-6 py-3 text-base"
                >
                  Descubrir mi próxima prioridad
                </Link>

                <a
                  href="#producto"
                  className="secondary-button min-h-12 px-6 py-3 text-base"
                >
                  Ver cómo funciona
                </a>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-500">
                Para empresarios y directivos, en cualquier etapa del negocio.
              </p>
            </div>

            <div className="surface-card overflow-hidden rounded-[2rem] p-3 sm:p-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                <div className="hero-media relative flex items-center justify-center bg-slate-950">
                  <video
                    className="hero-video block max-h-[420px] w-full object-contain sm:max-h-[460px]"
                    src="/videos/tuceo-ia-hero_2026-08-29_02-47-04.mp4"
                    poster="/videos/frame-00-at-2.5s.png"
                    playsInline
                    muted
                    autoPlay
                    loop
                    controls={false}
                    aria-label={`Recorrido en video por el panel de ${SITE_NAME}`}
                  />
                  <div
                    className="hero-poster absolute inset-0 hidden bg-cover bg-center"
                    aria-hidden="true"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
                </div>

                <div className="space-y-3 bg-white p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    {SITE_NAME} en acción
                  </div>

                  <p className="text-lg font-semibold tracking-tight text-slate-900">
                    Diagnóstico, decisión, plan semanal y aprendizaje en un solo
                    lugar.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="problemas-title"
            className="landing-reveal scroll-mt-24 border-t border-slate-200 py-14 sm:py-16"
            id="problemas"
          >
            <div className="max-w-3xl">
              <p className={sectionLabelClass}>El punto de partida</p>

              <h2
                id="problemas-title"
                className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                ¿Te suena familiar?
              </h2>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                Dirigir un negocio no se trata de tener más tareas. Se trata de
                saber qué decisión genera más impacto, y eso es difícil cuando
                todo parece urgente.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {problems.map((problem) => (
                <div
                  key={problem.title}
                  className="surface-card rounded-[1.5rem] p-5"
                >
                  <h3 className="text-base font-semibold text-slate-900">
                    {problem.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {problem.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="ciclo-title"
            className="landing-reveal scroll-mt-24 py-14 sm:py-16"
            id="ciclo"
          >
            <div className="max-w-3xl">
              <p className={sectionLabelClass}>Cómo funciona</p>

              <h2
                id="ciclo-title"
                className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                Un ciclo de dirección, no una conversación suelta
              </h2>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                Cada semana recorre el mismo ciclo. Lo que aprende el sistema en
                una semana mejora la recomendación de la siguiente.
              </p>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cycleSteps.map((step, index) => (
                <li
                  key={step.name}
                  className="surface-card relative rounded-[1.5rem] p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {step.name}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="producto-title"
            className="landing-reveal scroll-mt-24 py-14 sm:py-16"
            id="producto"
          >
            <div className="max-w-3xl">
              <p className={sectionLabelClass}>Demostración del producto</p>

              <h2
                id="producto-title"
                className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                Así se ve {SITE_NAME} por dentro
              </h2>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                Estas vistas representan las funcionalidades disponibles hoy en
                el producto, con datos de ejemplo.
              </p>
            </div>

            <div className="mt-10 space-y-6">
              <div className="grid items-center gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">
                    1. Diagnóstico: una lectura ejecutiva de tu negocio
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    A partir de lo que le cuentas, {SITE_NAME} resume dónde está
                    tu negocio, qué lo frena y qué merece atención primero.
                  </p>
                </div>
                <div
                  className="surface-card rounded-[1.5rem] p-5"
                  role="img"
                  aria-label="Ejemplo del diagnóstico ejecutivo que genera TUCEO IA"
                >
                  <p className="eyebrow">Diagnóstico · Datos de ejemplo</p>
                  <p className="mt-3 text-base font-medium leading-7 text-slate-900">
                    “La taquería vende bien los fines de semana, pero entre
                    semana el local trabaja a media capacidad. El mayor
                    desperdicio está en las horas sin demanda.”
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Ventas concentradas en fin de semana
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Capacidad ociosa entre semana
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid items-center gap-6 lg:grid-cols-2">
                <div className="lg:order-2">
                  <h3 className="text-xl font-semibold text-slate-950">
                    2. Decisión estratégica: qué priorizar esta semana
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    No veinte ideas. La decisión crítica de la semana, la
                    dirección recomendada y las 3 prioridades que la sostienen.
                  </p>
                </div>
                <div
                  className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-sm"
                  role="img"
                  aria-label="Ejemplo de la decisión semanal recomendada por TUCEO IA"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="eyebrow !text-sky-300">
                      Decisión de esta semana · Datos de ejemplo
                    </p>
                    <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                      Nivel de certeza: Media
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-semibold leading-snug">
                    ¿Cómo llenar el local entre semana sin bajar precios?
                  </p>
                  <p className="mt-3 border-l-2 border-sky-400 pl-3 text-sm leading-6 text-slate-200">
                    <span className="font-medium text-sky-200">
                      CEO IA recomienda:{" "}
                    </span>
                    lanzar un menú ejecutivo de martes a jueves dirigido a
                    oficinas cercanas.
                  </p>
                </div>
              </div>

              <div className="grid items-center gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">
                    3. Acciones prioritarias: un plan de 7 días
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    Cada prioridad se convierte en acciones concretas con
                    resultado esperado, para ejecutar sin adivinar.
                  </p>
                </div>
                <div
                  className="surface-card rounded-[1.5rem] p-5"
                  role="img"
                  aria-label="Ejemplo de acciones prioritarias semanales en TUCEO IA"
                >
                  <p className="eyebrow">Plan de la semana · Datos de ejemplo</p>
                  <ul className="mt-3 space-y-3">
                    {[
                      {
                        action: "Definir el menú ejecutivo y su precio",
                        status: "Completada",
                        done: true,
                      },
                      {
                        action: "Visitar 5 oficinas cercanas con la propuesta",
                        status: "En curso",
                        done: false,
                      },
                      {
                        action: "Publicar el menú en el grupo del barrio",
                        status: "Pendiente",
                        done: false,
                      },
                    ].map((item) => (
                      <li
                        key={item.action}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <span className="flex min-w-0 items-center gap-3 text-sm font-medium text-slate-900">
                          <span
                            aria-hidden="true"
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              item.done
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {item.done ? "✓" : "·"}
                          </span>
                          <span className="min-w-0">{item.action}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            item.done
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid items-center gap-6 lg:grid-cols-2">
                <div className="lg:order-2">
                  <h3 className="text-xl font-semibold text-slate-950">
                    4. Registro de resultados: evidencia, no impresiones
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    Al completar una acción registras qué pasó de verdad. Ese
                    resultado queda guardado como evidencia de tu negocio.
                  </p>
                </div>
                <div
                  className="surface-card rounded-[1.5rem] p-5"
                  role="img"
                  aria-label="Ejemplo del registro de resultados de una acción en TUCEO IA"
                >
                  <p className="eyebrow">Resultado registrado · Datos de ejemplo</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    ¿Qué resultado obtuviste con las visitas a oficinas?
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Oficinas visitadas</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">5</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Pedidos del menú</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">12</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    La evidencia queda asociada a la acción y alimenta la
                    revisión de la semana.
                  </p>
                </div>
              </div>

              <div className="grid items-center gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">
                    5. Aprendizaje entre semanas: cada ciclo mejora al anterior
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    La revisión semanal convierte resultados en aprendizaje, y
                    ese aprendizaje forma parte de la memoria de tu negocio.
                  </p>
                </div>
                <div
                  className="surface-card rounded-[1.5rem] p-5"
                  role="img"
                  aria-label="Ejemplo del aprendizaje acumulado entre semanas en TUCEO IA"
                >
                  <p className="eyebrow">Revisión semanal · Datos de ejemplo</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      Hipótesis validada
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Racha de revisión: 3 semanas
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    “El menú ejecutivo atrajo clientes nuevos entre semana sin
                    bajar el ticket promedio. La próxima semana parte de este
                    aprendizaje.”
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="diferencia-title"
            className="landing-reveal scroll-mt-24 border-t border-slate-200 py-14 sm:py-16"
            id="diferencia"
          >
            <div className="max-w-3xl">
              <p className={sectionLabelClass}>La diferencia</p>

              <h2
                id="diferencia-title"
                className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                No es otra conversación con IA
              </h2>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-700">
                  {comparison.isolated.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {comparison.isolated.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm leading-6 text-slate-600"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-500"
                      >
                        ✕
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="text-lg font-semibold text-emerald-950">
                  {comparison.tuceo.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {comparison.tuceo.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm leading-6 text-emerald-950"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700"
                      >
                        ✓
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="etapas-title"
            className="landing-reveal scroll-mt-24 py-14 sm:py-16"
            id="etapas"
          >
            <div className="max-w-3xl">
              <p className={sectionLabelClass}>Casos de uso</p>

              <h2
                id="etapas-title"
                className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                Sea cual sea la etapa de tu negocio
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {stages.map((stage) => (
                <div
                  key={stage.title}
                  className="surface-card rounded-[1.5rem] p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {stage.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {stage.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="beneficios-title"
            className="landing-reveal py-14 sm:py-16"
            id="beneficios"
          >
            <div className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:px-8 lg:px-10">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Beneficios
                </p>
                <h2
                  id="beneficios-title"
                  className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  Qué obtienes desde la primera semana
                </h2>
              </div>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 rounded-[1.25rem] border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-200"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs font-semibold text-emerald-300"
                    >
                      ✓
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            aria-labelledby="faq-title"
            className="landing-reveal scroll-mt-24 py-14 sm:py-16"
            id="faq"
          >
            <div className="max-w-3xl">
              <p className={sectionLabelClass}>Preguntas frecuentes</p>

              <h2
                id="faq-title"
                className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                Lo que un empresario pregunta antes de empezar
              </h2>
            </div>

            <div className="mt-8 space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="surface-card group rounded-[1.25rem] px-5 py-4"
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-500 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    >
                      +
                    </span>
                  </summary>
                  <div className="details-body pt-3 text-sm leading-7 text-slate-600">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="cta-final-title"
            className="landing-reveal scroll-mt-24 pb-16 sm:pb-20"
            id="cta-final"
          >
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-10 text-center sm:px-10">
              <h2
                id="cta-final-title"
                className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                ¿Qué priorizaría un CEO en tu negocio esta semana?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Obtén tu diagnóstico, tus 3 prioridades y un plan de ejecución
                de 7 días. La próxima semana, aprende de los resultados.
              </p>

              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="primary-button min-h-12 px-6 py-3 text-base"
                >
                  Descubrir mi próxima prioridad
                </Link>
                <Link
                  href="/login"
                  className="secondary-button min-h-12 px-6 py-3 text-base"
                >
                  Ya tengo una cuenta
                </Link>
              </div>
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-200 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <p className="text-lg font-semibold tracking-tight text-slate-900">
                {SITE_NAME}
              </p>
              <p className="text-sm leading-6 text-slate-500">{SITE_TAGLINE}</p>
              <LandingShareButton />
            </div>

            <nav aria-label="Explorar el producto">
              <p className="text-sm font-semibold text-slate-900">Producto</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {[
                  { href: "#producto", label: "Demostración" },
                  { href: "#ciclo", label: "El ciclo semanal" },
                  { href: "#etapas", label: "Casos de uso" },
                  { href: "#faq", label: "Preguntas frecuentes" },
                ].map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="inline-flex min-h-11 items-center rounded-md py-1 pr-2 hover:text-slate-900 sm:min-h-9"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Acceso a la cuenta">
              <p className="text-sm font-semibold text-slate-900">Acceso</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>
                  <Link
                    href="/signup"
                    className="inline-flex min-h-11 items-center rounded-md py-1 pr-2 hover:text-slate-900 sm:min-h-9"
                  >
                    Crear cuenta
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="inline-flex min-h-11 items-center rounded-md py-1 pr-2 hover:text-slate-900 sm:min-h-9"
                  >
                    Iniciar sesión
                  </Link>
                </li>
              </ul>
            </nav>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Estado del producto
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Beta activa
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                El ciclo completo de diagnóstico, decisión, ejecución y
                aprendizaje ya está disponible.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 {SITE_NAME}</p>
            <p>Copiloto de dirección empresarial</p>
          </div>
        </footer>
      </div>

      <LandingMobileCta />
    </main>
  );
}
