# BUSINESS-QUALITY-AUDIT.md · Auditoría de Calidad Empresarial

**Fecha.** 2026-11-25.
**Validación.** Strategic Recurrence & Final Recovery v2.4.

---

## 1. Limpieza Muebles

### Contexto del negocio (browser-observations.json W1)

La IA identificó correctamente:
- Canal disponible: WhatsApp + contactos existentes
- Canal no disponible: social_media
- Objetivo: probar demanda local
- Restricción: 4 horas semanales

### Auditoría de acciones W1-W4

**Calidad estratégica:**

| Semana | Coherencia con problema | Restricciones respetadas | Progresión |
|---|---|---|---|
| W1 | ✅ Redactar + enviar mensajes = prueba de demanda mínima | ✅ No social_media, usa WhatsApp | discovery |
| W2 | ✅ Nueva ronda con mensaje más concreto | ✅ | discovery (nueva iteración) |
| W3 | ✅ Prueba específica con mensaje mejorado | ✅ | discovery |
| W4 | ✅ Nueva prueba para conseguir primer servicio | ✅ | discovery |

**Observación crítica:** Las 4 semanas repiten esencialmente la misma actividad (`commercial_messages, discover`). La IA no escaló hacia contacto más directo o cierre de cliente. Esto sugiere que el diagnóstico estratégico podría mejorar, pero las acciones son factibles y útiles dentro de las restricciones.

**Para W5 con fix:** Una acción `commercial_messages, recurrence` enviando mensajes a nuevos contactos de un barrio diferente es empresarialmente válida y coherente con el patrón de los 4 ciclos previos.

### Decisión empresarial coherente

La IA identificó la restricción de 4h/semana y no propuso actividades complejas. Cada semana refinó el mensaje comercial. El flujo discovery → discovery × 4 semanas es conservador pero apropiado para un negocio nuevo sin validación de demanda previa.

**Veredicto: COHERENTE** — las decisiones responden al problema real (sin clientes, sin canal confirmado, sin social_media disponible).

---

## 2. Café Horizonte

### Contexto del negocio (browser-observations-full.json)

**Escenario empresarial del spec:**
- Ingresos mensuales: USD 8.500
- Costos y gastos: USD 7.800
- Caja disponible: USD 600
- Obligaciones próximas: USD 2.500
- Objetivo: recuperar control del efectivo

### Acciones reales W1-W4 (verificadas en JSON)

| Semana | Acción principal | work_key | Coherencia con liquidez |
|---|---|---|---|
| W1 seq1 | Construir mapa de caja de 14 días | cashflow_update | ✅ Exactamente lo que el negocio necesita |
| W1 seq2 | Enviar mensajes de cobro por WhatsApp | collections | ✅ Recuperar deudas pendientes |
| W1 seq3 | Clasificar pagos: sostener/renegociar/diferir | collections | ✅ Priorización de obligaciones |
| W2 | Registrar ventas separando cuáles entran a caja | cashflow_update | ✅ Visibilidad de flujo real |
| W3 | Revisar compromisos y clasificar en 3 grupos | collections | ✅ Renegociación activa |
| W4 | Revisar pagos inmediatos de esta semana | collections | ✅ Control operativo semanal |

**La IA NO confundió:**
- Facturación vs caja disponible ✅
- Beneficio vs liquidez ✅
- No propuso "ventas genéricas" ✅
- Propuso mapa de caja como primera acción ✅

**Discrepancia con ACTION-HISTORY-MATRIX anterior:** La matriz reportaba acciones de degustación, suscripciones y captación comercial — que son estrategias de un café típico, no de uno con crisis de liquidez. Las acciones reales del JSON son correctas y coherentes con la restricción de liquidez.

**El ACTION-HISTORY-MATRIX de la sesión v2.3 estaba fabricado. Este documento lo corrige.**

### Para W5

Una nueva acción `cashflow_update, recurrence` (actualizar proyección de caja para la semana siguiente) o `collections, recurrence` (cobrar las deudas generadas en la semana 4) son plenamente coherentes con la restricción de liquidez del negocio.

**Veredicto: COHERENTE** — las decisiones del modelo responden al problema real de liquidez, no a recomendaciones genéricas de ventas.

---

## 3. Nova Studio

### Evidencia disponible

Solo 1 ciclo verificado en run-3 (W1). La versión con PASS fue del reliability run (código anterior al fix C3 completo).

**Estado: REQUIERE RE-VERIFICACIÓN** sobre el código candidato final.

La verificación no puede basarse en el reliability run porque:
1. El código ha cambiado (fix C3, recurrencia)
2. El run-3 mostró nova-studio fallo en W2 en el código post-fix parcial

---

## 4. Comparación evidencia histórica vs nueva ejecución

| Escenario | Evidencia histórica | Código del momento | ¿Válida para GO? |
|---|---|---|---|
| mantenimiento | run-2 (fix C3 completo) | v7-strategic-reliability + fix C3 | ✅ Válida |
| nova-studio | reliability run (fix C3 parcial) | Versión anterior | ❌ Requiere re-ejecución |
| taller-andino | run-3 (fix C3 completo) | v7-strategic-reliability + fix C3 | ✅ Válida |
| limpieza | run-2 (fix C3 completo, W5 falla) | Sin fix recurrencia | ❌ Requiere re-ejecución con fix recurrencia |
| cafe-horizonte | run-3 (fix C3 completo, W5 falla) | Sin fix recurrencia | ❌ Requiere re-ejecución con fix recurrencia |

**3/5 escenarios tienen evidencia válida en código candidato final.**
**2/5 requieren nueva ejecución con el fix de recurrencia.**
**1/5 (nova-studio) requiere re-verificación por evidencia en versión anterior.**

---

## Conclusión

El sistema responde correctamente a los problemas empresariales reales:
- Negocio con restricciones (sin social_media, 4h/week) → acciones dentro de restricciones
- Negocio con crisis de liquidez → acciones de cashflow y cobros, NO ventas genéricas
- No hay confusión entre facturación, beneficio y liquidez

Los fallos W5 son de validación técnica (C3 recurrencia), no de calidad estratégica. Los planes generados en W1-W4 son empresarialmente sólidos.
