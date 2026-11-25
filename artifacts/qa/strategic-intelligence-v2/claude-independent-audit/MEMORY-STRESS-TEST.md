# MEMORY-STRESS-TEST.md · Prueba de Estrés de Memoria

**Fecha.** 2026-11-24.
**Alcance.** Verificar comportamiento del motor de memoria de negocio (`business-memory.ts`, `loadBusinessMemory`) bajo condiciones de alto volumen y contradicciones.

---

## Metodología

Revisión estática del código fuente. No se ejecutaron pruebas de carga contra base de datos local (requieren presupuesto autorizado).

---

## 1. Implementación de `loadBusinessMemory`

### Código relevante en `src/lib/strategic-context-server.ts`

```typescript
async function loadBusinessMemory(supabase, businessId, targetWeek) {
  const PAGE_SIZE = 100;
  let page = 0;
  const rows: MemoryRow[] = [];
  for (;;) {
    const { data, error } = await supabase.rpc("business_memory_as_of", {
      p_business_id: businessId,
      p_as_of_week: targetWeek,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    });
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return rows;
}
```

### Comportamiento verificado
- Paginación correcta: loop hasta que `data.length < PAGE_SIZE`.
- Lanza el error de DB si `error` está presente.
- No tiene timeout propio: depende del timeout del cliente Supabase.

### Riesgo de timeout (C4)
Si la tabla `business_memory` tiene >1000 registros para un negocio y el RPC `business_memory_as_of` es lento, el loop puede alcanzar el timeout del cliente Supabase antes de completar. Esto produce `CEO_PLAN_CONTEXT_LOAD_FAILED` sin detalles del fallo.

---

## 2. Comportamiento con 24+ registros de memoria

### `buildStrategicContext` limita la memoria visible al modelo

```typescript
// src/lib/strategic-context.ts
memory: {
  facts: memoryFacts.slice(0, 10),
  learnings: memoryLearnings.slice(0, 10),
}
```

Los primeros 10 hechos y 10 aprendizajes son pasados al modelo. Los registros posteriores no son visibles en el prompt. Esto significa que con 24+ registros, 4+ registros de hechos y/o aprendizajes son silenciosamente descartados.

**Hallazgo**: la memoria no prioriza por relevancia — toma los primeros 10. Si los registros más recientes están al final del sort del RPC, pueden ser omitidos.

**Recomendación futura**: ordenar `business_memory_as_of` por `updated_at DESC` y tomar los 10 más recientes, en lugar de los 10 primeros.

---

## 3. Versioning de registros de memoria

### Mecanismo RPC `business_memory_as_of`

El RPC devuelve el registro más reciente por `memory_key` para la semana dada (`p_as_of_week`). Esto implementa versionado por clave: si un hecho cambia entre semana 1 y semana 3, la semana 4 ve la versión de semana 3.

### Contradicciones entre registros

Si dos registros tienen la misma `memory_key` pero valores contradictorios en diferentes semanas, el RPC devuelve el más reciente. No hay detección de contradicción. El modelo recibe solo la versión vigente.

**Hallazgo**: este comportamiento es correcto para la mayoría de casos. El riesgo es que una corrección errónea de semana N oculte la información correcta de semana N-1.

---

## 4. Escenario de estrés: 24 registros de evidencia

### `recentEvidence` en `buildStrategicContext`

```typescript
recentEvidence: evidenceRows.slice(0, 24).map(row => ({
  id: row.id, certainty: row.certainty, ...
})),
```

Con 24 filas de evidencia, todas se pasan al modelo. Con >24, las más antiguas son descartadas. `evidenceIds` para validación solo incluye las 24 mostradas al modelo, lo que es correcto: el modelo no puede referenciar lo que no ve.

### Escenario de fallo potencial

Si un negocio acumula muchas evidencias con `certainty = "unknown"` (por ejemplo, 20 de 24), los `evidenceIds` válidos para `new_evidence_id` serían solo 4. El modelo podría elegir un `unknown` que falla validación. El fix (Cambio 1) provee la lista de IDs válidos en el prompt de reparación, mitigando este escenario en el intento 2.

---

## 5. Resumen de hallazgos de memoria

| Hallazgo | Severidad | Estado |
|---|---|---|
| Paginación correcta, sin timeout propio | Bajo riesgo | Sin cambio necesario |
| Memoria truncada a 10 sin priorización por relevancia | Medio | No abordado en este sprint |
| Versioning por clave correcto | Sin riesgo | Verificado |
| Evidencias con certainty=unknown pueden agotar `evidenceIds` | Medio | Mitigado por Cambio 1 |
| Sin logging detallado de fallo de contexto | Medio (C4) | No abordado en este sprint |
