# CEO Intelligence Review · v3.3

**Evaluación: parcial.** En los tres ciclos, el CEO distinguió la restricción principal y propuso una segunda prueba más informativa. El contrato de entregables y la calidad de captura aún limitan el aprendizaje verificable.

## Semana 1 · Diagnósticos distintos y rastreables

| Negocio | Decisión y fundamento | Hipótesis y prueba | Ejecución |
|---|---|---|---|
| Café Horizonte | Priorizar liquidez. El agente citó USD 600 de caja frente a USD 2.500 próximos a vencer, aun con ventas regulares de USD 8.500. Conservó el margen por producto y las fechas de cobro como incógnitas. | Un mapa de caja y el orden de cobros y pagos deben mostrar si se cubren los vencimientos o cuánto sigue faltando. | 3 manuales. Mapa a 14 días, jerarquía y renegociación de pagos, contacto con clientes de pago posterior. 8 de 12 h. |
| Nova Studio | Concentrar la propuesta de valor y probar mensajes consistentes. El volumen depende de recomendaciones, la oferta cambia y el equipo tiene capacidad. El diagnóstico de posicionamiento es una hipótesis plausible, con demanda y conversión aún por medir. | Observar respuestas, interés cualificado y llamadas después de mantener la propuesta constante. | 4 acciones, una asistida. Propuesta manual, dos ofertas con IA, guion y prueba con prospectos. 7,5 de 8 h. |
| Taller Andino | Estandarizar decisiones y delegar con límites. La demanda existe y compras, cotizaciones y coordinación esperan al propietario. Se pospuso crecer mientras se prueba continuidad. | El equipo debe resolver casos habituales sin escalar todos y registrar las esperas que queden. | 3 manuales. Delimitar cinco decisiones, plantilla de cotización y prueba con un pedido. |

La decisión inicial mostró confianza media en los tres casos. Las evidencias internas apuntaron a los campos de contexto de cada empresa. La facturación de Nova y Taller se introdujo con autorización como ingreso bruto declarado. Sus planes usaron señales comerciales y operativas, con incógnitas abiertas de conversión y retrasos, respectivamente. [Planes y campos de evidencia](./reports/observations.json).

## Semana 2 · Aprendizaje observado

Los tres cierres quedaron guardados con resultado parcial e hipótesis inconclusa. Los planes de semana 2 enlazaron el plan previo y guardaron continuidad `deepening`. Conservar la dirección y cambiar la prueba fue razonable en estos escenarios.

| Negocio | Qué aprendió | Cómo cambió el experimento | Juicio |
|---|---|---|---|
| Café Horizonte | La conciliación mejoró visibilidad. El efectivo sigue en USD 600 y todavía falta evidencia de cobros recibidos. | Pasó del mapa general a verificar cobros antes de vencimientos y decidir qué pagar, negociar o diferir. Añadió una acción asistida de cobro. | Preserva caja como prioridad y define una señal verificable. El monto esperado no es una entrada realizada. |
| Nova Studio | Hubo dos respuestas y una llamada solicitada de tres contactos sintéticos. La muestra no separa perfil, origen y mensaje. | Pide cinco perfiles comparables, registro de respuesta por origen y una versión final del mensaje condicionada a un patrón repetido. | Reconoce el tamaño de la muestra y evita ampliar canales sin aprender de la prueba. |
| Taller Andino | Cinco pedidos observados y tres esperas. Una compra estándar se resolvió con un límite aprobado. Aún falta comparar tiempo y excepciones. | Especifica catálogo y tope, tres señales para escalar y seguimiento del tiempo de espera en tres pedidos. | Distingue proceso estándar de excepciones y evita convertir una prueba en delegación general. |

En `src/actions/ceo-plan.ts` el contexto de semana 2 toma diagnóstico, prioridades, acciones y `completion_data`, resultado de revisión, foco y `decision_learning` con hipótesis, evidencia e incertidumbre. Pasa esa estructura al proveedor a través de `src/lib/ai/generate-ceo-plan.ts`. Las brechas y señales persistidas en los planes coinciden con la revisión guardada. La comprobación no necesitó capturar el prompt de producción ni credenciales. [Persistencia y decisiones](./reports/observations.json).

## Calidad de los entregables

- **Nova, semana 1.** Dos ofertas distintas y aplicables al público de pequeñas empresas de servicios. Una plantea claridad de mensaje y presencia digital, la otra una web orientada a consultas. El feedback introdujo «prueba piloto QA» y criterios observables. La generación se probó sobre ofertas. El plan pidió definir la propuesta de valor como acción manual. [Borrador](./nova-studio/10-ai-deliverable.png) · [Revisión](./nova-studio/10b-ai-revision.png).
- **Café, semana 2 después de T2.** El agente diferenció tono firme y salida gradual. Incorporó la prueba piloto y la pauta de observación tras el feedback. Produjo fichas de oferta que describían los mensajes en vez de dejar dos textos completos listos para copiar. La aprobación dejó la acción pendiente y la UI permitió cerrarla al declarar texto y expectativa. [Borrador](./cafe-horizonte/week2-10-ai-deliverable.png) · [Revisión](./cafe-horizonte/week2-10b-ai-revision.png) · [Captura](./cafe-horizonte/week2-11-action-result.png).
- **Continuidad dentro de la semana.** En `src/actions/action-ai.ts`, el generador recibe contexto del negocio y del plan y conocimiento canónico aprobado. No incorpora explícitamente los resultados manuales de las otras acciones de esa misma semana. La fidelidad de una oferta a una propuesta registrada en una acción previa sigue siendo una brecha.
- **Cobertura.** No apareció una acción `value_proposition` en los primeros planes. La acción condicional del segundo plan de Nova quedó pendiente porque la señal adicional era parte del nuevo experimento. La capacidad de la IA de generar una propuesta como modalidad separada queda sin prueba real en esta auditoría.

## Límites de interpretación

El arnés inicial usó respuestas sintéticas generales en parte de los campos de acción y la UI permitió guardar fechas escritas en un formato inválido. La validación de persistencia y las revisiones confirman operaciones y continuidad. La calidad semántica de las observaciones históricas y la eficacia en negocios reales requieren evidencia adicional. [Defectos](./DEFECTS.md).
