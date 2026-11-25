# Validación de factibilidad

| Estado | Comportamiento |
|---|---|
| `feasible` | Recursos necesarios disponibles. |
| `unknown` | El negocio puede avanzar mientras confirma un recurso. El tablero indica qué falta confirmar. |
| `requires_prerequisite` | La referencia histórica debe estar completada. Una dependencia de la semana actual debe apuntar a una secuencia anterior. Su ejecución queda bloqueada hasta completar el paso anterior. |
| `blocked` | Se rechazará un canal, responsable u otro recurso declarado ausente. Se pide reparar el plan con un paso previo o una alternativa. |

El modelo declara requisitos. El validador añade controles para instrucciones de publicación o contacto explícitas y para una recomendación de delegar. Una cuenta inexistente no se infiere por falta de datos y una cuenta existente no se infiere por publicidad en internet.

La relación dentro del plan queda en el contrato persistido. El centro y la ruta directa presentan el bloqueo. La generación asistida vuelve a verificar estado y disponibilidad. El disparador de PostgreSQL impide que se complete una acción dependiente demasiado pronto mediante la RPC de evidencia. La segunda vuelta del agente puede simplificar el plan si una composición falla.

El sistema aún no ejecuta actividad externa ni programa la creación de cuentas. Las dependencias del mismo plan resuelven orden y habilitan las pruebas que reutilizan una propuesta generada en ese plan. Una limitación de canal vigente requiere confirmación explícita del propietario o una alternativa.
