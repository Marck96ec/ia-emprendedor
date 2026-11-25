# SECURITY-REPORT.md · Informe de Seguridad

**Fecha.** 2026-11-25.
**Validación.** Final Release Gate v2.3.

---

## Estado: Security GO ✅

Los cuatro tests de integración skipped en la validación anterior ahora se ejecutan y pasan.

---

## Tests de integración ejecutados (SUPABASE_LOCAL_TESTS=1)

| Test | Resultado | Duración |
|---|---|---|
| La evidencia de acciones se valida en Supabase y la tabla no admite escrituras directas | ✅ PASS | 8.5s |
| El validador de PostgreSQL coincide con el de TypeScript en los fixtures compartidos | ✅ PASS | 4.2s |
| Supabase local conserva memoria antigua, registra cambios y aísla a dos propietarios | ✅ PASS | 8.2s |
| CEO plan RPC en Supabase local protege propietarios, estados y atomicidad | ✅ PASS | 9.2s |

**Total: 184/184 tests PASS, 0 skipped, 0 fail.**

---

## Cobertura de cada criterio de seguridad

### 1. Validación de evidencia y protección contra escrituras directas

**Test:** "La evidencia de acciones se valida en Supabase y la tabla no admite escrituras directas"

Verificado:
- La tabla `action_completions` rechaza escrituras directas desde el cliente autenticado.
- El RPC `complete_weekly_action` valida el `capture_schema` contra el contrato de acción.
- Las rutas de error devuelven el código y detalle esperado.

### 2. Paridad entre validadores PostgreSQL y TypeScript

**Test:** "El validador de PostgreSQL coincide con el de TypeScript en los fixtures compartidos"

Verificado:
- Los mismos fixtures que pasan la validación TypeScript pasan la validación RPC de PostgreSQL.
- Los mismos fixtures que fallan TypeScript fallan el RPC con el mismo `issue_path`.

### 3. Memoria histórica y aislamiento entre propietarios

**Test:** "Supabase local conserva memoria antigua, registra cambios y aísla a dos propietarios"

Verificado:
- `record_business_memory` es idempotente (misma clave, mismo contenido → mismo ID).
- `business_memory_as_of` devuelve el snapshot correcto para fechas pasadas (semanas 5 y 8).
- La restricción `social_media: unavailable` persiste en contextos históricos.
- Las memorias de un propietario no son visibles para otro (aislamiento RLS).
- La actualización de una memoria cambia el ID y el contenido correctamente.

### 4. Protección de propietarios, estados y atomicidad de CEO Plan RPC

**Test:** "CEO plan RPC en Supabase local protege propietarios, estados y atomicidad"

Verificado:
- `save_ceo_plan` rechaza planes para negocios de otro propietario (error de RLS).
- `save_ceo_plan` rechaza planes con estado distinto a `generating`.
- La operación es atómica: si falla la inserción de acciones, el plan no queda en estado `ready`.
- Duplicados de plan (misma semana, mismo negocio) son rechazados por constraint de DB.

---

## Verificaciones adicionales de E2E

- **Aislamiento en E2E**: cada escenario crea un usuario diferente; no hubo contaminación entre escenarios.
- **RLS activo**: los clientes de test solo ven sus propios negocios, planes y acciones.
- **Memoria persistida correctamente**: `business_memory` registra restricciones y aprendizajes del propietario correcto.
- **Feedback de recursos en W1**: mantenimiento guardó `social_media: unavailable` en `business_memory` al completar la revisión de semana 1.

---

## Conclusión

**Security GO: MET ✅**

Los cuatro criterios de seguridad están cubiertos con tests de integración ejecutados contra Supabase local. No se encontraron vulnerabilidades de acceso cruzado, escritura directa, ni inconsistencias entre los validadores.
