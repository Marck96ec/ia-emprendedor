# Comparación con IA real

La referencia se cargó de `a43187b8583f281ebdd701e3ae6499cd3084f8b5` con `git show`. El proveedor recibió los mismos negocios y puntos de control sintéticos. En v2 se incluyó el contexto estructurado y, en mantenimiento, la reevaluación de la revisión. Hubo tres generaciones independientes por negocio y versión en la primera ronda. Dos rondas adicionales ejecutaron tres generaciones por negocio para verificar los ajustes. Cada generación podía hacer hasta dos intentos.

| Negocio y versión | Planes aceptados | Planes aceptados con solapamiento sin vínculo | Mediana por generación | Tokens de entrada / salida totales |
|---|---:|---:|---:|---:|
| Mantenimiento, referencia | 3/3 | 3 | 19,87 s | 20.142 / 8.112 |
| Mantenimiento, v2 inicial | 1/3 | 0 | 38,36 s | 37.655 / 14.859 |
| Mantenimiento, v2 ajustado | 0/3 | — | 36,54 s | 45.922 / 16.987 |
| Mantenimiento, v2 final | 2/3 | 0 | 16,61 s | 30.829 / 10.025 |
| Limpieza, referencia | 0/3 | — | 34,71 s | 36.736 / 14.805 |
| Limpieza, v2 inicial | 0/3 | — | 35,27 s | 41.794 / 16.157 |
| Limpieza, v2 ajustado | 2/3 | 0 | 18,33 s | 27.994 / 11.329 |
| Limpieza, v2 final | 2/3 | 0 | 30,67 s | 35.573 / 12.874 |

La referencia de mantenimiento aceptó tres planes con al menos un solapamiento con trabajo previo sin vínculo explícito. El plan aceptado de v2 reutilizó la oferta anterior y cambió el problema a resolver. La ronda ajustada rechazó los tres planes cuando el modelo enlazó una continuación a un trabajo distinto o un avance a un pendiente. La diferencia en aceptación sigue siendo un bloqueo importante para la continuidad.

Los dos planes aceptados de limpieza usaron WhatsApp y contactos declarados, con validación en la zona de servicio. Las propuestas ajustadas conectaron la creación de un mensaje, la prueba local y el análisis de respuestas. La referencia excedió el límite de acciones asistidas en sus tres generaciones. Un plan de limpieza ajustado pidió una propuesta de valor que aún no estaba disponible.

La ronda final admitió cuatro de seis planes. Persistieron dos rechazos. Mantenimiento referenció un prerrequisito histórico pendiente y limpieza asignó confianza alta con varias incógnitas. Los siete planes aceptados en las tres rondas v2 tuvieron cero acciones bloqueadas en el control aplicado. La muestra es pequeña y sujeta a variabilidad del proveedor. El contexto adicional y los reintentos elevaron el consumo total en mantenimiento frente a la referencia. Los costes de la comparación se expresan en tokens reportados por el proveedor.

La revisión manual de la ronda final encontró que «Registrar y clasificar cada respuesta» se había marcado como nueva aunque retomaba el pendiente de registrar y clasificar respuestas. El indicador automatizado de la tabla quedó en cero porque el detector aún omitía esa redacción. Se ajustó la detección al reproducir el caso en una prueba determinística. Las cifras con el proveedor corresponden a las ejecuciones observadas antes de esa última corrección léxica.

[Registros de la ronda inicial](./model-evaluations.json) · [Ronda ajustada](./model-evaluations-adjusted.json) · [Ronda final](./model-evaluations-final.json) · [Ejecutor](./evaluate-model.mjs).
