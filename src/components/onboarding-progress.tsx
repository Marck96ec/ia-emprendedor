type OnboardingProgressProps = {
  currentStep: 1 | 2 | 3;
};

const steps = [
  {
    number: 1,
    label: "Tu negocio",
  },
  {
    number: 2,
    label: "Diagnóstico",
  },
  {
    number: 3,
    label: "Tu primera semana",
  },
] as const;

export function OnboardingProgress({
  currentStep,
}: OnboardingProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Paso {currentStep} de 3
        </p>

        <p className="text-sm text-gray-500">
          Configuración inicial
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {steps.map((step) => {
          const completed =
            step.number < currentStep;

          const active =
            step.number === currentStep;

          return (
            <div
              key={step.number}
            >
              <div
                className={`h-2 rounded-full ${
                  completed || active
                    ? "bg-black"
                    : "bg-gray-200"
                }`}
              />

              <p
                className={`mt-2 text-xs ${
                  active
                    ? "font-semibold text-gray-900"
                    : completed
                      ? "font-medium text-gray-600"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}