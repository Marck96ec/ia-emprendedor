/*
 * Una revisión semanal representa el cierre histórico
 * de una semana.
 *
 * Una vez creada no puede modificarse.
 */

revoke update
on table public.weekly_reviews
from authenticated;


drop policy if exists
  "Users can update their own weekly reviews"
on public.weekly_reviews;