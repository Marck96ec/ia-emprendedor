# Mapeo de componentes y contratos

**Propósito:** registrar qué puede reutilizarse hoy para CEO Command Center v3.1, qué requiere el motor de evaluación y qué depende de persistencia futura.

## 1. Mapa de la superficie actual

| Superficie actual | Archivo | Datos que recibe o deriva | Decisión v3.1 |
|---|---|---|---|
| Página del dashboard | `src/app/dashboard/page.tsx` | negocio, diagnóstico, `ceo_plans`, acciones, resultados, revisión y journey | Mantener como orquestador Server Component; extraer composición cuando exista una frontera estable |
| Encabezado | `src/components/dashboard-header.tsx` | nombre de negocio, semana, logout, enlace a historial | Evolucionar el copy a “Centro de dirección”; conservar navegación funcional |
| Decisión | `src/components/decision-hero.tsx` | `strategicDiagnosis`, prioridades, resumen y evidencia | Reutilizar como base de `CEODecisionCard` |
| Contexto | `src/components/executive-context-drawer.tsx` | decisión, diagnóstico, prioridades y paneles | Reutilizar como `AssessmentDetailsDrawer` extendido |
| Resumen | `src/components/executive-summary.tsx` | resumen ejecutivo e hipótesis | Usar como contenido de foco dentro del drawer |
| Evidencia externa | `src/components/external-evidence-section.tsx` | estado y evidencia externa | Mantener únicamente en divulgación progresiva |
| Acción principal | `src/components/next-action-card.tsx` | acción pendiente, conteo, revisión y cierre | Reutilizar; adaptar CTA a la máquina de estados completa |
| Progreso semanal | `src/components/weekly-progress.tsx` | completadas, total, semana y journey histórico | Mantener como escala de ejecución |
| Tablero | `src/components/weekly-action-board.tsx` | acciones, revisión y semana siguiente | Reutilizar para plan/misión temporal |
| Acción individual | `src/components/action-card.tsx` | acción, selección, recomendación y estado | Reutilizar; ampliar estados solo cuando el contrato los soporte |
| Detalle de acción | `src/components/action-detail-panel.tsx` | acción, resultado, captura, revisión y generación IA | Mantener todos los flujos de ejecución y confirmación |
| Historial | `src/app/history/page.tsx` | planes, acciones y revisiones históricas | Base de la futura evolución histórica, no equivale a niveles |
| Journey derivado | `src/lib/dashboard-progress.ts` | planes, revisiones y acciones completadas | Mantener separado de cualquier motor de madurez |

## 2. Clasificación de componentes propuestos

| Componente | Disponibilidad | Contrato mínimo requerido | Dependencia |
|---|---|---|---|
| `CEOCommandCenter` | Implementable | props compuestas del dashboard actual | Ninguna nueva |
| `BusinessEvolutionCard` | Implementado con evaluación runtime | evaluación, nivel, etapa, salud, confianza, estado y fecha | `src/components/business-evolution-card.tsx` |
| `BusinessLevelIndicator` | Implementado dentro de la tarjeta | nivel 1–5 o estado indeterminado | Indicador conservador |
| `BusinessHealthIndicator` | Implementado dentro de la tarjeta | estado cualitativo, explicación y riesgos | Salud separada de madurez |
| `BusinessDNA` | Implementado | seis dimensiones evaluadas | `src/components/business-dna.tsx` |
| `BusinessDimensionCard` | Implementado dentro de `BusinessDNA` | dimensión, estado, reglas, faltantes y evidencias | Drawer de detalle |
| `CEODecisionCard` | Implementable | `DashboardStrategicDiagnosis` y resumen | Contrato existente |
| `StrategicMissionCard` | Dependiente de misiones | misión, objetivo, planes vinculados y estado | Persistencia de misión |
| `WeeklyProgress` | Implementable | datos actuales del componente | Contrato existente |
| `NextActionCard` | Implementable | acción y estado de ejecución | Contrato existente; ampliar solo si necesario |
| `BusinessMilestoneCard` | Dependiente de hitos | catálogo, condiciones, evidencia y verificación | Motor/catálogo de hitos |
| `AssessmentDetailsDrawer` | Parcialmente implementable | tabs y contenido de evaluación | `ExecutiveContextDrawer` + motor |

## 3. Contratos existentes aprovechables

### 3.1 Decisión estratégica

El contrato `DashboardStrategicDiagnosis` ya contiene:

- comprensión del negocio;
- diagnóstico y área afectada;
- cuello de botella;
- evidencias;
- confianza;
- incógnitas;
- hipótesis alternativa;
- decisión crítica con pregunta, dirección, justificación, resultado esperado y métrica objetivo.

Fuente: `src/lib/dashboard-types.ts`.

Este contrato permite implementar la tarjeta de decisión y su drawer sin nuevas llamadas a OpenAI. La UI no debe reinterpretar la decisión ni derivar una etapa de negocio desde ella.

### 3.2 Ejecución semanal

`DashboardAction` contiene:

- secuencia;
- acción, objetivo, razón y métrica;
- resultado esperado;
- recomendación de rol;
- horas estimadas;
- estado pendiente/completada;
- esquema y datos de captura;
- modo manual/asistido por IA;
- tipo de acción;
- resultados y revisión.

El contrato actual es suficiente para la escala de ejecución y para la acción principal. El modelo persistido solo tiene `pending` y `completed`; estados como “iniciada” o “bloqueada” requieren primero una decisión de contrato y persistencia, no deben simularse en la UI.

### 3.3 Continuidad y aprendizaje

`DashboardJourney` deriva:

- acciones ejecutadas;
- decisiones evaluadas;
- hipótesis validadas;
- constancia de revisión;
- aprendizaje previo.

Estos datos son útiles para historial y aprendizaje estratégico. No deben alimentar automáticamente el nivel empresarial ni la salud.

### 3.4 Evidencia

Las migraciones actuales incluyen `business_evidence` y `business_evidence_links`. La evidencia tiene tipo, clave canónica, datos, acción fuente, resultado fuente, certeza, fechas y relación con otra evidencia.

Esto puede alimentar el detalle de una dimensión o condición de hito después de definir:

- qué evidencia soporta cada dimensión;
- qué antigüedad la invalida;
- cómo se resuelven datos contradictorios;
- cómo se distingue `real`, `estimated` y `unknown`;
- qué regla produce un estado cualitativo.

## 4. Contrato implementado del motor de evaluación

El contrato actual se implementa en `src/lib/business-assessment.ts` y se alimenta mediante
`src/lib/business-assessment-adapter.ts`. No requiere una migración porque la evaluación se deriva
en runtime con datos existentes.

```ts
type BusinessAssessmentStatus =
  | "evaluated"
  | "provisional"
  | "indeterminate";

type BusinessHealthStatus =
  | "favorable"
  | "fragile"
  | "critical"
  | "mixed"
  | "unevaluated";

type BusinessDimensionKey =
  | "market"
  | "finance"
  | "liquidity"
  | "operations"
  | "autonomy"
  | "growth";

type BusinessAssessment = {
  level: 1 | 2 | 3 | 4 | 5 | null;
  stage:
    | "validation"
    | "survival"
    | "stability"
    | "expansion"
    | "consolidation"
    | null;
  health: BusinessHealthStatus;
  status: BusinessAssessmentStatus;
  confidence: "low" | "medium" | "high" | null;
  evaluatedAt: string | null;
  missingInformation: string[];
  evidenceIds: string[];
  dimensions: BusinessDimensionAssessment[];
};

type BusinessDimensionAssessment = {
  key: BusinessDimensionKey;
  status: BusinessHealthStatus;
  explanation: string;
  risks: string[];
  missingInformation: string[];
  evaluatedConditions: string[];
  evidenceIds: string[];
  evaluatedAt: string | null;
};
```

Reglas obligatorias del contrato:

1. `level` puede ser `null`; la ausencia de información no significa nivel 1.
2. `status` no puede inferirse de la cantidad de acciones completadas.
3. Cada estado evaluado debe poder rastrearse a evidencias y condiciones.
4. `confidence` no debe fabricarse si el motor no la calcula.
5. El cliente presenta el contrato; no contiene reglas de madurez.
6. La persistencia futura debe incluir RLS para datos propios del negocio.

## 5. Contrato futuro de misión e hitos

### Misión estratégica

Antes de persistirla, definir:

- `id`;
- negocio propietario;
- título y objetivo;
- estado;
- fecha de inicio y cierre;
- planes semanales vinculados;
- resultado empresarial esperado;
- relación con la decisión estratégica.

Mientras no exista, la UI debe nombrar el objetivo actual sin asignar un identificador de misión.

### Hito empresarial

Antes de mostrar un contador, definir:

- catálogo/versionado del hito;
- condiciones;
- evidencia requerida por condición;
- estado de cada condición;
- fecha de verificación;
- diferencia entre capacidad adquirida y resultado económico.

Un contador como `2 de 4` solo es válido si las cuatro condiciones están definidas y dos tienen evidencia suficiente.

## 6. Dependencias funcionales

| Elemento | Depende de | Bloqueo actual |
|---|---|---|
| Evolución empresarial | Motor de niveles y estados | Evaluación derivada en runtime; no persistida |
| Salud empresarial | Reglas de salud y vigencia | Evaluación inicial derivada en runtime |
| ADN Empresarial | Evaluación por seis dimensiones | Seis dimensiones disponibles; la mayoría puede quedar sin evaluar |
| Detalle de dimensión | Evidencia y condiciones | Hay evidencia operativa, faltan reglas |
| Misión formal | Entidad y relación con planes | No hay tabla ni contrato |
| Hito empresarial | Catálogo y verificación | No hay motor de hitos |
| Navegación Mi empresa | Contenido funcional | No crear página vacía |
| Navegación Misiones | Misión y planes funcionales | No crear enlace sin destino real |
| Navegación Evolución | Evaluaciones e historial | El historial actual no es un sistema de niveles |

## 7. Mapeo de estados de acción

El estado de persistencia actual es limitado:

```text
weekly_actions.status: pending | completed
action_results.status: draft | approved
```

La UI puede derivar de forma segura:

| Estado visible | Derivación actual |
|---|---|
| Acción disponible | acción pendiente sin resultado |
| Entregable generado | acción asistida con resultado |
| Pendiente de revisión | resultado en estado `draft` |
| Completada | acción `completed` |
| Pendiente de confirmación | resultado aprobado con acción pendiente, si el flujo lo permite |

“Iniciada”, “bloqueada” y “error recuperable” necesitan una fuente explícita. Si no existe esa fuente, se debe mostrar el estado real más cercano y una explicación, no una etiqueta decorativa.

## 8. Plan de archivos para la implementación y futuras fases

### Fase visual, sin esquema — implementada

Archivos implementados:

- `src/components/ceo-command-center.tsx`
- `src/components/ceo-decision-card.tsx`
- `src/components/business-evolution-card.tsx` solo si recibe un contrato explícito de estado vacío
- `src/components/strategic-mission-card.tsx` solo para el objetivo temporal existente
- `src/components/assessment-details-drawer.tsx` si la extensión de `ExecutiveContextDrawer` deja de ser clara
- `src/app/globals.css` para tokens semánticos
- `src/app/dashboard/page.tsx` para composición

La integración del CEO Agent recibe la evaluación determinística como contexto de solo lectura
en `src/lib/ai/generate-ceo-plan.ts`; el contrato de salida existente no fue reemplazado.

### Fase de evaluación, con migración

Solo después de aprobar el contrato:

- migración Supabase para evaluaciones;
- tipos y validadores en `src/lib/`;
- servicio de evaluación fuera de React;
- pruebas de reglas, RLS y estados indeterminados.

La migración debe preservar RLS y documentar explícitamente las tablas, políticas y funciones creadas.

## 9. Criterios para aprobar cada fase

- No hay mocks en rutas de producción.
- La UI muestra el estado real cuando un dato falta.
- La lógica determinística permanece fuera de los componentes.
- La decisión y la acción actual continúan funcionando.
- Los cambios de datos incluyen tipos, validación, migración y RLS.
- Los tests cubren los estados nuevos y no solo el camino feliz.
