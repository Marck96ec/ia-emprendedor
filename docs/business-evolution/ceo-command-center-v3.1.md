# CEO Command Center v3.1

**Estado:** propuesta UX/UI, implementación inicial y plan incremental
**Fecha de auditoría:** 2026-11-24  
**Alcance de esta ejecución:** primera entrega funcional sin cambios de esquema, dependencias, rutas nuevas ni despliegues.

## 1. Resumen ejecutivo

TuCEO IA debe presentarse como un centro de dirección estratégica, no como una lista de tareas. La experiencia propuesta organiza la información en dos preguntas:

- **Mi empresa:** ¿cómo está funcionando y qué capacidad necesita atención?
- **Dirección estratégica:** ¿qué decisión debemos tomar y qué movimiento ejecutamos ahora?

La decisión del CEO IA es el foco visual y estratégico. La acción siguiente es la única acción primaria. La evolución empresarial, el ADN Empresarial y los hitos se muestran como capacidades explicables y respaldadas por evidencia, nunca como porcentajes, puntos o niveles inventados.

La propuesta se apoya en capacidades reales ya existentes:

- diagnóstico y contexto empresarial;
- decisión estratégica estructurada y prioridades;
- evidencia externa dentro de un drawer;
- planes semanales de siete acciones;
- acciones manuales y asistidas por IA;
- generación, revisión, aprobación y confirmación de entregables;
- revisión semanal, aprendizaje estratégico e historial.

La implementación inicial incorpora la evaluación determinística de madurez, salud y dimensiones del ADN sin persistencia nueva. Las misiones persistentes y los hitos empresariales todavía requieren contratos y reglas explícitos antes de entrar en producción.

## 2. Auditoría de la experiencia actual

### 2.1 Flujo y composición existentes

El dashboard actual es un Server Component autenticado que:

1. carga el negocio y redirige a onboarding si falta;
2. carga el diagnóstico y redirige a su onboarding si falta;
3. carga el último `ceo_plan`;
4. valida defensivamente el contenido generado;
5. carga las acciones semanales y sus resultados;
6. carga la revisión semanal;
7. deriva métricas históricas de ejecución, decisiones evaluadas, hipótesis validadas y constancia de revisión;
8. renderiza estados de generación, error o plan listo.

La composición actual, en orden, es:

```text
DashboardHeader
  └─ WelcomeBanner
PlanGenerationExperience | PlanGeneratingStatus
DecisionHero ───────────── NextActionCard
WeeklyProgress ─────────── DecisionLoop ─────────── TimeAllocationCard
WeeklyActionBoard
  ├─ ActionCard list
  └─ ActionDetailPanel
```

Fuentes principales:

- `src/app/dashboard/page.tsx`
- `src/components/decision-hero.tsx`
- `src/components/next-action-card.tsx`
- `src/components/weekly-progress.tsx`
- `src/components/weekly-action-board.tsx`
- `src/components/action-detail-panel.tsx`

### 2.2 Capacidades reutilizables

| Capacidad | Estado actual | Reutilización propuesta |
|---|---|---|
| Decisión estratégica | Implementada en `strategic_diagnosis.critical_decision` | Convertir `DecisionHero` en `CEODecisionCard` visualmente, preservando el contrato |
| Justificación progresiva | Implementada | Mantener `ExecutiveContextDrawer` y sus tabs de decisión, foco, prioridades y evidencia |
| Evidencia externa | Implementada | Mantener `ExternalEvidenceSection` en el drawer; no duplicarla en la superficie principal |
| Acción principal | Implementada | Reutilizar `NextActionCard` y adaptar sus etiquetas al estado real |
| Ejecución manual | Implementada | Mantener `WeeklyActionBoard` y `ActionDetailPanel` |
| Ejecución asistida por IA | Implementada | Mantener generación, refinamiento, aprobación y registro de evidencia |
| Progreso de ejecución | Implementado | Reusar `WeeklyProgress` como escala de ejecución, sin llamarlo progreso empresarial |
| Revisión y aprendizaje | Implementado | Reusar `weekly_reviews`, `HistoryTimeline` y `buildDashboardJourney` |
| Evolución empresarial | Implementación inicial en runtime | `src/lib/business-assessment.ts` y `BusinessEvolutionCard` |
| Salud empresarial | Implementación inicial no persistida | Derivada de señales explícitas y separada de madurez |
| ADN Empresarial | Implementación inicial de seis dimensiones | `BusinessDNA` con estados conservadores y drawer |
| Misión estratégica | No existe como entidad persistida | Usar temporalmente el objetivo estratégico del plan, sin inventar un ID de misión |
| Hitos empresariales | No existe un motor de condiciones | Mostrar únicamente un estado informativo real hasta definir criterios |

### 2.3 Estado real de Fase 2 y del Business Maturity and Health Engine

La auditoría no encontró documentación existente en `docs/business-evolution/` ni un artefacto identificable como implementación de Fase 2. El código únicamente contiene una constante preparatoria:

```text
BUSINESS_MATURITY_STAGES =
  Explorando · Midiendo · Decidiendo · Delegando · Escalando
```

`buildDashboardJourney` calcula continuidad de ejecución y aprendizaje semanal, no madurez empresarial ni salud. Tampoco se encontraron tablas, funciones RPC, servicios o contratos para:

- los cinco niveles de evolución solicitados;
- una evaluación de salud;
- las seis dimensiones del ADN;
- condiciones verificadas de hitos;
- estado provisional o indeterminado de una evaluación;
- vigencia, confianza y evidencia por dimensión.

La primera implementación funcional incorpora ahora un motor determinístico versionado en
[`src/lib/business-assessment.ts`](../../src/lib/business-assessment.ts), con un adaptador de datos reales en
[`src/lib/business-assessment-adapter.ts`](../../src/lib/business-assessment-adapter.ts). El motor no crea una metodología perdida ni infiere datos financieros ausentes:

- utiliza la etapa declarada y señales operativas explícitas;
- devuelve estados provisionales o indeterminados cuando faltan señales;
- mantiene salud separada de madurez;
- expone reglas aplicadas, riesgos, evidencias e información faltante;
- nunca convierte evidencia declarada/documentada en evidencia verificada.

Las misiones persistentes y los hitos con condiciones verificables continúan siendo capacidades futuras. El CEO Command Center no infiere un nivel a partir de acciones completadas, semanas revisadas o ausencia de datos.

La evidencia operativa existente (`business_evidence`) es una base útil, pero no equivale por sí sola a una evaluación de madurez o salud. Sus tipos actuales son `action_result`, `product`, `price`, `cost`, `opportunity`, `follow_up`, `sale` y `metric`.

### 2.4 Restricción de viewport actual

El dashboard ya dispone de una estrategia de cockpit:

- `cockpit` se activa desde 1100 px de ancho y 680 px de alto;
- el shell usa `cockpit:h-dvh cockpit:overflow-hidden`;
- el tablero y el panel de detalle pueden desplazarse internamente.

Esto demuestra una intención correcta para escritorio, pero no garantiza todavía la composición de dos columnas del v3.1 ni el cumplimiento de 1280 × 720, 1366 × 768, 1440 × 900 y 1920 × 1080 con el nuevo volumen de información. La futura implementación debe validar esas cuatro resoluciones con datos reales y estados excepcionales.

## 3. Propuesta de experiencia

### 3.1 Distribución de escritorio

En escritorio se propone una cuadrícula de dos columnas, sin tercera columna permanente:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Centro de dirección · Nombre del negocio · Semana · navegación compacta │
├───────────────────────────────┬──────────────────────────────────────────┤
│ MI EMPRESA                     │ DIRECCIÓN ESTRATÉGICA                    │
│                               │                                          │
│ Evolución empresarial         │ DECISIÓN DE TU CEO IA                    │
│ ┌───────────────────────────┐ │ ┌──────────────────────────────────────┐ │
│ │ Nivel / etapa / salud     │ │ │ recomendación                         │ │
│ │ evaluación / confianza    │ │ │ justificación · resultado esperado    │ │
│ │ 5 etapas segmentadas      │ │ │ ¿Por qué esta decisión?               │ │
│ └───────────────────────────┘ │ └──────────────────────────────────────┘ │
│                               │                                          │
│ ADN EMPRESARIAL               │ MISIÓN / OBJETIVO ESTRATÉGICO             │
│ ┌──────┬──────┐               │ objetivo + secuencia de 7 acciones        │
│ │Mercado│Finan.│               │                                          │
│ │Liquidez│Oper.│              │ TU SIGUIENTE MOVIMIENTO                   │
│ │Autonomía│Crec.│             │ única CTA primaria y estado real           │
│ └──────┴──────┘               │                                          │
│                               │                                          │
│ Próximo hito empresarial      │                                          │
│ condiciones verificadas       │                                          │
└───────────────────────────────┴──────────────────────────────────────────┘
```

Proporción orientativa: 35% para **Mi empresa** y 65% para **Dirección estratégica**. La proporción debe ser flexible mediante `minmax(0, ...)`; no se deben fijar anchos rígidos que provoquen overflow.

En alturas cortas, la prioridad de permanencia visual es:

1. decisión del CEO;
2. siguiente movimiento;
3. estado mínimo de la misión/plan;
4. resumen de evolución y salud.

El detalle de evidencia, diagnóstico, dimensiones y acciones secundarias se abre en drawers o paneles secundarios.

### 3.2 Distribución móvil

En móvil se permite scroll natural y se conserva la decisión y la acción actual antes del detalle:

```text
┌──────────────────────────────┐
│ Centro de dirección          │
│ negocio · menú               │
├──────────────────────────────┤
│ DECISIÓN DE TU CEO IA        │
│ recomendación                │
│ resultado esperado           │
│ [Entender decisión]          │
├──────────────────────────────┤
│ TU SIGUIENTE MOVIMIENTO      │
│ acción concreta              │
│ [Comenzar / Continuar]       │
├──────────────────────────────┤
│ Misión / plan de acción      │
│ 7 estados compactos          │
├──────────────────────────────┤
│ Mi empresa                   │
│ Evolución empresarial        │
│ ADN Empresarial              │
│ Próximo hito                 │
└──────────────────────────────┘
```

No se deben ocultar estados desconocidos ni reemplazar la acción principal por navegación entre tarjetas.

## 4. Jerarquía de información

### Nivel 1: decisión y control

- decisión recomendada;
- justificación breve;
- resultado esperado;
- CTA único de la acción actual;
- estado de error o bloqueo si impide avanzar.

### Nivel 2: dirección de la semana

- objetivo estratégico actual;
- secuencia compacta de siete acciones;
- estado de la acción actual;
- revisión pendiente o plan completado.

### Nivel 3: comprensión de la empresa

- etapa y estado de evaluación;
- salud;
- seis dimensiones del ADN;
- hito próximo, solo si hay criterios reales.

### Nivel 4: contexto ampliado

- evidencias;
- hipótesis;
- alternativas;
- riesgos;
- información faltante;
- detalle de una dimensión;
- historial.

## 5. Componentes y clasificación de disponibilidad

| Componente propuesto | Clasificación | Base reutilizable |
|---|---|---|
| `CEOCommandCenter` | Implementable como composición visual | `src/app/dashboard/page.tsx` |
| `BusinessEvolutionCard` | Dependiente del motor de evaluación | Ninguna evaluación persistida |
| `BusinessLevelIndicator` | Dependiente del motor de evaluación | `BUSINESS_MATURITY_STAGES` es solo preparatoria |
| `BusinessHealthIndicator` | Dependiente del motor de evaluación | No existe contrato de salud |
| `BusinessDNA` | Dependiente del motor de evaluación | `business_evidence` puede aportar fuentes, no estados |
| `BusinessDimensionCard` | Dependiente del motor de evaluación | No existe evaluación por dimensión |
| `CEODecisionCard` | Implementable con datos existentes | `DecisionHero` + `ExecutiveContextDrawer` |
| `StrategicMissionCard` | Dependiente de misiones estratégicas | Usar provisionalmente `strategic_diagnosis` y `weekly_plan` |
| `WeeklyProgress` | Implementable con datos existentes | Componente existente |
| `NextActionCard` | Implementable con datos existentes | Componente existente |
| `BusinessMilestoneCard` | Dependiente de hitos empresariales | No existe catálogo ni evaluador de condiciones |
| `AssessmentDetailsDrawer` | Implementable como interacción; contenido dependiente del motor | `ExecutiveContextDrawer` es el patrón existente |

## 6. Sistema visual

Los colores se deben convertir en tokens semánticos del sistema existente, no copiar como valores aislados dentro de componentes:

| Token semántico | Referencia | Uso |
|---|---:|---|
| `--executive-blue` | `#172D46` | Decisión, dirección y acción principal |
| `--status-favorable` | `#479B80` | Estado favorable, condición verificada y acción completada |
| `--status-attention` | `#C79B47` | Fragilidad y atención |
| `--status-critical` | `#CE5555` | Riesgo crítico y bloqueo |
| `--status-unevaluated` | `#909090` | Sin evaluar, pendiente e información secundaria |
| `--surface-neutral` | `#F5F6F8` | Fondo de referencia |

Cada estado debe tener texto, icono o patrón además del color. La decisión debe usar una superficie azul profunda, con contraste AA verificable y foco visible.

## 7. Estados normales y excepcionales

| Estado | Comportamiento visible | Acción primaria |
|---|---|---|
| Negocio recién registrado | Explicar que falta contexto empresarial | Completar datos del negocio |
| Onboarding incompleto | Mostrar el paso concreto que falta | Continuar onboarding |
| Diagnóstico generándose | Estado de carga explícito; no mostrar nivel ficticio | Esperar o reintentar si corresponde |
| Información insuficiente | “Estamos comprendiendo tu empresa”; listar información faltante | Aportar información |
| Evaluación provisional | Mostrar etapa provisional, confianza y qué debe validarse | Revisar o completar evidencia |
| Evaluación indeterminada | No asignar nivel 1; mostrar “Sin evaluar” | Completar datos necesarios |
| Salud crítica | Explicar el riesgo y su fuente | Ejecutar la acción prioritaria |
| Sin plan semanal | Mantener estado vacío útil | Generar o preparar semana |
| Plan generándose | Mostrar progreso del proceso | Esperar |
| Plan fallido | Explicar el error recuperable | Reintentar |
| Acción manual disponible | Título, objetivo y CTA único | Comenzar acción |
| Acción asistida por IA | Indicar modalidad y conservar el flujo existente | Crear con ayuda de IA |
| Entregable pendiente | Mostrar borrador y revisión | Revisar resultado |
| Entregable aprobado | Pedir evidencia de uso real | Registrar evidencia y completar |
| Resultado pendiente | Explicar qué falta confirmar | Confirmar resultado |
| Semana completada | Separar ejecución de aprendizaje | Revisar la semana |
| Error al recuperar información | Mostrar error explícito y no datos simulados | Reintentar o contactar soporte |

## 8. Plan de implementación incremental

### Fase 0 — Contratos y alcance

- documentar el contrato de evaluación de evolución, salud y dimensiones;
- definir estados `favorable`, `frágil`, `crítica`, `mixta` y `sin evaluar`;
- definir provisionalidad, confianza, vigencia y fuentes;
- decidir si la misión estratégica será una entidad nueva o una proyección temporal del objetivo actual;
- definir el catálogo de hitos y sus condiciones verificables.

**No se implementa en esta ejecución.**

### Fase 1 — Composición visual con datos existentes

- introducir la composición de dos columnas;
- reubicar `DecisionHero`, `NextActionCard`, `WeeklyProgress` y el tablero existente;
- ajustar copy visible a “Centro de dirección”, “Decisión de tu CEO IA” y “Tu siguiente movimiento”;
- conservar los drawers y los flujos de ejecución;
- validar teclado, contraste y viewport.

Esta fase no debe mostrar niveles, salud, ADN ni hitos ficticios.

### Fase 2 — Motor de evaluación — implementación inicial

- implementar reglas determinísticas fuera de React;
- exponer contratos tipados para nivel, salud, dimensiones y confianza;
- agregar pruebas de estados indeterminados, provisionales y escenarios conservadores.

La persistencia de evaluaciones queda pendiente: la primera entrega calcula la evaluación en runtime y no modifica el esquema de Supabase.

### Fase 3 — Comprensión empresarial

- añadir `BusinessEvolutionCard`;
- añadir `BusinessDNA` y `AssessmentDetailsDrawer`;
- integrar evidencia real y fechas de última evaluación;
- habilitar `/mi-empresa` únicamente cuando exista contenido funcional.

### Fase 4 — Misiones e hitos

- formalizar misión estratégica y su relación con uno o varios planes semanales;
- añadir catálogo de hitos y contador de condiciones verificadas;
- distinguir capacidad demostrada de resultado económico;
- habilitar `/misiones` y `/evolución` solo con datos y acciones funcionales.

### Fase 5 — Validación UX

- probar 1280 × 720, 1366 × 768, 1440 × 900 y 1920 × 1080;
- probar onboarding incompleto, diagnóstico en generación, plan fallido, evaluación indeterminada, acción IA y revisión;
- ejecutar tests, lint, typecheck y build;
- revisar que no aparezcan porcentajes o niveles sin metodología.

## 9. Riesgos y limitaciones

1. **Confundir ejecución con evolución.** Completar siete acciones no demuestra mejora de salud, rentabilidad ni cambio de nivel.
2. **Datos insuficientes.** Sin motor de evaluación, cualquier nivel o color de salud sería una inferencia no respaldada.
3. **Misión no persistida.** No se debe inventar un identificador de misión; la primera versión puede presentar el objetivo estratégico existente como objetivo temporal.
4. **Densidad de información.** La restricción de una vista no debe resolverse con texto ilegible ni scroll interno excesivo.
5. **Historial heterogéneo.** Los planes antiguos pueden carecer de campos estratégicos nuevos; la UI debe representar “Sin evaluar” o “No disponible”.
6. **Semántica de evidencia.** `business_evidence` registra fuentes operativas, pero requiere reglas adicionales para convertirse en una evaluación.
7. **Rutas vacías.** La navegación nueva no se debe publicar hasta que cada destino tenga una experiencia funcional.

## 10. Criterios de aceptación para la futura implementación

1. La persona entiende el estado de su empresa y el siguiente paso sin leer un párrafo extenso.
2. La decisión del CEO IA es el elemento estratégico dominante.
3. Existe una sola acción primaria visible.
4. El ADN Empresarial tiene seis dimensiones con estados explicables.
5. La gamificación se basa en capacidades y evidencia, no en puntos arbitrarios.
6. No se muestran niveles, porcentajes o condiciones inventadas.
7. Los flujos actuales de ejecución, entregables, aprobación y revisión continúan operativos.
8. Los estados desconocidos, provisionales, bloqueados y de error son explícitos.
9. En escritorio, la información esencial cabe en las resoluciones objetivo bajo condiciones normales.
10. En móvil, la decisión y la acción actual preceden al detalle secundario.
11. Todos los componentes usan datos reales y contratos tipados.
12. No se realizan llamadas nuevas a OpenAI únicamente para pintar la UI.
13. Se mantienen RLS, separación de capas y ausencia de secretos en Client Components.

## 11. Archivos de esta propuesta e implementación

- `docs/business-evolution/ceo-command-center-v3.1.md`
- `docs/business-evolution/dashboard-ux-specification.md`
- `docs/business-evolution/dashboard-component-mapping.md`
- `src/lib/business-assessment.ts`
- `src/lib/business-assessment-adapter.ts`
- `src/components/business-evolution-card.tsx`
- `src/components/business-dna.tsx`
- `src/components/business-milestone-card.tsx`
- `src/components/strategic-mission-card.tsx`
- `tests/business-assessment.test.ts`
- `tests/fixtures/business-assessment-scenarios.ts`

## 12. Validación prevista

La implementación inicial se validó con:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```
