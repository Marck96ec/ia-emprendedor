# Contrato de memoria empresarial

`business_memory` guarda eventos `fact`, `constraint`, `capability`, `asset` y `learning`. Cada uno identifica negocio, clave, contenido, origen, referencia de origen, confirmación, observación, actualización y estado. La vigencia puede terminar por retiro o vencimiento. El recurso operativo distingue disponible, no disponible y desconocido.

| Origen | Confirmación en el flujo actual | Referencia |
|---|---|---|
| Declaración del propietario | `declared` o `confirmed` mediante RPC | Actor autenticado, con control de pertenencia |
| Cierre semanal | `declared` | Revisión que quedó guardada |
| Inferencia o evidencia vinculada | Tipos reservados en el esquema | La versión actual no escribe automáticamente candidatos de IA ni promueve evidencia a memoria confirmada |

La RPC serializa actualizaciones para una clave. Si la solicitud es idéntica devuelve el evento previo. Una corrección crea otro evento y enlaza `supersedes_id`. Cambiar disponibilidad entre disponible y ausente queda marcado como contradicción. El snapshot selecciona la versión que ya existía en la fecha solicitada y aplica después vencimiento o retiro. Una observación vencida no vuelve a activar una versión anterior.

Los cuatro recursos estructurados tienen prioridad y se conservan sin ventana de semanas. Los textos explícitos de diagnóstico aportan una señal conservadora de redes sociales cuando aún no existe declaración estructurada. La publicidad en internet por sí sola deja el recurso desconocido.

No hay backfill. El sistema no reconstruye estados antiguos con datos actuales. Los registros históricos de conocimiento aprobado, resultados y cierres permanecen accesibles por sus contratos. La migración no requiere reset y se verificó en PostgreSQL local. [Regresiones](./REGRESSION-REPORT.md).
