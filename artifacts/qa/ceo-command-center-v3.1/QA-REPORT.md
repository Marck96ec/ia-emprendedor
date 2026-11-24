# Reporte QA E2E — CEO Command Center v3.1

**Fecha:** 2026-11-24  
**Rama:** `feature/ceo-command-center-v3`  
**Aplicación:** `http://localhost:3000`  
**Supabase:** local (`127.0.0.1`)  
**Mailpit:** `http://127.0.0.1:54324`  
**Estado recomendado:** **NO GO**

## 1. Resumen ejecutivo

Se ejecutó un flujo real de navegador con una cuenta QA nueva, utilizando el formulario de registro, Mailpit, el enlace real de confirmación, login, onboarding, generación de plan, dashboard, drawer de decisión, drawer de ADN, ejecución manual y persistencia.

El producto permite llegar desde una cuenta nueva hasta una acción completada y conserva el resultado después de recargar, cerrar sesión e iniciar sesión nuevamente. La decisión estratégica generada fue coherente con el escenario de ventas regulares y tensión de caja, y no inventó costos, margen ni flujo de caja.

La entrega no se aprueba todavía porque el workspace principal de acciones queda colapsado en 1280 × 720 y 1366 × 768, dos resoluciones objetivo explícitas. A 1440 × 900 solo queda una franja mínima del workspace. Esto impide ejecutar cómodamente el flujo principal desde el centro de dirección.

| Métrica | Resultado |
|---|---:|
| Validaciones totales | 22 |
| Pruebas PASS | 16 |
| Pruebas FAIL | 4 |
| Pruebas BLOCKED | 0 |
| Pruebas NOT RUN | 2 |
| Defectos P1 | 1 |
| Defectos P2 | 2 |
| Observaciones P3 | 1 |

## 2. Datos QA utilizados

Se creó una cuenta nueva mediante el formulario real de registro. No se utilizó SQL, Supabase Admin API ni una cuenta real.

Negocio registrado:

- Café Horizonte QA.
- Cafetería con productos de panadería.
- 4 personas.
- 12 horas semanales del propietario.
- Facturación mensual: USD 8.500.
- Ventas regulares con dificultad para cubrir obligaciones.
- Clientes de oficinas cercanas, residentes y recurrentes.
- Ventas directas y pedidos por WhatsApp.
- Propietario concentrando decisiones comerciales y financieras.

El onboarding actual no permite capturar costos mensuales, efectivo disponible ni obligaciones futuras. Esas limitaciones quedaron visibles en el dashboard como información faltante y no se introdujeron por fuera de la interfaz.

## 3. Resultados funcionales

| ID | Funcionalidad | Esperado | Resultado | Estado | Evidencia |
|---|---|---|---|---|---|
| E2E-01 | Landing | Carga y CTA de registro funcional | La landing cargó y “Crear cuenta” dirigió a `/signup` | PASS | Captura de landing en la sesión |
| E2E-02 | Registro | Cuenta creada y confirmación comprensible | Se mostró “¡Ya casi estás listo!” con instrucciones en español | PASS | Captura de confirmación de registro |
| E2E-03 | Recepción de correo | Mailpit recibe el mensaje correcto | Correo recibido con destinatario QA, asunto y remitente visibles | PASS | Captura de inbox Mailpit |
| E2E-04 | Confirmación | Enlace real confirma la cuenta | El enlace local redirigió a login y la cuenta pudo autenticarse | PASS | Captura del correo y login posterior |
| E2E-05 | Login | Usuario confirmado accede al flujo | Login redirigió a onboarding empresarial | PASS | Navegación real |
| E2E-06 | Onboarding empresarial | Datos guardados mediante UI | Se completaron las 3 preguntas y se persistió el negocio | PASS | Captura del resumen de onboarding |
| E2E-07 | Diagnóstico | Diagnóstico completo sin acceso prematuro | Se completaron las 10 preguntas y se preparó el diagnóstico | PASS | Captura del resumen de diagnóstico |
| E2E-08 | Generación CEO | Plan generado con contexto real | Plan generado; decisión centrada en caja/rentabilidad antes de vender más | PASS | Captura del dashboard generado |
| E2E-09 | Evaluación empresarial | Estados conservadores y faltantes visibles | Nivel 02 provisional/indeterminado inicialmente; sin scores ni datos inventados | PASS con observación QA-003 | Captura dashboard |
| E2E-10 | Decisión | Drawer explica decisión y evidencias | Drawer mostró diagnóstico, cuello de botella, confianza e información faltante | PASS | Captura/inspección del drawer |
| E2E-11 | ADN Empresarial | Seis dimensiones y detalle accesible | Las seis dimensiones aparecieron; el drawer mostró reglas y faltantes | PASS | Captura del drawer de Mercado |
| E2E-12 | Acción manual | Registrar y confirmar resultado desde UI | Se registró mapa de caja con efectivo, cobros y obligación QA; acción completada | PASS | Dashboard posterior a la acción |
| E2E-13 | Persistencia | Resultado y progreso sobreviven recarga/login | Persistieron “1 de 3 acciones completadas” y “Resultado registrado” | PASS | Recarga y nuevo login |
| E2E-14 | Protección de ruta | Dashboard requiere autenticación | Logout y navegación directa a `/dashboard` redirigieron a `/login` | PASS | Navegación real |
| E2E-15 | Errores runtime | Sin errores críticos de consola o página | Tras recargar dashboard no hubo errores de consola, page errors ni requests fallidas | PASS | Instrumentación Playwright |
| E2E-16 | Acción asistida por IA | Probar generación y aprobación IA | El plan generado solo contenía acciones manuales | NOT RUN | No había acción `ai_assisted` disponible |
| E2E-17 | Aislamiento entre dos usuarios | Verificar acceso cruzado por navegador | No se creó una segunda cuenta QA en esta ejecución | NOT RUN | Requiere una segunda ejecución controlada |

## 4. Evaluación del motor empresarial

Resultado observado antes de completar una acción:

- Nivel: 02 — Supervivencia.
- Clasificación: indeterminada.
- Confianza: baja.
- Salud: sin evaluar.
- Mercado: sin evaluar.
- Finanzas: sin evaluar.
- Liquidez: sin evaluar.
- Operaciones: sin evaluar.
- Autonomía: sin evaluar.
- Crecimiento: sin evaluar.

Después de completar la acción manual:

- Nivel permaneció en 02.
- La clasificación pasó a provisional.
- La confianza pasó a media.
- Operaciones pasó a favorable.
- El progreso semanal pasó a 1 de 3.
- No se produjo un aumento automático de madurez.

Esto es coherente con el principio de separar ejecución, capacidades y evolución. La falta de costos, margen, efectivo y obligaciones futuras quedó visible en la decisión y en el ADN Empresarial.

## 5. Validación responsive

Se midieron `innerWidth`, `innerHeight`, `scrollHeight`, `scrollWidth` y la altura real de `#tablero-semanal`.

| Resolución | Scroll vertical de documento | Scroll horizontal | Altura tablero | Estado |
|---|---:|---:|---:|---|
| 1280 × 720 | 720 | 1280 | 0 px | FAIL — QA-001 |
| 1366 × 768 | 768 | 1366 | 0 px | FAIL — QA-001 |
| 1440 × 900 | 900 | 1440 | 68,5 px | FAIL — QA-001 |
| 1920 × 1080 | 1080 | 1920 | 196 px | PASS parcial |
| 390 × 844 | 3263 | 375 | 908 px | FAIL — QA-002 |

En escritorio el documento mantiene la altura del viewport porque el shell utiliza overflow controlado. No hubo overflow horizontal. En móvil el scroll natural funciona y no hubo overflow horizontal.

Capturas guardadas fuera del repositorio:

```text
C:\Users\clavi\.copilot\session-state\92705b53-9769-4e40-a10b-2cb54ef2d5df\files\qa\ceo-command-center-v3.1\10-dashboard-1920x1080.png
C:\Users\clavi\.copilot\session-state\92705b53-9769-4e40-a10b-2cb54ef2d5df\files\qa\ceo-command-center-v3.1\11-dashboard-1366x768.png
C:\Users\clavi\.copilot\session-state\92705b53-9769-4e40-a10b-2cb54ef2d5df\files\qa\ceo-command-center-v3.1\12-dashboard-mobile-390x844.png
```

También se capturaron en la sesión las vistas de registro, confirmación, inbox Mailpit, correo de confirmación, drawer de ADN y dashboard de 1280 × 720 y 1440 × 900.

## 6. Defectos

### QA-001 — P1 — Workspace de acciones colapsado en escritorio

**Componente relacionado:** composición de [`src/app/dashboard/page.tsx`](../../src/app/dashboard/page.tsx) y [`src/components/weekly-action-board.tsx`](../../src/components/weekly-action-board.tsx).

**Pasos de reproducción:**

1. Iniciar sesión con un negocio que tenga un plan activo.
2. Abrir el dashboard en 1280 × 720 o 1366 × 768.
3. Observar la parte inferior de la columna de dirección estratégica.
4. Repetir en 1440 × 900.

**Esperado:** el tablero de acciones y el detalle de la acción actual deben permanecer accesibles mediante una distribución compacta o un scroll interno controlado.

**Obtenido:**

- 1280 × 720: `#tablero-semanal` mide 0 px.
- 1366 × 768: `#tablero-semanal` mide 0 px.
- 1440 × 900: el tablero mide 68,5 px; se ve el encabezado y la acción primaria, pero el detalle queda prácticamente oculto.
- El documento no puede desplazarse porque el shell mantiene `scrollHeight === innerHeight`.

La CTA “Empezar esta acción” no proporciona una ruta cómoda al detalle manual en estas resoluciones. El flujo puede abrir el diálogo de resultado desde el área sticky, pero la información contextual de la acción queda fuera de la vista.

**Posible causa, no confirmada:** la nueva columna derecha consume la altura disponible con decisión, objetivo, progreso y tiempo antes de que el hijo con `cockpit:flex-1` reciba espacio. La combinación de grid/flex y `min-height` debería revisarse.

### QA-002 — P2 — Orden de prioridad móvil contrario al objetivo UX

**Componente relacionado:** composición de [`src/app/dashboard/page.tsx`](../../src/app/dashboard/page.tsx).

**Pasos de reproducción:**

1. Abrir el dashboard en 390 × 844.
2. Observar el primer viewport.

**Esperado:** la decisión del CEO y la acción actual deben aparecer antes de la información secundaria de empresa.

**Obtenido:** el primer viewport muestra “Mi empresa”, evolución y el inicio del ADN Empresarial. La decisión y la acción aparecen mucho más abajo, después del contenido de la columna izquierda.

El scroll móvil funciona, por lo que no bloquea técnicamente el flujo, pero reduce la claridad de la prioridad estratégica.

### QA-003 — P2 — Nivel visible junto a clasificación indeterminada

**Componente relacionado:** [`src/components/business-evolution-card.tsx`](../../src/components/business-evolution-card.tsx) y [`src/lib/business-assessment.ts`](../../src/lib/business-assessment.ts).

**Pasos de reproducción:**

1. Crear un negocio estable sin evidencia operativa todavía registrada.
2. Abrir el dashboard después de generar el primer plan.

**Esperado:** el estado indeterminado debe comunicar claramente que todavía no existe una evaluación suficiente.

**Obtenido:** se muestra “Nivel 02 · Supervivencia” junto a “Evaluación indeterminada”. Aunque no se inventan porcentajes ni se asigna nivel 1, la combinación puede interpretarse como una clasificación empresarial establecida.

### QA-004 — P3 — Advertencias de preload de fuentes en desarrollo

Durante navegación y login aparecieron advertencias no bloqueantes indicando que dos fuentes precargadas no fueron utilizadas inmediatamente. No hubo `pageerror` ni errores de consola después de recargar el dashboard.

## 7. Seguridad observada

- Supabase utiliza host local `127.0.0.1`.
- No se desactivó la confirmación de correo.
- El enlace de confirmación se usó desde Mailpit.
- No se expusieron tokens en capturas ni en este reporte.
- Logout redirigió a login.
- La navegación directa a `/dashboard` sin sesión redirigió a `/login`.
- No se ejecutó una prueba de aislamiento entre dos usuarios.

## 8. Validaciones técnicas

Las validaciones automatizadas ya ejecutadas durante la implementación fueron:

```text
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

Resultado: correctas. La suite reportó 162 pruebas aprobadas, 3 omitidas y 0 fallos.

## 9. Recomendación

**NO GO** para aprobar la entrega visual completa.

El registro, confirmación, onboarding, generación, evaluación conservadora, ejecución manual y persistencia funcionan. Antes de continuar hacia PR se debe corregir QA-001, porque afecta una capacidad principal en 1280 × 720 y 1366 × 768. QA-002 y QA-003 deben resolverse o aceptarse explícitamente como condiciones de producto antes de cerrar la entrega.
