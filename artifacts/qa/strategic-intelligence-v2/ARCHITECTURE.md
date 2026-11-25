# Arquitectura del motor estratégico

| Componente | Entrada | Salida y frontera |
|---|---|---|
| Memoria | Declaraciones del propietario y revisión guardada | Eventos versionados por negocio. RPC de mutación con comprobación de propietario y consulta temporal bajo RLS. |
| Constructor de contexto | Diagnóstico, memoria, planes listos, revisión, evidencia y conocimiento aprobado | Restricciones y activos explícitos, historial resumido, resultados recientes y conocimiento reutilizable. |
| Generador | Contexto estratégico y schema estructurado | Decisión, hipótesis, continuidad y plan. Hasta dos intentos con errores de validación útiles para reparar. |
| Validador | Acciones, capacidades, estado de recursos, historial y evidencia | Plan aceptado para la RPC transaccional o fallido recuperable. Recursos ausentes y dependencias inválidas se rechazan. |
| Ejecución | Plan persistido, recurso vigente y estado de acción | Acciones elegibles y contexto de bloqueo. La base controla el orden en el registro de resultados. |
| Cierre | Resultado, evidencia y percepción | Evaluación de hipótesis, aprendizaje y luego siguiente plan. El aprendizaje queda vinculado a la revisión. |

`ceo_plans.weekly_plan` conserva la estrategia por secuencia dentro del JSON que ya guarda `complete_ceo_plan`. `weekly_actions` sigue siendo la fuente del estado de ejecución. `business_knowledge` conserva artefactos aprobados. `business_evidence` conserva hechos operativos declarados. `business_memory` agrega observaciones persistentes y referencias, sin promover resultados declarados a confirmaciones externas.

La migración de memoria es aditiva y la de dependencias añade un disparador antes de completar acciones. La preparación de un plan fallido usa el flujo de reintento existente. Las semanas históricas con una hipótesis inconsistente se interpretan de forma conservadora al leerlas. Los registros guardados se conservan.

Los modelos interpretan la información y proponen una estructura. TypeScript verifica referencias, factibilidad y progresión. PostgreSQL protege pertenencia, serializa cambios de memoria por recurso y garantiza el orden de dependencias al completar. El motor sigue en el SDK existente, sin otro framework ni índice vectorial.
