import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-semibold text-gray-900"
          >
            IA Emprendedor
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/signup"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Crear cuenta
            </Link>
          </div>
        </header>

        <section className="grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Un CEO IA para pequeños negocios
            </p>

            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Decide qué hacer primero en tu negocio.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              IA Emprendedor analiza la situación de tu negocio,
              identifica tus prioridades y convierte esas decisiones
              en un plan práctico de 7 días.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-lg bg-black px-6 py-3 text-center font-medium text-white"
              >
                Crear mi plan
              </Link>

              <Link
                href="/login"
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-medium text-gray-800"
              >
                Ya tengo una cuenta
              </Link>
            </div>

            <p className="mt-5 text-sm text-gray-500">
              Diseñado inicialmente para dueños de pequeños negocios
              que necesitan claridad sobre qué priorizar.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium text-gray-500">
              Tu semana con IA Emprendedor
            </p>

            <div className="mt-6 space-y-5">
              <div className="rounded-2xl bg-gray-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                    1
                  </div>

                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Cuéntanos sobre tu negocio
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Describe qué vendes, tus clientes, tu principal
                      problema y lo que quieres conseguir.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                    2
                  </div>

                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Recibe prioridades claras
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      El CEO IA analiza tu contexto y define las
                      tres prioridades que merecen atención.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                    3
                  </div>

                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Ejecuta un plan de 7 días
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Completa acciones concretas, revisa qué
                      funcionó y prepara la siguiente semana con
                      lo aprendido.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-gray-500">
              NO ES OTRO CHAT DE IA
            </p>

            <h2 className="mt-3 text-3xl font-semibold text-gray-900">
              El objetivo no es darte más información.
            </h2>

            <p className="mt-4 text-lg leading-8 text-gray-600">
              El objetivo es ayudarte a convertir la información
              que ya tienes sobre tu negocio en decisiones,
              prioridades y acciones que puedas ejecutar durante
              la semana.
            </p>
          </div>
        </section>

        <section className="pb-20">
          <div className="rounded-3xl bg-black px-6 py-10 text-white sm:px-10">
            <h2 className="max-w-2xl text-3xl font-semibold">
              Empieza con el problema más importante de tu negocio.
            </h2>

            <p className="mt-3 max-w-2xl text-gray-300">
              Completa el diagnóstico inicial y deja que el CEO IA
              prepare tu primera semana.
            </p>

            <Link
              href="/signup"
              className="mt-7 inline-block rounded-lg bg-white px-6 py-3 font-medium text-black"
            >
              Empezar ahora
            </Link>
          </div>
        </section>

        <footer className="border-t border-gray-200 py-8 text-sm text-gray-500">
          IA Emprendedor · Beta
        </footer>
      </div>
    </main>
  );
}