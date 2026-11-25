# Reporte QA de regresión — CEO Command Center v3.2

**Fecha:** 2026-11-24  
**Rama:** `feature/ceo-command-center-v3`  
**Referencia anterior:** `5906e9f38432ba31b3928a6e2862a0d9047ef8f8`  
**Aplicación:** `http://localhost:3000`  
**Supabase:** local  
**Mailpit:** `http://127.0.0.1:54324`  
**Recomendación:** **GO WITH CONDITIONS**

## 1. Resumen ejecutivo

La regresión confirma que los defectos principales de v3.1 fueron corregidos:

- el workspace ya no colapsa en escritorio;
- la columna izquierda no usa scroll interno;
- decisión y ejecución aparecen antes que evolución y ADN en móvil;
- el nivel no se presenta como establecido cuando la evaluación es indeterminada;
- una acción manual de mezcla de ventas pudo registrarse y persistirse;
- el dashboard conserva una única acción primaria dentro del bloque de ejecución;
- los drawers de ADN y decisión siguen funcionando.

Se validaron dos usuarios por interfaz:

1. Usuario existente de Café Horizonte QA.
2. Usuario nuevo, confirmado desde Mailpit, con negocio independiente Tienda Aurora QA.

No se ejecutó una acción asistida por IA porque ninguno de los planes disponibles contenía una acción `ai_assisted`. Tampoco se ejecutó una prueba de acceso cruzado a IDs de recursos de otro usuario, porque hacerlo requeriría obtener IDs y forzar navegación fuera de los flujos funcionales, algo que no se hizo durante esta auditoría.

## 2. Resultados de pruebas

| ID | Área | Resultado | Estado |
|---|---|---|---|
| REG-01 | Login de Café Horizonte QA | Mostró únicamente Café Horizonte QA | PASS |
| REG-02 | Dashboard existente | Decisión, ejecución, evolución y ADN visibles | PASS |
| REG-03 | Cuenta nueva | Registro mediante UI completado | PASS |
| REG-04 | Correo nuevo | Correo recibido en Mailpit con asunto y destinatario correctos | PASS |
| REG-05 | Confirmación nueva | Enlace real de Mailpit permitió autenticar la cuenta | PASS |
| REG-06 | Negocio nuevo | Tienda Aurora QA creada mediante onboarding UI | PASS |
| REG-07 | Separación de usuarios | Usuario nuevo permaneció en su diagnóstico y no vio Café Horizonte | PASS |
| REG-08 | Ruta protegida | Logout y navegación directa a dashboard redirigieron a login | PASS |
| REG-09 | Drawer ADN | Detalle de Mercado abrió y cerró correctamente | PASS |
| REG-10 | Drawer decisión | Contexto de decisión abrió y cerró correctamente | PASS |
| REG-11 | Acción manual | Segunda acción manual registrada desde UI | PASS |
| REG-12 | Persistencia | Resultado y progreso persistieron después de guardar | PASS |
| REG-13 | Acción asistida por IA | No había acción `ai_assisted` disponible | NOT RUN |
| REG-14 | Acceso cruzado directo a recursos | No ejecutado sin manipular IDs ni base de datos | NOT RUN |

## 3. Comparación v3.1 frente a v3.2

| Área | v3.1 | v3.2 |
|---|---|---|
| Workspace en 1280×720 | 0 px | 758 px |
| Workspace en 1366×768 | 0 px | 738 px |
| Workspace en 1440×900 | 68,5 px | 738 px |
| Scroll de columna izquierda | Presente | No detectado |
| Scroll interno innecesario | Presente en tablero/panel | No detectado |
| Orden móvil | Evolución antes de decisión | Decisión y ejecución antes de evolución |
| Evolución indeterminada | Mostraba Nivel 02 | “Estamos comprendiendo tu empresa” |
| Ejecución | Varios bloques separados | Bloque consolidado de ejecución |
| Operaciones tras `action_result` | Podía aparecer favorable | Permanece sin evaluar |
| Evidencia persistida | Se trataba como documentada | Se conserva como declarada |

## 4. Mediciones responsive

| Resolución | `scrollHeight` | `scrollWidth` | `clientWidth` | Altura tablero | CTA | Estado |
|---|---:|---:|---:|---:|---|---|
| 1280 × 720 | 1546 | 1265 | 1265 | 758 px | Visible | PASS |
| 1366 × 768 | 1502 | 1351 | 1351 | 738 px | Visible | PASS |
| 1440 × 900 | 1526 | 1425 | 1425 | 738 px | Visible | PASS |
| 1920 × 1080 | 1545 | 1905 | 1905 | 738 px | Visible | PASS |
| 390 × 844 | 2964 | 375 | 375 | 908 px | Visible/accesible | PASS |

`scrollWidth` coincidió con `clientWidth` en todas las resoluciones, por lo que no se detectó overflow horizontal.

El orden DOM y visual observado en móvil fue:

1. `decision-hero-title`
2. `execution-overview-title`
3. `business-evolution-title`
4. `business-dna-title`

No se detectaron elementos con scroll interno en la columna izquierda ni en el tablero/panel durante la medición.

## 5. Estado de defectos anteriores

### QA-001 — Workspace de acciones colapsado

**Estado anterior:** P1, tablero de 0 px en 1280×720 y 1366×768.  
**Corrección:** eliminación del shell rígido `h-dvh/overflow-hidden`, eliminación del `flex-1` colapsable y flujo natural de página.  
**Resultado:** resuelto. El tablero mide entre 738 y 758 px en las resoluciones de escritorio.  
**Estado actual:** **RESUELTO**.

### QA-002 — Orden incorrecto en móvil

**Estado anterior:** la columna “Mi empresa” aparecía antes de decisión y ejecución.  
**Corrección:** la columna estratégica se coloca primero en DOM y visualmente; la columna empresarial se reordena a la izquierda únicamente en desktop.  
**Resultado:** decisión y plan aparecen antes que evolución y ADN en 390×844.  
**Estado actual:** **RESUELTO**.

### QA-003 — Nivel visible con clasificación indeterminada

**Estado anterior:** “Nivel 02 — Supervivencia” junto a “Evaluación indeterminada”.  
**Corrección:** la tarjeta muestra “Estamos comprendiendo tu empresa” para `indeterminate` y “Etapa probable” para `provisional`.  
**Resultado:** el nivel ya no se presenta como establecido cuando falta evaluación suficiente.  
**Estado actual:** **RESUELTO**.

### QA-004 — Advertencias de fuentes

**Estado anterior:** advertencias de preload de fuentes en desarrollo.  
**Corrección:** no se modificó esta parte durante v3.2.  
**Resultado:** las advertencias continuaron apareciendo durante navegación de desarrollo. No generaron errores de consola críticos ni fallos funcionales.  
**Estado actual:** **PENDIENTE / P3 no bloqueante**.

## 6. Evaluación UX/UI

### Desktop

- La decisión ocupa el bloque superior principal de la columna derecha.
- La ejecución está consolidada en un único bloque.
- La CTA principal permanece visible al inicio del bloque.
- El objetivo, siguiente movimiento, resultado esperado, tiempo y progreso aparecen juntos.
- La columna izquierda es más compacta y no requiere scroll interno.
- El tablero completo queda disponible mediante scroll natural del documento.

### Mobile

- La decisión aparece primero.
- El plan de acción aparece inmediatamente después.
- Evolución y ADN quedan debajo de la experiencia prioritaria.
- El scroll natural funciona.
- No hubo overflow horizontal.

### Gamificación

La gamificación se percibe mediante:

- progreso de acciones;
- etapa del ciclo de decisión;
- indicador segmentado de evolución;
- estados del ADN Empresarial.

No se observaron puntos, porcentajes ficticios ni incrementos automáticos de madurez por completar acciones.

## 7. Evaluación del motor empresarial

Se verificó que:

- una evaluación indeterminada no muestra un nivel confirmado;
- una evaluación provisional se etiqueta como “Etapa probable”;
- la persistencia de `business_evidence` se clasifica como declarada;
- completar acciones no incrementa artificialmente la madurez;
- la acción manual de mezcla de ventas no volvió favorable a Operaciones automáticamente;
- la información faltante de finanzas/liquidez permanece visible;
- el riesgo financiero continúa visible en la decisión del CEO.

La segunda acción manual fue registrada con datos QA mediante la interfaz. El progreso pasó de 1 de 3 a 2 de 3 y el estado del resultado sobrevivió al flujo de guardado.

## 8. Ejecución asistida por IA

**Estado: NOT RUN.**

El plan persistido disponible para Café Horizonte QA solo contenía acciones manuales. No se modificó la base de datos ni se alteró el plan para fabricar una acción asistida por IA.

La prueba deberá ejecutarse en una futura cuenta/plan cuyo flujo real genere una acción `ai_assisted`.

## 9. Seguridad

Resultados verificados:

- El usuario nuevo fue creado únicamente mediante signup UI.
- El correo nuevo fue confirmado desde Mailpit.
- El nuevo usuario creó y vio únicamente Tienda Aurora QA.
- La cuenta existente volvió a mostrar únicamente Café Horizonte QA.
- El usuario nuevo no pudo acceder al dashboard de Café Horizonte; fue dirigido a su propio diagnóstico.
- Logout impidió acceder a `/dashboard`.
- No se expusieron tokens ni contraseñas en capturas.

La prueba de acceso cruzado directo a un recurso ajeno no se ejecutó porque habría requerido manipular IDs fuera de los flujos normales. Por tanto, la validación completa de aislamiento RLS queda pendiente de una prueba de integración específica.

## 10. Capturas

Se guardaron directamente en `artifacts/qa/ceo-command-center-v3.2/screenshots/`:

- [01-dashboard-1280x720.png](./screenshots/01-dashboard-1280x720.png)
- [02-dashboard-1366x768.png](./screenshots/02-dashboard-1366x768.png)
- [03-dashboard-1440x900.png](./screenshots/03-dashboard-1440x900.png)
- [04-dashboard-1920x1080.png](./screenshots/04-dashboard-1920x1080.png)
- [05-dashboard-mobile-390x844.png](./screenshots/05-dashboard-mobile-390x844.png)
- [06-business-evolution.png](./screenshots/06-business-evolution.png)
- [07-business-dna-detail.png](./screenshots/07-business-dna-detail.png)
- [08-ceo-decision-detail.png](./screenshots/08-ceo-decision-detail.png)
- [09-manual-action.png](./screenshots/09-manual-action.png)
- [11-action-result.png](./screenshots/11-action-result.png)
- [12-dashboard-after-action.png](./screenshots/12-dashboard-after-action.png)

No se generó `10-ai-assisted-action.png` porque esa modalidad no estaba disponible en el plan probado.

## 11. Validaciones técnicas

```text
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

Resultado:

- 168 tests ejecutados.
- 165 aprobados.
- 3 omitidos.
- 0 fallos.
- lint correcto.
- typecheck correcto.
- build correcto.
- diff correcto.

## 12. Nuevos defectos encontrados

No se encontraron nuevos defectos funcionales o visuales bloqueantes durante esta regresión.

Permanece la observación heredada de preload de fuentes en desarrollo, clasificada como P3 no bloqueante.

## 13. Recomendación final

**GO WITH CONDITIONS**

La regresión confirma que QA-001, QA-002 y QA-003 están resueltos. La entrega puede avanzar hacia revisión de PR condicionada a:

1. ejecutar una prueba real de acción asistida por IA;
2. ejecutar una prueba directa de aislamiento RLS entre dos usuarios;
3. resolver o aceptar explícitamente la advertencia P3 de preload de fuentes.
