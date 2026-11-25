# QA del Strategic Intelligence Engine v2.0

La suite estándar aprobó 177 pruebas. Las cuatro integraciones se ejecutaron por separado en Supabase local y aprobaron. Las dos migraciones se aplicaron únicamente en el entorno local. También pasaron lint, comprobación de tipos, build y `git diff --check`. La primera integración falló por desfase de reloj entre Auth y PostgREST. Dos ejecuciones secuenciales posteriores aprobaron.

## Datos y alcance

La evidencia de producción corresponde a los hallazgos anonimizados del brief. La falta de redes sociales es una restricción sintética derivada del feedback. WhatsApp, contactos y valores de prueba se declararon de forma expresa en cada fixture. Los USD 400 de los dos recorridos nuevos son ingresos brutos de prueba para completar el diagnóstico persistido. No se usaron para deducir beneficio, liquidez o madurez.

Café Horizonte, Nova Studio y Taller Andino se consultaron como referencia en la rama QA. Sus ingresos brutos de prueba fueron USD 8.500, USD 4.500 y USD 18.000 respectivamente. Los dos últimos importes fueron autorizados como ampliación de la auditoría original. El repositorio local no contiene la carpeta `extended-4-weeks` en esa rama.

La semana 8 se simuló en PostgreSQL consultando el recurso declarado en fechas de semanas 5 y 8 y comprobando su efecto en el contexto de planificación. También se comprobó que una contradicción posterior conserva el valor histórico en una consulta anterior. [Contrato de memoria](./BUSINESS-MEMORY-CONTRACT.md).

## Recorridos con proveedor real

| Escenario | Plan inicial y ejecución | Cierre y aprendizaje | Segundo plan |
|---|---|---|---|
| Limpieza de muebles | Se ejecutaron y guardaron las tres acciones de la semana 1. Una repetición posterior falló durante la generación inicial. | Revisión y memoria persistidas. | Estado `failed`. |
| Mantenimiento de hogares | Se ejecutaron y guardaron las tres acciones de la semana 1 en el recorrido con el ajuste final. | Revisión y memoria persistidas. Se guardaron el estado evaluado `inconclusive` y la percepción `validated`. | Estado `failed`. |

Cada fila resume el recorrido que llegó más lejos. Ninguno completó un ciclo que incluyera la preparación del siguiente plan. El fallo quedó visible en el dashboard y el cierre persistido permaneció recuperable. [Primer recorrido](./browser-observations.json) · [Recorrido final](./browser-observations-final.json) · [Cierre de mantenimiento](./screenshots/final/mantenimiento/semana-1-percepcion-y-evidencia.png).

## Criterios y límites de la verificación

- **Factibilidad.** El plan rechaza recursos declarados ausentes y exige completar las dependencias. Los recursos desconocidos quedan visibles para confirmación antes de ejecutar. El caso acotado de WhatsApp y contactos aprobó en las pruebas determinísticas y en generaciones reales de limpieza.
- **Aprendizaje.** La prueba de regresión reproduce una validación sin evidencia en la referencia. El cierre v2 evalúa esa hipótesis como inconclusa y conserva el estado declarado. La comprobación en navegador y la integración de memoria cubren persistencia en sus respectivos recorridos.
- **Progresión.** Las pruebas detectan el solapamiento con la oferta anterior y verifican continuaciones, avance, recurrencia y retrabajo. Las generaciones con IA real muestran que persistir un plan coherente sigue dependiendo de que el modelo elija una acción factible y una relación válida.
- **Diseño.** En ambos negocios, los cuatro bloques principales quedaron dentro del viewport en los cuatro tamaños de escritorio. A 1280 × 720, el bloque de ejecución terminó en y = 691 para limpieza y y = 711 para mantenimiento. A 390 × 844, la acción primaria terminó en y = 781 con área útil de 787 px y desplazamiento vertical para el resto del tablero. Las diez mediciones tuvieron cero desbordamiento horizontal. El detalle conserva acceso a los textos completos desde el cajón de decisión y el plan. [1280 × 720](./screenshots/final/mantenimiento/semana-1-1280x720.png) · [390 × 844](./screenshots/limpieza/semana-1-390x844.png) · [Recursos](./screenshots/limpieza/canales-y-recursos.png).

## Dictámenes

| Dimensión | Dictamen | Evidencia |
|---|---|---|
| Functional | **NO GO** | La generación del segundo plan falló en los dos recorridos que guardaron el cierre. |
| Memory | **GO** | Restricciones persistentes, correcciones versionadas, aprendizajes guardados y consultas temporales locales. |
| Feasibility | **GO para las restricciones verificadas** | Canal ausente, dependencia de la misma semana en la base y estado explícito para recursos desconocidos. |
| Strategic Progression | **NO GO** | Las guardas funcionan para casos probados. La generación y el paso al siguiente ciclo todavía son variables. |
| Evidence Integrity | **GO para la regresión verificada** | La revisión de mantenimiento guardó la evaluación inconclusa y conservó la percepción declarada. |
| Security | **GO en Supabase local** | Dos propietarios independientes y escritura directa rechazada. |
| Product Design | **GO en las resoluciones y muestras verificadas** | Los cinco tamaños conservaron acceso a la acción principal. |
| CEO Intelligence | **Parcial** | Mejora en algunos planes aceptados, con fallos de generación que interrumpen la continuidad real. |

## Funcionalidades y cobertura diferidas

Quedan pendientes la confirmación de cuatro ciclos por escenario, las nuevas ejecuciones E2E de Café Horizonte, Nova Studio y Taller Andino y ampliar el reconocimiento semántico más allá de los tipos de trabajo cubiertos. El formulario permite declaraciones explícitas de recursos; la extracción automática de candidatos de texto libre requeriría confirmación y revisión adicional. La evaluación de semana 8 comprueba recuperación histórica y construcción de contexto bajo tiempo controlado.

[Reproducción](./baseline-reproduction.json) · [Pruebas y medidas](./TEST-RESULTS.json) · [Comparación con el proveedor](./BEFORE-AFTER-COMPARISON.md).
