/*
 * Ajusta weekly_reviews al ciclo actual.
 *
 * - total_actions: 20261023000000_variable_ceo_actions permitió planes de
 *   1 a 5 acciones, pero la revisión seguía exigiendo exactamente 7, así que
 *   ninguna semana actual podía cerrarse. Se aceptan 1 a 7 para conservar
 *   las revisiones históricas de 7 acciones.
 * - outcome_summary: la Server Action guarda el resultado observado, que Zod
 *   y el formulario permiten hasta 2000 caracteres.
 *
 * Ambas restricciones se relajan: todas las filas existentes siguen siendo válidas.
 */

alter table public.weekly_reviews
  drop constraint if exists weekly_reviews_total_actions_check,
  drop constraint if exists weekly_reviews_outcome_summary_check;

alter table public.weekly_reviews
  add constraint weekly_reviews_total_actions_check
    check (total_actions between 1 and 7),
  add constraint weekly_reviews_outcome_summary_check
    check (char_length(outcome_summary) between 5 and 2000);
