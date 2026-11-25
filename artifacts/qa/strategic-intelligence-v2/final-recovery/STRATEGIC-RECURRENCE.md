# STRATEGIC-RECURRENCE.md · Recurrencia Estratégica Legítima

**Fecha.** 2026-11-25.
**Validación.** Strategic Recurrence & Final Recovery v2.4.
**Branch.** `feature/strategic-intelligence-v2`.

---

## Problema identificado

El validador `validateProgression` en `src/lib/strategic-action.ts` solo permitía `progression=recurrence` para `work_key: cashflow_update`. Todas las demás actividades periódicas legítimas eran bloqueadas con:

> "La recurrencia necesita una actividad periódica registrada y un período posterior distinto."

Esto provocaba que en W5 (con historial de 4 ciclos completados), el modelo no pudiera proponer:
- Una nueva ronda de cobros (`collections`)
- Una nueva ronda de mensajes a nuevos contactos (`commercial_messages`)
- Seguimiento de prospectos en nuevo período (`lead_follow_up`)
- Medición operativa recurrente (`operations_measure`)
- Nueva ronda de captación comercial (`commercial_outreach`)

---

## Causa raíz verificada

### Limpieza Muebles (W5)

Historial acumulado W1-W4: 4 acciones con `work_key: commercial_messages/commercial_outreach`. Con `progression=new`, el validador retorna "El trabajo ya existe". Con `progression=recurrence`, retornaba "La recurrencia necesita..." porque `commercial_messages` no estaba en la lista de keys recurrentes.

### Café Horizonte (W5)

Historial acumulado W1-W4: `cashflow_update` (W1, W2) y `collections` (W1, W3, W4). El modelo podría haber usado:
- `cashflow_update` con `recurrence` (ya permitido, pero el modelo no sabía usarlo correctamente en REPARACIÓN ESTRATÉGICA)
- `collections` con `recurrence` (bloqueado — no estaba en la lista)

---

## Fix implementado

### Archivo: `src/lib/strategic-action.ts`

**Antes:**
```ts
if (strategy.progression === "recurrence") {
  if (key === "cashflow_update" && related?.status === "completed"
    && matches.some((action) => action.id === related.id) && strategy.period_week === targetWeek
    && (related.strategy?.period_week ?? related.week) < targetWeek) return null;
  return "La recurrencia necesita una actividad periódica registrada y un período posterior distinto.";
}
```

**Después:**
```ts
const RECURRENT_ACTIVITY_KEYS = new Set<WorkKey>([
  "cashflow_update", "collections", "commercial_messages", "commercial_outreach", "lead_follow_up", "operations_measure",
]);

if (strategy.progression === "recurrence") {
  if (RECURRENT_ACTIVITY_KEYS.has(key) && related?.status === "completed"
    && workKeyFor(related.action, related.strategy) === key
    && strategy.period_week === targetWeek
    && (related.strategy?.period_week ?? related.week) < targetWeek) return null;
  return "La recurrencia necesita una actividad periódica registrada y un período posterior distinto.";
}
```

**Cambios clave:**
1. `cashflow_update` → `RECURRENT_ACTIVITY_KEYS.has(key)`: amplía a 6 work_keys recurrentes
2. `matches.some(a => a.id === related.id)` → `workKeyFor(related.action, related.strategy) === key`: verifica directamente que la acción referenciada tiene el mismo work_key, sin depender de la similitud de texto
3. `RECURRENT_ACTIVITY_KEYS` definido a nivel de módulo (const, no inline)

### Archivo: `src/lib/ai/generate-ceo-plan.ts`

1. **CONTRATO DE CONTEXTO**: Generalizada la descripción de recurrencia de "flujo de caja" a todas las actividades periódicas con lista explícita de work_keys permitidos.

2. **REPARACIÓN ESTRATÉGICA** (`completedHistoryRef`): Añadida opción `progression=recurrence` como alternativa cuando se agota el historial, junto con instrucciones concretas.

---

## Protecciones preservadas

La recurrencia requiere:
1. `work_key` en `RECURRENT_ACTIVITY_KEYS` — solo actividades periódicas definidas
2. `prior_action_id` apuntando a una acción **completada** del mismo work_key
3. `workKeyFor(related.action, related.strategy) === key` — el referente es del mismo tipo
4. `period_week === targetWeek` — declara el nuevo período explícitamente
5. `related.period_week < targetWeek` — el referente es de un período anterior

**Lo que NO pasa la validación:**
- Cambiar solo el título (sin `progression=recurrence`)
- Usar el mismo `period_week` que la acción previa
- Referenciar una acción incompleta (pending)
- Work_keys no periódicos (`offer_definition`, `channel_setup`, `owner_delegation`, `customer_research`, `other`)

---

## Work_keys recurrentes vs no recurrentes

| Work_key | Recurrente | Justificación |
|---|---|---|
| `cashflow_update` | ✅ | Seguimiento semanal/periódico de caja |
| `collections` | ✅ | Nuevas rondas de cobros en cada período |
| `commercial_messages` | ✅ | Nueva ronda a nuevos contactos |
| `commercial_outreach` | ✅ | Nueva captación en nuevo período |
| `lead_follow_up` | ✅ | Seguimiento de nuevos prospectos |
| `operations_measure` | ✅ | Control de calidad periódico |
| `offer_definition` | ❌ | Se define una vez; se profundiza con advance |
| `channel_setup` | ❌ | Setup único; repetir no agrega valor |
| `owner_delegation` | ❌ | Decisión de delegación puntual |
| `customer_research` | ❌ | Investigación de mercado no es periódica por defecto |
| `other` | ❌ | Categoría genérica; no garantiza periodicidad |

---

## Tests añadidos (6 casos determinísticos)

Archivo: `tests/strategic-intelligence.test.ts`

| Test | Work_key | Resultado esperado |
|---|---|---|
| Seguimiento de prospectos en semana posterior | `lead_follow_up` | PASS (recurrence válida) |
| Repetición injustificada → bloqueo + recurrence válida | `lead_follow_up` | FAIL new / PASS recurrence |
| Seguimiento periódico de cobros | `collections` | PASS recurrence / FAIL new |
| Control operativo recurrente | `operations_measure` | PASS recurrence |
| Recurrencia sin período posterior válido | `collections` | FAIL (mismo period_week) |
| Negocio 4h + 4 semanas historial | `collections` W1-W4 | PASS recurrence W5 / FAIL new W5 |

**Resultado: 190/190 tests PASS, 0 fail, 4 skipped (integración Supabase).**

---

## Verificación técnica

```
npm run typecheck  → 0 errors
npm run lint       → 0 errors, 4 warnings preexistentes en QA artifact
npm test           → 190/190 pass (186 unit + 4 Supabase skipped)
```
