# QA Report · End-to-End Business Journey

**Fecha.** 24 de noviembre de 2026. **Rama.** `qa/e2e-business-journey`. **Referencia.** CEO Command Center v3.3, PR #34, merge `a43187b8583f281ebdd701e3ae6499cd3084f8b5`.

## Resumen ejecutivo

Las tres cuentas se crearon desde la landing, se confirmaron en Mailpit y cerraron su primera semana. Se guardaron los tres cierres y se verificaron en Historial tras recarga y nuevo inicio de sesión. Los tres segundos planes se generaron con el proveedor real y guardaron continuidad `deepening` con señales distintas.

| Evaluación | Dictamen | Evidencia principal |
|---|---|---|
| Functional | **GO** | Tres ciclos completos con los datos autorizados, 10/10 acciones iniciales, tres revisiones persistentes y tres segundos planes. |
| Security | **GO local** | Seis cruces entre las tres cuentas, rutas protegidas y tres integraciones Supabase locales aprobadas. |
| Product Design | **NO GO** | CTA de Nova parcialmente visible en escritorio pequeño y móvil, y captura/ADN con distinciones insuficientes. |
| CEO Intelligence | **Parcial** | Diagnósticos distintos y aprendizaje rastreable. La fidelidad de la acción asistida de cobro y el significado de los datos de captura requieren mejoras. |
| Business Value | **Parcial** | Los planes generaron un siguiente experimento útil en QA. La captura de señales y las condiciones de confianza limitan el valor verificable. |

## Entorno y herramientas

- Windows y PowerShell. Next.js en `http://localhost:3000`; Supabase en `http://127.0.0.1:54321`; Studio respondió en 54323 y Mailpit en 54324. El sitio configurado y Supabase se comprobaron como locales antes de registrar cuentas.
- Chromium 158.0.8127.18 vía Playwright ya instalado en caché. No se encontró un servidor Playwright MCP. Se usaron Playwright, la interfaz de Mailpit, consultas autenticadas del propietario, terminal, lectura de código y las suites existentes. El zoom usó la función nativa de Chromium.
- El CLI de Supabase resolvió la configuración local durante las integraciones. Docker CLI no estaba disponible en el PATH de PowerShell. La comprobación directa de WSL tuvo acceso denegado y los servicios locales siguieron operativos.
- Los planes y entregables se generaron mediante el proveedor configurado en las pantallas de la aplicación. Los registros y las capturas usan cuentas de `example.com`. La confirmación se hizo pulsando los enlaces de Mailpit y las capturas contienen el cuerpo del mensaje sin los tokens.

## Recorrido por negocio

| Negocio | Ingreso bruto QA | Semana 1 | Cierre persistido | Semana 2 | T0/T1/T2 |
|---|---:|---|---|---|---|
| Café Horizonte · QA | USD 8.500 | 3/3 manuales · [plan](./cafe-horizonte/06-first-plan.png) | [Historial tras nuevo login](./cafe-horizonte/14b-review-persisted-history.png) | 3 acciones, 32 s · [plan](./cafe-horizonte/15-second-plan.png) | [T0](./cafe-horizonte/05-initial-assessment.png) · [T1](./cafe-horizonte/12-week-completed.png) · [T2](./cafe-horizonte/16-final-dashboard.png) |
| Nova Studio · QA | USD 4.500 | 4/4, una asistida · [plan](./nova-studio/06-first-plan.png) | [Historial tras nuevo login](./nova-studio/14b-review-persisted-history.png) | 3 acciones, 30 s · [plan](./nova-studio/15-second-plan.png) | [T0](./nova-studio/05-initial-assessment.png) · [T1](./nova-studio/12-week-completed.png) · [T2](./nova-studio/16-final-dashboard.png) |
| Taller Andino · QA | USD 18.000 | 3/3 manuales · [plan](./taller-andino/06-first-plan.png) | [Historial tras nuevo login](./taller-andino/14b-review-persisted-history.png) | 3 acciones, 27 s · [plan](./taller-andino/15-second-plan.png) | [T0](./taller-andino/05-initial-assessment.png) · [T1](./taller-andino/12-week-completed.png) · [T2](./taller-andino/16-final-dashboard.png) |

El onboarding empresarial tiene tres pasos y el diagnóstico diez. La prueba con campos vacíos de facturación quedó bloqueada en el paso 9 de Nova y Taller. Se incorporaron los valores autorizados de USD 4.500 y USD 18.000 y se continuó con las mismas cuentas. Café mantuvo USD 8.500. Son ingresos brutos declarados. Las horas semanales de dueño fueron supuestos de capacidad de 12, 8 y 10 respectivamente. Se usaron USD, los hechos del brief y descripciones sintéticas coherentes con los negocios.

Los costos, saldo y vencimientos de Café se ingresaron en el texto de desafío. No había campos estructurados para esos valores. El diagnóstico de Nova tardó 6 s automatizados y Taller 5 s. El arnés inicial registró respuestas de Café antes de reanudar la sesión, de modo que su tiempo de diagnóstico no quedó cronometrado de forma comparable. Los tiempos con Playwright y movimiento reducido no representan duración humana. [Primer intento](./reports/onboarding-first-attempt.json).

## Revisión semanal, IA y persistencia

- Se respondieron los seis pasos de cada revisión desde la UI. Se guardaron resultado parcial, evidencia, aprendizaje, hipótesis inconclusa y foco. La preparación de la segunda semana se inició desde el propio cierre y no exigió esperar una fecha.
- En Nova se generaron dos ofertas con IA, se incorporó feedback y se aprobó la revisión 2. Se registró el resultado y se recargó para comprobar progreso. Café verificó el mismo flujo con la acción asistida que apareció en semana 2, después de preservar T2. [IA Nova](./nova-studio/10-ai-deliverable.png) · [IA Café](./cafe-horizonte/week2-10b-ai-revision.png).
- El control de cobro posterior a T2 registró una promesa sintética de USD 1.200 para el 27 de noviembre, con un caso confirmado de tres revisados. Fue una confirmación de promesa. El arnés inicial registró frases de fecha inválidas que el producto aceptó. No se editaron los resultados de la semana 1 para cambiar lo observado. [Control](./cafe-horizonte/week2-control-11-action-result.png) · [BJ-08](./DEFECTS.md).
- El recorrido de correo inicial registró seis eventos de consola genéricos por contexto, sin excepciones JavaScript ni respuestas HTTP fallidas capturadas. Una repetición separada de landing y registro en Chromium no reprodujo errores de consola. Los eventos genéricos quedaron sin atribución.

## Responsive y accesibilidad

Se midieron `window.innerHeight`, `innerWidth`, `scrollHeight`, `scrollWidth`, rectángulos, intersección y clipping por ancestros en quince combinaciones. La matriz usa el criterio estricto de cabida del documento en escritorio y el espacio útil encima de la navegación inferior en móvil.

| Escenario y resolución | Alto doc./viewport | Ejecución abajo | CTA abajo | CTA visible | Criterio | Captura |
|---|---:|---:|---:|---:|---|---|
| Café Horizonte · QA 1280 × 720 | 736/720 | 722 | 701 | 100% | FAIL | [PNG](./responsive/cafe-horizonte-1280x720.png) |
| Café Horizonte · QA 1366 × 768 | 768/768 | 722 | 701 | 100% | PASS | [PNG](./responsive/cafe-horizonte-1366x768.png) |
| Café Horizonte · QA 1440 × 900 | 900/900 | 722 | 701 | 100% | PASS | [PNG](./responsive/cafe-horizonte-1440x900.png) |
| Café Horizonte · QA 1920 × 1080 | 1080/1080 | 722 | 701 | 100% | PASS | [PNG](./responsive/cafe-horizonte-1920x1080.png) |
| Café Horizonte · QA 390 × 844 | 1327/844 | 771 | 702 | 100% | PASS | [PNG](./responsive/cafe-horizonte-390x844.png) |
| Nova Studio · QA 1280 × 720 | 773/720 | 759 | 738 | 59% | FAIL | [PNG](./responsive/nova-studio-1280x720.png) |
| Nova Studio · QA 1366 × 768 | 773/768 | 759 | 738 | 100% | FAIL | [PNG](./responsive/nova-studio-1366x768.png) |
| Nova Studio · QA 1440 × 900 | 900/900 | 759 | 738 | 100% | PASS | [PNG](./responsive/nova-studio-1440x900.png) |
| Nova Studio · QA 1920 × 1080 | 1080/1080 | 759 | 738 | 100% | PASS | [PNG](./responsive/nova-studio-1920x1080.png) |
| Nova Studio · QA 390 × 844 | 1414/844 | 858 | 789 | 96% | FAIL | [PNG](./responsive/nova-studio-390x844.png) |
| Taller Andino · QA 1280 × 720 | 736/720 | 722 | 701 | 100% | FAIL | [PNG](./responsive/taller-andino-1280x720.png) |
| Taller Andino · QA 1366 × 768 | 768/768 | 722 | 701 | 100% | PASS | [PNG](./responsive/taller-andino-1366x768.png) |
| Taller Andino · QA 1440 × 900 | 900/900 | 722 | 701 | 100% | PASS | [PNG](./responsive/taller-andino-1440x900.png) |
| Taller Andino · QA 1920 × 1080 | 1080/1080 | 722 | 701 | 100% | PASS | [PNG](./responsive/taller-andino-1920x1080.png) |
| Taller Andino · QA 390 × 844 | 1327/844 | 771 | 702 | 100% | PASS | [PNG](./responsive/taller-andino-390x844.png) |

No hubo overflow horizontal o recorte por un ancestro. Las tres sesiones verificaron orden móvil, Enter, Tab en el diálogo y restauración del foco tras Escape. En Café el zoom nativo del 200% mantuvo el CTA alcanzable con teclado y 683 px de ancho sin overflow. [Zoom](./responsive/cafe-horizonte-zoom-200.png).

La referencia v3.3 aprobó las cuatro resoluciones de escritorio con su fixture de texto normal. Esta auditoría confirmó la composición, los diálogos y el orden móvil de esa versión. Los planes generados de los tres negocios muestran que la cabida cambia con el contenido real. [QA de referencia v3.3](../ceo-command-center-v3.3/QA-REPORT.md).

## Seguridad

Las seis direcciones de lectura cruzada devolvieron cero filas para los recursos QA existentes. Se comprobó negocio, plan, acciones, revisiones, evidencia y los entregables que se generaron en Café y Nova. Los seis intentos de abrir una acción QA ajena desde la UI redirigieron al dashboard de la cuenta activa sin mostrar el contenido de la acción. Tras cerrar sesión se comprobó redirección a login para dashboard, historial y revisión semanal en las tres cuentas.

Las integraciones del repositorio usaron Supabase local y comprobaron lectura por propietario, rechazo de escritura directa, autorización al completar acciones y atomicidad del RPC de plan. La auditoría de recorrido conservó sus tres registros de QA, la verificación de correo y las políticas vigentes.

## Conteo y validaciones

| Batería | Aprobadas | Fallidas | Omitidas | Bloqueadas |
|---|---:|---:|---:|---:|
| Recorrido, checkpoints y accesibilidad | 55 | 0 | 1 | 0 |
| Combinaciones de viewport | 10 | 5 | 0 | 0 |
| Cruces de aislamiento | 6 | 0 | 0 | 0 |
| `npm.cmd test` estándar | 165 | 0 | 3 | 0 |
| `npm.cmd test` con integración local | 168 | 0 | 0 | 0 |

`npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` y `git diff --check` pasaron. Los dos bloqueos iniciales por facturación se registraron como resueltos tras la ampliación autorizada. El cambio de un selector ambiguo de prueba en Taller se limitó al arnés. Las capturas y los JSON distinguen iteraciones, defectos del producto y bloqueos.

## Defectos y siguientes decisiones

Se registraron siete P2 y un P3. Los hallazgos de mayor impacto son captura financiera insuficiente, validación semántica de evidencia, discordancia del entregable y visibilidad del CTA. Las cuentas con entradas autorizadas cerraron la ruta crítica. La detección de propuesta de valor como acción asistida separada quedó fuera de lo generado.

[Defectos](./DEFECTS.md) · [Producto y cinco mejoras](./PRODUCT-REVIEW.md) · [Inteligencia y continuidad](./CEO-INTELLIGENCE-REVIEW.md) · [Matriz T0–T2](./BUSINESS-EVOLUTION-MATRIX.md) · [Resultados estructurados](./TEST-RESULTS.json).
