# FEEDBACK-REGRESSION.md · Regresión de Feedback

**Fecha.** 2026-11-24.
**Alcance.** Verificar que el pipeline de feedback (`business-feedback.ts`, `business-memory.ts`, `restoreReviewFeedback`) procesa correctamente los patrones definidos en el spec de auditoría sección 13.

---

## Metodología

Revisión estática del código fuente. No se ejecutaron pruebas de integración con base de datos real (requieren presupuesto autorizado y conexión local).

---

## 1. Pipeline de feedback

### Flujo observado en `src/lib/strategic-context-server.ts`

```typescript
export async function loadStrategicContext(...): Promise<StrategicContext> {
  const [memoryRows, knowledge, plans] = await Promise.all([
    loadBusinessMemory(supabase, businessId, targetWeek),
    loadBusinessKnowledge(supabase, businessId),
    // plans query...
  ]);
  // ...
  const context = buildStrategicContext({ ... });
  if (previousFeedback) {
    return restoreReviewFeedback(context, previousFeedback);
  }
  return context;
}
```

`restoreReviewFeedback` toma el feedback de la semana anterior y lo integra en la memoria del contexto si es más reciente que la memoria almacenada. Esto evita perder feedback que aún no fue persistido como memoria formal.

### Hallazgo: feedback no persistido puede perderse

Si la función de creación del plan falla antes de completar la fase de persistencia (fase `"persistence"`), el feedback de la semana anterior puede no estar en la tabla `business_memory` cuando se carga el contexto de la semana siguiente. `restoreReviewFeedback` mitiga esto siempre que `previousFeedback` sea pasado por el caller.

En `src/actions/ceo-plan.ts`, `previousFeedback` se carga del plan anterior. Si el plan anterior quedó en estado `"failed"`, la carga puede devolver `null`. **Riesgo: feedback perdido cuando el plan previo falló.**

---

## 2. Patrones de feedback social media (spec sección 13)

El spec menciona 12 patrones de redes sociales. Se verificó el código de `business-feedback.ts`.

### Archivo localizado
`src/lib/business-feedback.ts` — maneja la generación de feedback de aprendizaje a partir de las acciones completadas.

### Patrón verificado: `social_media unavailable`

Cuando la memoria tiene `social_media: unavailable`, el contexto estratégico incluye ese recurso como `unavailable`. El prompt instrucción dice:
```
Si un canal está unavailable, no programes utilizarlo.
```

El evaluador verifica este patrón: `memory("social_media", "unavailable", "1")`. Los 10/10 casos con `social_media: unavailable` pasaron.

### Patrón verificado: `whatsapp available`

Los escenarios de limpieza usan `memory("whatsapp", "available", "2")`. El contexto incluye `whatsapp: available`. El modelo puede reutilizarlo sin bloqueo de factibilidad.

### Patrones no verificados experimentalmente

Los 12 patrones completos del spec sección 13 no se ejecutaron en el evaluador actual. El evaluador cubre 2 de los 12. Los 10 restantes requieren fixtures adicionales que no están en `evaluate-model.mjs`.

**Recomendación**: ampliar el evaluador con los 12 patrones de feedback como escenarios separados en una versión v8.

---

## 3. `validateProgression()` y retroalimentación de progresión

### Mecanismo
`validateProgression()` en `src/lib/strategic-action.ts` verifica que:
- `progression = "continuation"` requiere `prior_action_id` existente en historial con mismo `work_key` e `intent`.
- `progression = "advance"` requiere acción previa completada.
- `progression = "rework"` requiere `new_evidence_id` válido.

### Hallazgo: acumulación de historia aumenta fallos de progresión (C3)

Con historial de 1-3 acciones (evaluador), el modelo tiene pocas opciones incorrectas. Con historial de 6-9 acciones (semanas 3-4), el modelo puede elegir referencias de continuación a acciones ya cerradas que el validador rechaza.

**Estado**: el fix actual (Cambio 1) provee los IDs válidos pero no guía explícitamente sobre qué tipo de progresión es apropiada. Para C3 se necesitaría también incluir en el prompt de reparación los `work_key` de acciones pendientes que pueden ser retomadas como `continuation`.

---

## 4. Resumen de riesgos de regresión

| Riesgo | Probabilidad | Impacto | Mitigado por fix |
|---|---|---|---|
| Feedback perdido cuando plan previo falló | Media | Contexto incompleto semana N+2 | No |
| `social_media` incorrecto en prompt | Baja | Acciones bloqueadas | No (ya correcto) |
| Validación de progresión con historial >6 acciones | Alta | Fallo semana 4+ | Parcialmente |
| `restoreReviewFeedback` no llamado | Baja | Feedback perdido ciclo | No (ya correcto) |
