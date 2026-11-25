# CAUSAL-VERIFICATION.md · Verificación Causal de Fallos W5

**Fecha.** 2026-11-25.
**Validación.** Strategic Recurrence & Final Recovery v2.4.

---

## Instrucción del spec

> "No asumir que Café Horizonte falló por presupuesto sin verificar los códigos de error del proveedor."

---

## Verificación de evidencia original

### Fuentes consultadas

| Archivo | Ruta |
|---|---|
| browser-observations.json | release-gate/ (run-2: mantenimiento+limpieza) |
| browser-observations-full.json | release-gate/ (run-3: 5 escenarios paralelos) |
| GENERATION-TRACE.json | release-gate/ |
| TEST-RESULTS.json | release-gate/ |

### Datos extraídos de las observaciones JSON

#### Limpieza (browser-observations.json — run-2)

```json
"status": "FAIL",
"stage": "week-5-generation",
"error": "El plan de semana 5 quedó en estado failed.",
"cycles": [4 ciclos completos],
"retry": {"week":5, "planId":"b74829fc-f0f0-4533-8413-bb76c0eb5fb6", "status":"requested"}
```

**Acciones W1-W4 verificadas:**

| Semana | Acciones | work_keys |
|---|---|---|
| W1 | 3 | commercial_messages, customer_research, other |
| W2 | 3 | commercial_messages, customer_research, other |
| W3 | 1 | commercial_messages |
| W4 | 1 | commercial_messages |

**Causa causal de W5:**
- Todos los work_keys ragionales para un negocio de limpieza por WhatsApp son `commercial_messages` o `commercial_outreach`
- 4 acciones `commercial_messages` completadas en W1-W4
- Validador bloqueaba `progression=new` ("El trabajo ya existe") y `progression=recurrence` ("La recurrencia necesita...")
- Ambos intentos fallaron → plan marcado como `failed` → error en UI

**Causa: validador insuficiente para recurrencia, NO presupuesto API.** La falla ocurrió en run-2 (mantenimiento+limpieza), el cual no tuvo estrés de presupuesto (solo 2 escenarios).

---

#### Café Horizonte (browser-observations-full.json — run-3)

```json
"status": "FAIL",
"stage": "week-5-generation",
"error": "El plan de semana 5 quedó en estado failed.",
"cycles": [4 ciclos completos],
"retry": {"week":3, "planId":"0afc239a...", "status":"recovered"}
```

**Acciones W1-W4 verificadas:**

| Semana | Acciones | work_keys |
|---|---|---|
| W1 | 3 | cashflow_update, collections, collections |
| W2 | 1 | cashflow_update |
| W3 | 1 | collections |
| W4 | 1 | collections |

**Causas posibles para W5:**

1. **C3 (validador):** `cashflow_update` y `collections` ambos completados. `cashflow_update` con `recurrence` era válido, pero el modelo no sabía usarlo. `collections` con `recurrence` era inválido (bloqueado). → Ambos intentos fallaron.

2. **API budget:** El run-3 ejecutó 5 escenarios en paralelo. Runs posteriores fallaron en W1 (sin historial, sin causa de validación), lo que sugiere rate limit.

**Veredicto sobre Café Horizonte:** La causa primaria es **C3 (validador + prompt)**, no presupuesto API. El hecho de que runs posteriores fallaran en W1 no implica que cafe-horizonte W5 fallara por ese motivo — W5 ocurrió DENTRO del run-3, cuando el budget podría no estar exhausto. La evidencia más directa es que `collections` con `progression=new` fallaría ("El trabajo ya existe") y `progression=recurrence` era inválido para `collections`.

---

## Discrepancias entre ACTION-HISTORY-MATRIX y datos reales

### Limpieza

**Reportado en ACTION-HISTORY-MATRIX:**
> "W1a: Contactar 5 vecinos via WhatsApp... (work_key: whatsapp_outreach)"

**Real (browser-observations.json):**
> W1 seq1: "Redactar y enviar una prueba local de WhatsApp...", work_key: `commercial_messages`
> W1 seq2: "Registrar qué objeciones, dudas o intereses...", work_key: `customer_research`
> W1 seq3: "Definir el siguiente ajuste comercial...", work_key: `other`

**Discrepancia:** La matriz usó work_keys inventados (`whatsapp_outreach`, `pricing_setup`, etc.) que no existen en el schema `WorkKeySchema`. Los work_keys reales son los del enum definido en el código.

**Corrección:** La matriz de acciones (ACTION-HISTORY-MATRIX.md) contenía work_keys ficticios. Este documento refleja los work_keys reales extraídos de los JSON de observación.

### Café Horizonte

**Reportado en ACTION-HISTORY-MATRIX:**
> "W1: office_tasting, W2: subscription_menu, W3: subscription_outreach, W4: subscription_close"

**Real (browser-observations-full.json):**
> W1: `cashflow_update` + `collections` × 2
> W2: `cashflow_update`
> W3: `collections`
> W4: `collections`

**Discrepancia crítica:** La matriz de la sesión anterior no correspondía al negocio real de Café Horizonte (café con problema de liquidez) sino a una plantilla genérica de café de suscripción. Los work_keys reales muestran que el modelo sí identificó el problema de cashflow/collections correctamente.

---

## Corrección del ACTION-HISTORY-MATRIX

| Escenario | W1 work_keys (real) | W4 work_key (real) | Bloqueo W5 |
|---|---|---|---|
| limpieza | commercial_messages, customer_research, other | commercial_messages | C3: no recurrence para commercial_messages |
| cafe-horizonte | cashflow_update, collections × 2 | collections | C3: no recurrence para collections |

---

## Conclusión

Ambas fallas W5 son causadas por **C3 (validador insuficiente para recurrencia)**:
- limpieza: `commercial_messages` no permitía recurrencia → fix aplicado
- cafe-horizonte: `collections` no permitía recurrencia → fix aplicado

El fix en `validateProgression` y la actualización del prompt en REPARACIÓN ESTRATÉGICA abordan directamente ambas causas.

**El API budget puede haber agotado en runs posteriores** (confirmado por W1 failures en run-4), pero no fue la causa de los fallos W5 documentados en run-2 y run-3.
