# QA del CEO Command Center v3.3

Fecha de prueba: 24 de noviembre de 2026  
Rama: `feature/ceo-command-center-v3`  
Entorno: compilación local de Next.js, Supabase local y Chromium controlado por Playwright.

## Escenarios

- **Café Horizonte · QA.** Plan corto de tres acciones con un resultado declarado y una etapa provisional. La segunda acción es manual y la tercera usa el flujo asistido existente.
- **Taller Andino · QA.** Plan con nombre, recomendación, misión y acción extensos. Sin resultados registrados ni etapa establecida.
- Los registros se prepararon para QA en dos cuentas temporales mediante los contratos de la aplicación. El navegador inició sesión mediante la UI y operó con los permisos de cada propietario. Se usó el servicio de administración local únicamente para crear y retirar las cuentas de prueba.

## Comparación con v3.2

| Componente | v3.2 | v3.3 |
|---|---|---|
| Composición | Tarjetas de ejecución seguidas por el tablero completo | Cuadrícula 35/65 con la decisión y la evolución alineadas arriba. El tablero abre en un diálogo desde el CTA o desde «Plan actual». |
| Decisión | Pregunta estratégica extensa, fondo casi negro y tres accesos de detalle | Recomendación de la semana sobre azul ejecutivo `#172D46`, con justificación, confianza y acceso a un único drawer. |
| Ejecución | Acción, progreso y asignación de tiempo distribuidos entre superficies | Misión, avance segmentado según las acciones reales, contexto, resultado, tiempo y CTA en una tarjeta. El plan contiene la meta completa y la asignación de tiempo. |
| Evolución y ADN | Indicador sin valor central, metodología en la vista y símbolos variados | Un SVG de cinco segmentos con la etapa estimada o el centro neutro. Seis dimensiones con iconos de trazo y detalle bajo demanda. |
| Resultados | Tarjeta de hitos sin información configurable | Conteo de resultados declarados y avance real. El caso inicial omite el bloque. |

La comparación usa las mediciones y capturas históricas de v3.2 y dos fixtures controlados de v3.3. Los planes y el entorno de ejecución de ambas series son distintos. [Reporte v3.2](../ceo-command-center-v3.2/QA-REPORT.md) · [Captura v3.2 a 1366 × 768](../ceo-command-center-v3.2/screenshots/02-dashboard-1366x768.png) · [Captura v3.3 a 1366 × 768](./screenshots/desktop-1366x768.png).

## Matriz de viewport

Se midieron `scrollHeight`, `scrollWidth` y los rectángulos de cada bloque al inicio de la página. Las columnas de bloques indican el borde inferior en píxeles CSS. La intersección móvil descuenta la navegación fija desde y = 787. También se verificó si algún ancestro recortaba los bloques y si el tablero permanecía cerrado en la vista principal.

| Resolución | Altura doc. v3.2 | Altura doc. v3.3 | Alto útil v3.3 | Encabezado | Decisión | Ejecución | Evolución | ADN | Resultados | CTA | Captura |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1280 × 720 | 1546 | 720 | 720 | 78 | 304 | 645 | 308 | 562 | 638 | 624 | [PNG](./screenshots/desktop-1280x720.png) |
| 1366 × 768 | 1502 | 768 | 768 | 78 | 269 | 638 | 308 | 562 | 638 | 617 | [PNG](./screenshots/desktop-1366x768.png) |
| 1440 × 900 | 1526 | 900 | 900 | 78 | 269 | 638 | 308 | 562 | 638 | 617 | [PNG](./screenshots/desktop-1440x900.png) |
| 1920 × 1080 | 1545 | 1080 | 1080 | 78 | 269 | 638 | 308 | 562 | 638 | 617 | [PNG](./screenshots/desktop-1920x1080.png) |
| 390 × 844 | 2964 | 1378 | 787 | 64 | 282 | 746 | 972 | 1226 | 1302 | 677 | [Viewport](./screenshots/mobile-390x844.png) · [Página completa](./screenshots/mobile-390x844-full.png) |

- **Escritorio.** Intersección del 100% para los cinco bloques y el CTA en los cuatro tamaños. El CTA mide 44 px de alto. El documento cabe en el viewport completo.
- **Móvil.** Intersección del 100% para el encabezado, la decisión, la ejecución y el CTA. La evolución comienza al pie del primer viewport con el 14% a la vista. ADN y resultados aparecen al desplazar la página, en el orden requerido.
- **Todas las resoluciones.** Un CTA primario, ningún tablero abierto al cargar, cero bloques recortados por ancestros y `scrollWidth` igual al ancho del viewport.

## Regresión funcional y seguridad

| Prueba | Resultado | Evidencia |
|---|---|---|
| Decisión, evolución y ADN | Los tres detalles abrieron en diálogo. El contexto de decisión conservó la pregunta y la recomendación completa. Evolución mostró cinco segmentos, indicó «Estimado 02» en el caso con evidencia y usó un centro neutro en el caso indeterminado. | [Decisión](./screenshots/qa-decision-detail.png) · [Evolución](./screenshots/qa-business-evolution.png) · [ADN](./screenshots/qa-business-dna.png) |
| Teclado | Enter abrió el drawer, Tab mantuvo el foco dentro y Escape devolvió el foco al disparador. | Playwright en Chromium |
| Acción manual | Después de visitar otra acción en el tablero, el CTA móvil abrió la recomendada. El formulario rechazó los campos vacíos, enfocó el campo recién agregado y aceptó una lista de productos vacía. El pie de captura y el botón Guardar permanecieron accesibles. | [Acción móvil](./screenshots/qa-manual-action-mobile.png) · [Captura de resultado](./screenshots/qa-manual-result-mobile.png) |
| Persistencia manual | El progreso pasó de 1/3 a 2/3. La recarga conservó el avance y Supabase devolvió el resultado con la lista vacía guardada. | UI y lectura del propietario en Supabase local |
| Evaluación empresarial | Las pruebas del motor cubren separación entre evidencia declarada, documentada y verificada, madurez independiente de la ejecución y ausencia de aumentos en Operaciones por registrar un resultado genérico. | `tests/business-assessment.test.ts` |
| Aislamiento RLS | Dos cuentas de prueba autenticadas. La segunda recibió cero filas para el negocio, el plan, la acción y la evidencia de la primera. Las pruebas de integración rechazaron completar una acción ajena y modificar el estado por escritura directa. | `tests/supabase-action-completion.integration.test.ts` · `tests/supabase-ceo-plan-rpc.integration.test.ts` |
| Acción asistida | Se generó un borrador con el proveedor real. El panel volvió a abrirse en la misma acción tras recargar. El feedback produjo la revisión 2. La aprobación mantuvo la acción pendiente hasta registrar evidencia, y luego el dashboard mostró 3/3 tras recargar. Una segunda cuenta no pudo leer el entregable. | [Borrador](./screenshots/qa-ai-draft.png) · [Revisión 2](./screenshots/qa-ai-revision.png) · [Aprobación](./screenshots/qa-ai-approved.png) · [Evidencia](./screenshots/qa-ai-evidence.png) |
| Revisión semanal | El CTA «Revisar mi semana» abrió el flujo al completar 3/3. Las pruebas de la aplicación cubrieron la persistencia idempotente del cierre y la continuidad de planes. | Playwright y suite existente |
| Cuenta | Cerrar sesión desde el encabezado volvió a login. La navegación directa a `/dashboard` siguió protegida. | Playwright en Chromium |

## Texto excepcional y zoom

| Escenario | Altura del documento | Ejecución abajo | CTA abajo | Intersección CTA | Captura |
|---|---:|---:|---:|---:|---|
| Texto largo, 1280 × 720 | 736 | 722 | 701 | 100% | [PNG](./screenshots/qa-long-1280x720.png) |
| Texto largo, 390 × 844 | 1327 | 771 | 702 | 100% | [PNG](./screenshots/qa-long-390x844.png) |
| Zoom nativo 200% desde 1366 × 768 | 1326 | 766 | 745 | 100% tras desplazar | [PNG](./screenshots/qa-zoom-200-percent.png) |

En el escenario extenso se verificaron la recomendación completa en el drawer de decisión, la acción completa en su detalle y la misión completa en el plan. A 1280 × 720 el borde inferior de la tarjeta queda 2 px debajo del viewport y se alcanza con desplazamiento natural. El CTA cabe íntegro. En el zoom nativo de Chromium al 200%, con 683 × 384 px CSS disponibles, se verificó el acceso al CTA con teclado, la apertura del diálogo y el cierre con Escape. En los tres escenarios, `scrollWidth` coincidió con `clientWidth`.

## Validaciones técnicas

| Comando | Resultado |
|---|---|
| `npm.cmd test` | 165 aprobadas, 3 integraciones omitidas en la ejecución sin Supabase |
| `npm.cmd test` con `SUPABASE_LOCAL_TESTS=1` | 168 aprobadas, 0 fallos y 0 omitidas |
| `npm.cmd run lint` | Correcto |
| `npm.cmd run typecheck` | Correcto |
| `npm.cmd run build` | Correcto |
| `git diff --check` | Correcto |

## Defectos pendientes y alcance

- Sin defectos bloqueantes en los escenarios ejecutados. El aumento de altura con texto excepcional o zoom es desplazamiento natural y está medido arriba.
- El fixture asistido usó una métrica histórica de «Tres mensajes revisados». El flujo vigente generó dos ofertas comerciales, como indica el contrato para borradores nuevos de ese tipo. La diferencia de copy del plan queda registrada como observación de compatibilidad.
- La evaluación confirmada requiere una fuente verificada. Las cuentas usadas en Chromium cubrieron la clasificación provisional y la indeterminada mediante registros declarados.
- La comprobación de revisión semanal en navegador llegó a la apertura del flujo. El guardado y la recuperación se verificaron mediante las pruebas de aplicación.

## Recomendaciones independientes

- **Functional GO.** Pasaron la acción manual y la asistida con persistencia tras recarga, el acceso a la revisión, la autorización de rutas y el aislamiento de recursos entre cuentas en Supabase local.
- **Product Design GO.** La vista normal muestra los cinco bloques y el CTA en las cuatro resoluciones de escritorio. En móvil, decisión, ejecución y CTA caben antes de la navegación inferior. Los detalles secundarios están disponibles en diálogos y la pantalla se adapta al zoom al 200%.

## Archivos de implementación

- Composición y carga del dashboard en `src/app/dashboard/page.tsx` y `src/app/dashboard/loading.tsx`. Estilos específicos en `src/app/globals.css`.
- Encabezado, navegación e iconos en `src/components/dashboard-header.tsx`, `command-center-navigation.tsx` y `command-center-icon.tsx`.
- Superficies en `src/components/decision-hero.tsx`, `execution-overview.tsx`, `business-evolution-card.tsx`, `business-dna.tsx` y `business-results-card.tsx`.
- Interacción, captura y textos de evaluación en `src/components/weekly-action-board.tsx`, `dynamic-action-completion-form.tsx` y `src/lib/business-assessment.ts`. Cobertura adaptada en `tests/dashboard-ux.test.ts` y `tests/action-completion-form.test.tsx`.
