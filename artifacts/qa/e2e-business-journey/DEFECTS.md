# Defectos y brechas de producto

La severidad describe el impacto observado en el recorrido local. Las reproducciones usan solo datos sintéticos y la versión v3.3 de la rama QA.

| ID | Prioridad | Hallazgo |
|---|---|---|
| BJ-01 | P2 | El diagnóstico no admite facturación desconocida. |
| BJ-02 | P2 | El onboarding guarda saldos, costos y obligaciones en texto libre. |
| BJ-03 | P2 | La acción de cobros pide mensajes listos y el flujo genera fichas de ofertas. |
| BJ-04 | P2 | La captura permite cerrar una acción asistida de cobro con una respuesta esperada. |
| BJ-05 | P2 | El ADN muestra Operaciones como favorable con seguimientos de cobro declarados. |
| BJ-06 | P2 | Los planes con contenido extenso dejan parte del CTA fuera del área útil. |
| BJ-07 | P3 | El correo de alta usa la marca anterior. |
| BJ-08 | P2 | La captura acepta fechas con texto sin formato y pierde calidad de evidencia. |

## BJ-01 · Falta una opción para facturación desconocida

- **Escenarios.** Nova Studio y Taller Andino en el primer intento.
- **Reproducción.** Avanzar al paso 9 del diagnóstico, dejar facturación vacía y pulsar Continuar.
- **Esperado.** Registrar desconocido con incertidumbre explícita y continuar con los datos disponibles.
- **Observado.** La UI exige un número. Se reprodujo el bloqueo en las dos cuentas. Los valores autorizados posteriormente permitieron continuar por la misma interfaz.
- **Causa y archivos.** Confirmada en el atributo `required` de la pregunta en `src/components/conversational-onboarding.tsx` y en `src/lib/onboarding-validation.ts`.
- **Corrección recomendada.** Admitir «Aún no lo sé» y conservar la diferencia entre cero, estimación y dato desconocido. [Nova](./nova-studio/04a-facturacion-sin-dato.png) · [Taller](./taller-andino/04a-facturacion-sin-dato.png).

## BJ-02 · Las señales financieras prioritarias quedan en texto libre

- **Escenario.** Café Horizonte, T0 a T2.
- **Reproducción.** Completar el diagnóstico con facturación y describir efectivo USD 600, obligaciones USD 2.500 y costos USD 7.800 en el desafío abierto. Abrir Finanzas y Liquidez tras generarse el plan.
- **Esperado.** Poder registrar efectivo, obligaciones fechadas y costos como señales distintas con procedencia declarada. La UI debería explicar si la evaluación todavía requiere datos comparables.
- **Observado.** La IA citó las cifras del desafío para priorizar caja. El ADN mantuvo Finanzas y Liquidez «Sin evaluar» y pidió señales que el onboarding carece de campos para capturar.
- **Causa y archivos.** Confirmada por los campos de `src/components/conversational-onboarding.tsx` y el contrato de `src/lib/business-assessment-adapter.ts`. El texto libre sí llega al agente.
- **Corrección recomendada.** Capturar saldos, vencimientos, costos y periodo con procedencia. Usar estos datos como contexto de evaluación y como línea base de revisión. [Evaluación y decisión](./cafe-horizonte/05-initial-assessment.png) · [Datos T0–T2](./BUSINESS-EVOLUTION-MATRIX.md).

## BJ-03 · Entregable incongruente con la acción propuesta

- **Escenario.** Café Horizonte, acción 3 de la semana 2. Prueba complementaria posterior a T2.
- **Reproducción.** Abrir «Preparar dos mensajes de cobro distintos…», generar un borrador y solicitar una revisión.
- **Esperado.** Dos mensajes completos listos para editar y copiar.
- **Observado.** El proveedor produjo dos fichas `commercial_offers` con promesa, cliente objetivo, contenido descrito y CTA. La revisión incorporó el feedback y conservó el formato de ofertas.
- **Causa y archivos.** `src/actions/action-ai.ts` dirige `commercial_messages` hacia el generador de ofertas para borradores nuevos. Conserva el generador de mensajes cuando el borrador existente ya contiene `messages`.
- **Corrección recomendada.** Representar el subtipo esperado en el plan y validarlo frente al entregable antes de mostrarlo o aprobarlo. [Borrador](./cafe-horizonte/week2-10-ai-deliverable.png) · [Revisión](./cafe-horizonte/week2-10b-ai-revision.png).

## BJ-04 · El formulario de evidencia mide intención para una acción de cobro

- **Escenario.** Café Horizonte, acción asistida de la semana 2.
- **Reproducción.** Aprobar el entregable, abrir «Registrar evidencia y completar» y llenar variante, segmento, mensaje y respuesta esperada. Indicar claramente que el mensaje todavía no se envió.
- **Esperado.** Identificar por separado el entregable listo, el uso observado y un resultado de cobro. Una expectativa debe quedar identificada como tal.
- **Observado.** La UI rechazó el formulario vacío. Con el mensaje y la respuesta esperada aceptó el cierre y aumentó el progreso. En la respuesta se declaró que todavía no había envío ni respuesta observada.
- **Causa y archivos.** El formulario `commercial_message_set` persistido pide `expected_response`. La interfaz reutiliza ese contrato para completar desde `src/components/action-detail-panel.tsx` y `src/components/dynamic-action-completion-form.tsx`. `src/actions/weekly-actions.ts` valida el esquema vigente.
- **Corrección recomendada.** Distinguir preparación de verificación de uso. Elegir el criterio de cierre según el objetivo de la acción y solicitar eventos observados donde corresponda. [Captura](./cafe-horizonte/week2-11-action-result.png) · [Resultado persistido](./reports/observations.json).

## BJ-05 · El estado visible de Operaciones generaliza una señal estrecha

- **Escenario.** Café Horizonte, T1 y T2.
- **Reproducción.** Registrar el plan de caja y el seguimiento de cobros. Comparar ADN con T0.
- **Esperado.** Identificar el seguimiento como señal declarada del proceso de cobro. Mantener el alcance de la conclusión visible.
- **Observado.** Operaciones pasó de «Sin evaluar» a «Favorable» con dos registros declarados `follow_up`. La clasificación y la confianza de la etapa siguen provisionales, y la salud sigue requiriendo atención.
- **Causa y archivos.** Regla de `src/lib/business-assessment.ts` que combina proceso comercial descrito y cualquier seguimiento disponible. `src/components/business-dna.tsx` etiqueta por estado y omite el matiz de provisionalidad.
- **Corrección recomendada.** Mostrar qué proceso respalda el estado y si el dato fue declarado. Evitar generalizar a toda la operación desde un registro comercial aislado. [T1](./cafe-horizonte/12-week-completed.png) · [T2](./cafe-horizonte/16-final-dashboard.png).

## BJ-06 · El CTA puede exigir desplazamiento con decisiones reales

- **Escenarios.** Los tres dashboards con planes realmente generados, con mayor impacto en Nova Studio.
- **Reproducción.** Cargar el dashboard a 1280 × 720 en la parte superior y medir el rectángulo de `#execution-overview`.
- **Esperado.** La vista estándar cabe en el viewport a esa resolución.
- **Observado.** Café y Taller miden 736 px en 1280 × 720. El bloque de ejecución termina en y = 722 y su CTA queda completo. En Nova, el CTA a esa resolución termina en y = 738 y queda visible en un 59%. En móvil termina en y = 789, frente a un área útil de 787 px, con 96% visible. No hubo overflow horizontal ni clipping por ancestros.
- **Causa y archivos.** La altura intrínseca de decisión, misión y acción generadas estira la cuadrícula de `src/app/dashboard/page.tsx`, `src/app/globals.css` y `src/components/execution-overview.tsx`.
- **Corrección recomendada.** Reservar espacio para el CTA frente a texto largo habitual y mantener el acceso a la versión completa de cada texto. [Café](./responsive/cafe-horizonte-1280x720.png) · [Nova escritorio](./responsive/nova-studio-1280x720.png) · [Nova móvil](./responsive/nova-studio-390x844.png).

## BJ-07 · Marca anterior en el correo de confirmación

- **Escenarios.** Las tres cuentas.
- **Reproducción.** Registrarse desde la landing y abrir el mensaje recibido en Mailpit.
- **Esperado.** La marca del remitente, asunto y cuerpo continúa la identidad TuCEO IA.
- **Observado.** Asunto y cuerpo muestran «IA Emprendedor». El contenido está en español, el CTA «Confirmar correo» es comprensible y el enlace confirmó la cuenta en el entorno local.
- **Causa y archivos.** Configuración de `supabase/config.toml` y plantilla `supabase/templates/confirmation.html`.
- **Corrección recomendada.** Aplicar identidad y copy transaccional de TuCEO IA y conservar la confirmación y redirección verificadas. [Correo](./cafe-horizonte/03-email-confirmation.png).

## BJ-08 · La captura financiera acepta fechas inválidas

- **Escenario.** Café Horizonte, acciones 1 y 3 de semana 1. Control con valores válidos en semana 2 después de T2.
- **Reproducción.** En el plan de caja o seguimiento de cobros, completar los campos requeridos e ingresar texto libre que no sea una fecha en «fecha de vencimiento» o «fecha prometida». Guardar el resultado.
- **Esperado.** Rechazar texto inválido en un campo que representa una fecha. Preservar la evidencia para que el agente pueda compararla.
- **Observado.** El arnés inicial rellenó una fecha con una frase truncada. La aplicación aceptó y persistió el valor, y marcó la acción completada. El control separado guardó correctamente `2026-11-27`, USD 1.200 y un caso confirmado de tres revisados.
- **Causa y archivos.** El esquema generado declaró la fecha como `text`. El validador de `src/lib/action-capture.ts` valida presencia, tipo y longitud, sin formato de fecha para ese campo. La UI de `src/components/dynamic-action-completion-form.tsx` se rige por ese esquema.
- **Corrección recomendada.** Usar tipos de fecha y dinero con validación semántica y criterios de coherencia entre campos. Marcar montos estimados y promesas como tales. [Datos observados](./reports/observations.json) · [Control válido](./cafe-horizonte/week2-control-11-action-result.png).
