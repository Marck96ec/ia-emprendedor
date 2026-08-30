import Link from "next/link";

export default function Home() {
  return (
    <main className="ambient-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="surface-card flex items-center justify-between rounded-[1.5rem] px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
            TuCEO IA
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="secondary-button px-4 py-2 text-sm">
              Ya tengo una cuenta
            </Link>

            <Link href="/signup" className="primary-button px-4 py-2 text-sm">
              Analizar mi negocio
            </Link>
          </div>
        </header>

        <section className="grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <p className="badge-chip">Criterio de CEO para dueños de negocios</p>

            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Descubre qué haría un CEO experimentado en tu situación.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Cuéntanos qué está pasando en tu negocio. TuCEO IA analiza el contexto, identifica las decisiones de mayor impacto y las convierte en un plan práctico para los próximos 7 días.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="primary-button px-6 py-3">
                Analizar mi negocio
              </Link>

              <Link href="/login" className="secondary-button px-6 py-3">
                Ya tengo una cuenta
              </Link>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Decisiones con contexto. Prioridades claras. Acciones orientadas a resultados.
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
                  aria-label="Video explicativo de TuCEO IA"
                />
                <div className="hero-poster absolute inset-0 hidden bg-cover bg-center" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
              </div>

              <div className="space-y-3 bg-white p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  TuCEO IA
                </div>

                <p className="text-lg font-semibold tracking-tight text-slate-900">
                  Te muestra qué priorizaría un CEO experimentado en tu situación, por qué y qué haría después.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              TuCEO IA
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              ¿Qué debería priorizar un buen CEO ahora?
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              Cuando todo parece urgente, el problema no es tener más tareas. Es saber qué decisión puede generar más impacto.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Qué merece atención primero",
              "Por qué puede tener mayor impacto",
              "Qué haría a continuación",
              "Cómo convertirlo en acciones esta semana",
            ].map((item) => (
              <div key={item} className="surface-card rounded-[1.5rem] p-5">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                  ✓
                </div>
                <p className="text-base font-medium leading-7 text-slate-900">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              NO ES OTRO CHAT DE IA
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              No te da una lista de consejos. Piensa desde el negocio.
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              En lugar de responder preguntas aisladas, TuCEO IA utiliza el contexto de tu negocio para ayudarte a evaluar prioridades, tomar decisiones y avanzar con un objetivo claro.
            </p>

            <div className="mt-8 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-lg font-medium text-emerald-900 sm:p-6">
              Menos recomendaciones genéricas. Más criterio para decidir.
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              De “tengo muchos problemas” a “sé dónde enfocarme”.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              TuCEO IA toma en cuenta lo que vendes, tus clientes, tus objetivos y los desafíos actuales para identificar las 3 prioridades que un CEO experimentado pondría sobre la mesa.
            </p>

            <p className="mt-3 text-lg leading-8 text-slate-600">
              Después las convierte en una semana de ejecución.
            </p>
          </div>
        </section>

        <section className="pb-20">
          <div className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:px-8 lg:px-10">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
              Tu negocio, visto con criterio de CEO.
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Cuéntanos qué está pasando",
                  text: "Describe tu negocio, tus objetivos y los principales desafíos.",
                },
                {
                  title: "Recibe una lectura ejecutiva",
                  text: "TuCEO IA analiza la situación y explica qué merece atención y por qué.",
                },
                {
                  title: "Conoce tus 3 prioridades",
                  text: "No veinte ideas. Tres focos concretos sobre los que vale la pena actuar.",
                },
                {
                  title: "Llévalas a la práctica",
                  text: "Convierte las decisiones en acciones para los próximos 7 días.",
                },
              ].map((step) => (
                <div key={step.title} className="rounded-[1.5rem] border border-slate-700 bg-slate-900 p-5">
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {step.title.charAt(0)}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-10 text-center sm:px-10">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              ¿Qué haría un CEO experimentado con tu negocio esta semana?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Obtén una lectura de tu situación, tus 3 prioridades y un plan de ejecución de 7 días.
            </p>

            <Link href="/signup" className="primary-button mt-7 inline-flex px-6 py-3">
              Analizar mi negocio
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 py-8 text-sm text-slate-500">
          TuCEO IA · Beta
        </footer>
      </div>
    </main>
  );
}