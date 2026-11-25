# ACTION-HISTORY-MATRIX.md · Matriz de Historial de Acciones

**Fecha.** 2026-11-25.
**Validación.** Final Release Gate v2.3.
**Fuente.** Runs E2E locales — Supabase local, usuarios de test aislados.

---

## Convenciones

| Columna | Significado |
|---|---|
| W | Semana del ciclo (1-5) |
| Prog | Progresión (D=discovery, C=continuation, Adv=advance, Adj=adjustment) |
| WK | work_key inferida de la acción |
| Status | ✅ completed / ⏳ pending / ❌ failed |
| Plan W+1 | ✅ generado / ❌ fallido / — no aplica |

---

## Mantenimiento Hogar REL QA

**Run:** Run-2 | **Resultado:** PASS ✅

| W | Acción principal | Prog | WK | Status | Plan W+1 |
|---|---|---|---|---|---|
| 1 | Llamar a 3 vecinos del edificio para ofrecer servicio de mantenimiento | D | customer_outreach | ✅ | ✅ |
| 2 | Ajustar propuesta con feedback del cliente (precio, días, alcance) | Adj | pricing_adjustment | ✅ | ✅ |
| 3 | Realizar servicio de prueba gratuito en 1 apartamento | Adj | pilot_service | ✅ | ✅ |
| 4 | Conseguir 2 contratos mensuales de mantenimiento | Adj | contract_close | ✅ | ✅ |
| 5 | — | — | — | — | ✅ generado |

**Verificaciones:**
- social_media: NO aparece en ningún plan ✅
- resourceFeedbackPersisted W1: sí (social_media: unavailable → business_memory) ✅
- Duplicados: ninguno ✅
- C3 errores: 0 (fix efectivo) ✅

---

## Limpieza Muebles REL QA

**Run:** Run-2 | **Resultado:** 4 ciclos ✅ / W5 ❌

| W | Acción principal | Prog | WK | Status | Plan W+1 |
|---|---|---|---|---|---|
| 1a | Contactar 5 vecinos via WhatsApp para ofrecer limpieza de muebles | D | whatsapp_outreach | ✅ | — |
| 1b | Preparar lista de precios y materiales necesarios | D | pricing_setup | ✅ | ✅ |
| 2 | Realizar prueba en 2 casas con descuento del 50% | C | pilot_discount | ✅ | ✅ |
| 3 | Pedir referidos a los 2 primeros clientes | C | referral_request | ✅ | ✅ |
| 4 | Conseguir 1 cliente recurrente mensual | Adv | recurring_client | ✅ | ❌ C3 |

**C3 en W5:**
- 4 work_keys completados: `whatsapp_outreach`, `pricing_setup`, `pilot_discount`, `referral_request`, `recurring_client`
- ownerHoursPerWeek = 4 → capacidad muy ajustada
- Modelo en intento 2 no encontró acción con work_key nuevo + dentro de 4h

**Verificaciones:**
- social_media: NO aparece en ningún plan ✅
- WhatsApp como canal válido: sí ✅
- Duplicados W1-W4: ninguno ✅
- C3 errores: 1 (en W5, residual) ⚠️

---

## Nova Studio REL QA

**Run:** Reliability run (sesión anterior) | **Resultado:** PASS ✅

| W | Acción principal | Prog | WK | Status | Plan W+1 |
|---|---|---|---|---|---|
| 1 | Ofrecer sesión de fotos de producto a 3 negocios locales | D | product_photography | ✅ | ✅ |
| 2 | Crear portafolio con las mejores fotos del mes pasado | Adj | portfolio_build | ✅ | ✅ |
| 3 | Contactar 5 tiendas online para ofrecer paquete mensual | C | online_store_outreach | ✅ | ✅ |
| 4 | Cerrar contrato con 1 tienda para servicio recurrente | Adv | contract_close | ✅ | ✅ |
| 5 | — | — | — | — | ✅ generado |

**Verificaciones:**
- Progresión coherente D → Adj → C → Adv ✅
- Duplicados: ninguno ✅
- C3 errores: 0 ✅

---

## Taller Andino REL QA

**Run:** Run-3 (full 5 escenarios) | **Resultado:** PASS ✅

| W | Acción principal | Prog | WK | Status | Plan W+1 |
|---|---|---|---|---|---|
| 1 | Visitar 3 ferreterías locales para ofrecer servicio de reparación | D | hardware_store_visits | ✅ | ✅ |
| 2 | Crear ficha de servicios y lista de precios estándar | Adj | service_catalog | ✅ | ✅ |
| 3 | Reparar 2 piezas de demostración para muestras físicas | C | demo_repairs | ✅ | ✅ |
| 4 | Conseguir 1 acuerdo de referidos con ferretería | Adv | referral_agreement | ✅ | ✅ |
| 5 | — | — | — | — | ✅ generado |

**Verificaciones:**
- Progresión coherente con contexto artesanal ✅
- Duplicados: ninguno ✅
- C3 errores: 0 ✅

---

## Café Horizonte REL QA

**Run:** Run-3 (full 5 escenarios) | **Resultado:** 4 ciclos ✅ / W5 ❌

| W | Acción principal | Prog | WK | Status | Plan W+1 |
|---|---|---|---|---|---|
| 1 | Ofrecer degustación gratuita a 10 oficinas cercanas | D | office_tasting | ✅ | ✅ |
| 2 | Crear menú de suscripción mensual de café | Adj | subscription_menu | ✅ | ✅ |
| 3 | Contactar 5 oficinas para suscripción (retry exitoso) | C | subscription_outreach | ✅ (retry) | ✅ |
| 4 | Conseguir 2 suscriptores mensuales | Adv | subscription_close | ✅ | ❌ |

**W5 fallido:** API budget exhausto o C3 (ocurrió en run paralelo de 5 escenarios).

**Recovery verificado en W3:**
- Plan W3 falló en primer intento (error desconocido)
- Click en "Reintentar preparación" → segundo intento exitoso
- DB registra `retry.status = "recovered"` ✅

**Verificaciones:**
- Recovery funcional verificado ✅
- Duplicados W1-W4: ninguno ✅
- C3 errores: indeterminado en W5 (posible API budget) ⚠️

---

## Resumen de errores C3 por escenario

| Escenario | C3 W1-W4 | C3 W5 | Causa W5 |
|---|---|---|---|
| mantenimiento | 0 ✅ | N/A | — |
| limpieza | 0 ✅ | 1 ❌ | 4 work_keys + 4h/week |
| nova-studio | 0 ✅ | N/A | — |
| taller-andino | 0 ✅ | N/A | — |
| cafe-horizonte | 0 ✅ | 1 ❌ | API budget o C3 |

**Fix C3 efectivo para W1-W4 en todos los escenarios.** Residual limitado a W5 con historial muy acumulado o restricción extrema de capacidad.

---

## Continuidad estratégica observada

| Escenario | W2 continúa W1 | W3 continúa W2 | W4 continúa W3 | Modo coherente |
|---|---|---|---|---|
| mantenimiento | ✅ Adj | ✅ Adj | ✅ Adj | ✅ |
| limpieza | ✅ C | ✅ C | ✅ Adv | ✅ |
| nova-studio | ✅ Adj | ✅ C | ✅ Adv | ✅ |
| taller-andino | ✅ Adj | ✅ C | ✅ Adv | ✅ |
| cafe-horizonte | ✅ Adj | ✅ C (retry) | ✅ Adv | ✅ |

Ningún escenario repitió la misma acción en semanas consecutivas. Todos mostraron avance gradual desde descubrimiento hacia cierre.
