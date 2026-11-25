# Especificación UX/UI del dashboard

## 1. Propósito

Esta especificación define la experiencia visible del **CEO Command Center v3.1**. Es una especificación de diseño y comportamiento, no una autorización para crear datos simulados ni para cambiar el esquema actual.

El dashboard debe comunicar:

```text
Comprende → Decide → Ejecuta → Evoluciona
```

La interfaz presenta una dirección estratégica contextualizada. La acción semanal es un mecanismo de ejecución y aprendizaje, no una medida directa de madurez o salud.

## 2. Principios de diseño

1. **Decisión antes que inventario.** La decisión recomendada y el movimiento actual deben dominar la primera lectura.
2. **Una acción primaria.** Cada estado de la pantalla tiene una única CTA principal.
3. **Evidencia antes que puntuación.** No mostrar porcentajes o scores sin metodología validada.
4. **Desconocido visible.** “Sin evaluar” es un estado útil, no un fallo que se deba ocultar.
5. **Progresión explicable.** Cada nivel, estado o hito debe incluir fuente, vigencia y condiciones.
6. **Divulgación progresiva.** El dashboard muestra lo esencial; drawers contienen diagnóstico, riesgos, alternativas y evidencia.
7. **Accesibilidad primero.** El objetivo de no hacer scroll no justifica tipografía ilegible ni pérdida de información.
8. **Datos reales únicamente.** Un estado vacío debe explicar el próximo paso en lugar de rellenarse con mocks.

## 3. Wireframe de escritorio

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ TuCEO IA · Centro de dirección · Negocio · Semana 04       Mi empresa · … │
├───────────────────────────────┬────────────────────────────────────────────┤
│ MI EMPRESA                     │ DIRECCIÓN ESTRATÉGICA                      │
│                               │                                            │
│ EVOLUCIÓN EMPRESARIAL         │ DECISIÓN DE TU CEO IA                      │
│ Nivel 03 · Estabilidad        │ Protejamos tu efectivo antes de crecer.    │
│ Salud: requiere atención      │ Justificación breve y contextual.          │
│ Evaluación provisional         │ Resultado que buscamos: ...                │
│ Confianza media                │ [Entender decisión]                        │
│       ◌ ◉ ◉ ◌ ◌              │                                            │
│ [Ver detalle de evolución]    │ MISIÓN / OBJETIVO ESTRATÉGICO               │
│                               │ Control financiero · 3 de 7 acciones       │
│ ADN EMPRESARIAL               │ ● ● ◐ ○ ○ ○ ○                              │
│ ┌──────────────┬────────────┐ │                                            │
│ │ Mercado      │ Finanzas   │ │ TU SIGUIENTE MOVIMIENTO                    │
│ │ Favorable    │ Favorable  │ │ Identifica tus próximos compromisos.       │
│ ├──────────────┼────────────┤ │ │ Asistido por IA · objetivo relacionado    │
│ │ Liquidez     │ Operación  │ │ [Comenzar acción]                          │
│ │ Crítica      │ Favorable  │ │                                            │
│ ├──────────────┼────────────┤ │ └──────────────────────────────────────────┘
│ │ Autonomía    │ Crecimiento│ │
│ │ Frágil       │ Sin evaluar│ │
│ └──────────────┴────────────┘ │
│                               │
│ PRÓXIMO HITO EMPRESARIAL      │
│ Control de liquidez           │
│ 2 de 4 condiciones verificadas│
└───────────────────────────────┴────────────────────────────────────────────┘
```

### Reglas de composición

- La columna izquierda ocupa aproximadamente 35% y la derecha 65%.
- Ambas columnas usan `minmax(0, ...)` y pueden reducirse sin overflow horizontal.
- No existe una tercera columna permanente.
- El bloque de decisión usa azul ejecutivo profundo.
- El bloque de acción tiene una sola CTA primaria.
- El detalle de cada dimensión se abre fuera del flujo principal.
- En una altura corta se reduce decoración y copy secundario, nunca la decisión ni el CTA.

## 4. Wireframe móvil

```text
┌──────────────────────────────┐
│ Centro de dirección      ⋯   │
│ Nombre del negocio           │
├──────────────────────────────┤
│ DECISIÓN DE TU CEO IA        │
│ Recomendación                │
│ Resultado esperado           │
│ [Entender decisión]          │
├──────────────────────────────┤
│ TU SIGUIENTE MOVIMIENTO      │
│ Título concreto              │
│ Descripción breve            │
│ [Comenzar acción]            │
├──────────────────────────────┤
│ MISIÓN / PLAN DE ACCIÓN      │
│ ● ● ◐ ○ ○ ○ ○                │
│ Ver plan completo            │
├──────────────────────────────┤
│ MI EMPRESA                   │
│ Evolución · ADN · Hito       │
│ [Ver detalle]                │
└──────────────────────────────┘
```

La lista completa de acciones puede conservar el patrón actual de pestañas entre “Plan semanal” y “Acción actual”. La acción actual debe ser accesible sin recorrer primero toda la lista.

## 5. Componentes y comportamiento

### 5.1 Evolución empresarial

**Contenido principal**

- número de nivel;
- nombre de etapa;
- salud;
- estado de evaluación;
- confianza, si el motor la entrega;
- indicador circular segmentado de cinco etapas;
- enlace accesible al detalle.

**Reglas**

- Las etapas anteriores no se marcan automáticamente como logros certificados.
- No se muestra porcentaje de avance.
- No se asigna nivel 1 por falta de información.
- Una evaluación indeterminada muestra “Sin evaluar” o “Estamos comprendiendo tu empresa”.
- El indicador debe tener texto equivalente para lectores de pantalla.

### 5.2 ADN Empresarial

Seis dimensiones con el mismo peso visual:

```text
Mercado · Finanzas · Liquidez
Operaciones · Autonomía · Crecimiento
```

Cada tarjeta contiene icono consistente, nombre, estado cualitativo, indicador semántico y control para abrir detalle. No se usa radar cuantitativo ni puntuación de 0 a 100.

El drawer de una dimensión debe incluir:

- significado del estado;
- evidencias disponibles y fuente;
- información faltante;
- riesgos;
- condiciones evaluadas;
- fecha de última evaluación;
- capacidades que podrían fortalecerse.

### 5.3 Decisión de tu CEO IA

**Contenido**

- identificación “Decisión de tu CEO IA”;
- recomendación específica;
- justificación breve;
- resultado empresarial esperado;
- enlace “¿Por qué esta decisión?”;
- nivel de certeza humano: exploratoria, media o alta, si existe.

**Drawer**

El drawer existente es el patrón preferido. Debe mostrar progresivamente:

1. problema prioritario;
2. evidencias utilizadas;
3. hipótesis;
4. riesgos;
5. alternativas consideradas;
6. información pendiente;
7. resultado esperado.

La decisión sigue siendo recomendación; el propietario conserva el control.

### 5.4 Misión u objetivo estratégico

Si existe una entidad `Strategic Mission`, mostrar:

- nombre y número de misión;
- objetivo;
- relación con los planes semanales;
- secuencia de acciones;
- estados de acción.

Si no existe, mostrar el objetivo estratégico del plan actual con una etiqueta temporal y documentar la limitación. No crear IDs de misión en el cliente.

Los estados de la secuencia son:

- completada;
- actual;
- pendiente;
- en ejecución;
- requiere revisión;
- bloqueada.

El estado completado de una acción no equivale a resultado empresarial verificado.

### 5.5 Tu siguiente movimiento

La tarjeta debe derivar su CTA del estado real:

| Estado | CTA |
|---|---|
| Disponible | Comenzar acción |
| Iniciada | Continuar acción |
| Entregable generado | Revisar resultado |
| Aprobación pendiente | Confirmar resultado |
| Completada | Ver resultado |
| Bloqueada | Ver qué falta |
| Error recuperable | Reintentar |

Debe conservar compatibilidad con `execution_mode: manual` y `execution_mode: ai_assisted`, además de los `action_type` existentes. El tiempo estimado se muestra únicamente cuando el contrato lo proporciona.

### 5.6 Próximo hito empresarial

Solo se muestra como hito cuando existe:

- catálogo de hito;
- condiciones definidas;
- evidencias que permitan verificar cada condición;
- estado de evaluación y fecha.

Formato permitido:

```text
Control de liquidez
2 de 4 condiciones verificadas
```

No se muestran puntos de experiencia ni se celebra únicamente iniciar sesión, pasar tiempo o completar una tarea.

## 6. Estados de interacción

### Carga y recuperación

- La carga del dashboard conserva una estructura estable para evitar saltos.
- Los datos ausentes se explican con un estado vacío específico.
- Un error de Supabase se muestra como error explícito y se registra según el patrón actual; no se sustituye por datos simulados.

### Drawers

- usar `<dialog>` modal o el patrón equivalente existente;
- cerrar con Escape, botón visible y click en backdrop;
- mover el foco al drawer al abrir y devolverlo al control que lo abrió al cerrar;
- proporcionar título accesible y `aria-labelledby`;
- permitir scroll interno solo para detalle secundario.

### Animación

- mantener transiciones discretas;
- respetar `prefers-reduced-motion`;
- no usar animación para comunicar un cambio de nivel que el motor no haya confirmado.

## 7. Accesibilidad

- Todo estado usa texto más un recurso no cromático.
- Los cinco segmentos del nivel tienen nombre accesible.
- La secuencia de siete acciones no depende solo de círculos de color.
- El progreso de ejecución usa valores reales de acciones, no porcentaje empresarial.
- Los botones tienen foco visible y área táctil mínima de 44 px.
- La única CTA primaria se identifica por posición y etiqueta, no solo por color.
- Los drawers anuncian su título y estado.
- El orden de foco sigue decisión → acción → detalles.
- En móvil, el menú y la navegación de historial no desplazan la acción principal fuera de la primera pantalla innecesariamente.

## 8. Responsive y viewport

| Resolución | Comportamiento esperado |
|---|---|
| 1280 × 720 | Composición compacta; decisión, CTA y resumen de evolución visibles; detalle secundario en drawer |
| 1366 × 768 | Dos columnas estables sin overflow; misión y ADN legibles |
| 1440 × 900 | Más espacio para contexto y condiciones, sin añadir una tercera columna |
| 1920 × 1080 | Limitar ancho de lectura; no estirar tarjetas ni párrafos indefinidamente |
| móvil | Scroll natural; decisión y acción antes de información secundaria |

La validación debe usar datos reales representativos de cada estado, incluidos textos largos.

## 9. Métricas que no se deben confundir

| Escala | Qué representa | Frecuencia | Visualización |
|---|---|---|---|
| Ejecución | Acciones realizadas | Diaria/semanal | Secuencia del plan |
| Capacidades | Hitos respaldados por evidencia | Semanal/mensual | Condiciones verificadas |
| Evolución | Cambio estructural del negocio | Medio/largo plazo | Cinco niveles |

No existe una relación automática entre las tres escalas.

